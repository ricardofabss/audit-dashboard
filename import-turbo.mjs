/**
 * import-turbo.mjs
 * 
 * TURBO version: Uses createMany (batch insert) instead of individual upserts.
 * For 257K events: ~258 DB calls instead of 257,000 DB calls.
 * Expected time: ~3-5 minutes instead of 1+ hour.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prismaUrl =
  process.env.ETL_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = prismaUrl
  ? new PrismaClient({ datasources: { db: { url: prismaUrl } } })
  : new PrismaClient();

const DATA_DIR =
  process.env.GADAI_MAS_DATA_DIR ||
  "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Gadai MAS";

// ─── Helpers ────────────────────────────────────────────────────────
function asDateOnly(iso) { return new Date(`${iso}T12:00:00.000Z`); }
function safeDate(v) { return v ? asDateOnly(v) : null; }
function safeDateTime(v) { return v ? new Date(v) : null; }
function decimalOrNull(v) { return v != null ? new Prisma.Decimal(v.toString()) : null; }
function addDecimal(cur, v) {
  if (v == null) return cur;
  return cur.plus(new Prisma.Decimal(v.toString()));
}

// ─── Step 1: Extract (reuse cached JSON if available) ───────────────
function extractAll() {
  // Check for cached extraction from previous run
  const cacheFile = path.join(__dirname, "_cached_extract.json");
  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
    if (ageMinutes < 60) {
      console.log(`[TURBO] Using cached extraction (${ageMinutes.toFixed(0)}m old)...`);
      const data = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      return data.events || [];
    }
  }

  const extractorPath = path.join(__dirname, "scripts", "etl", "extract_all_gadai_mas.py");
  const outputFile = path.join(os.tmpdir(), `gadai_turbo_${Date.now()}.json`);

  console.log("[TURBO] Extracting ALL events from Excel...");
  const result = spawnSync(
    "python",
    [extractorPath, "--data-dir", DATA_DIR, "--output", outputFile],
    { encoding: "utf8", stdio: "inherit", timeout: 600_000 }
  );
  if (result.status !== 0) throw new Error(`Extractor failed with code ${result.status}`);

  const raw = fs.readFileSync(outputFile, "utf8");
  fs.rmSync(outputFile, { force: true });
  
  // Cache for re-runs
  fs.writeFileSync(cacheFile, raw, "utf8");
  console.log("[TURBO] Cached extraction for future re-runs.");
  
  const data = JSON.parse(raw || "{}");
  return data.events || [];
}

// ─── Step 2: Clear existing data and bulk insert ────────────────────
async function clearAndBulkInsertEvents(events) {
  console.log("[TURBO] Clearing database events, current status, and weekly snapshot tables...");
  await prisma.branchWeeklySnapshot.deleteMany({});
  await prisma.contractLifecycleCurrent.deleteMany({});
  await prisma.contractLifecycleEvent.deleteMany({});
  console.log("[TURBO] All tables cleared successfully.");

  // Prepare all records
  const records = [];
  for (const e of events) {
    if (!e.outletCode || !e.contractNo || !e.eventDate) continue;
    
    const rootContractNo = e.parentContractNo || e.contractNo;
    
    records.push({
      businessUnit: e.businessUnit ?? "GADAI_MAS",
      collateralType: e.collateralType,
      contractNo: e.contractNo,
      parentContractNo: e.parentContractNo ?? null,
      rootContractNo,
      customerId: e.customerId ?? null,
      outletCode: e.outletCode,
      outletName: e.outletName ?? null,
      branchName: e.branchName ?? null,
      regionName: e.regionName ?? null,
      areaName: e.areaName ?? null,
      eventType: e.eventType,
      eventDate: safeDate(e.eventDate),
      eventTs: safeDateTime(e.eventTs),
      registerDate: safeDate(e.registerDate),
      disbursementDate: safeDate(e.disbursementDate),
      dueDate: safeDate(e.dueDate),
      settlementDate: safeDate(e.settlementDate),
      tenorDays: e.tenorDays ?? null,
      overdueDays: e.overdueDays ?? null,
      renewalCount: e.renewalCount ?? null,
      isRenewal: Boolean(e.isRenewal),
      ltvRatio: decimalOrNull(e.ltvRatio),
      principalInitial: decimalOrNull(e.principalInitial),
      loanInitial: decimalOrNull(e.loanInitial),
      principalOutstanding: decimalOrNull(e.principalOutstanding),
      interestOutstanding: decimalOrNull(e.interestOutstanding),
      settlementAmount: decimalOrNull(e.settlementAmount),
      saleAmount: decimalOrNull(e.saleAmount),
      interestIncome: decimalOrNull(e.interestIncome),
      settlementStatus: e.settlementStatus ?? null,
      exitStatus: e.exitStatus ?? null,
      sourceSystem: e.sourceSystem,
      sourceSheet: e.sourceSheet,
      sourceEventKey: e.sourceEventKey,
      deletedAt: null,
    });
  }

  // Bulk insert using createMany in batches of 1000
  const BATCH = 1000;
  const total = records.length;
  console.log(`[TURBO] Inserting ${total} events in batches of ${BATCH}...`);

  for (let i = 0; i < total; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await prisma.contractLifecycleEvent.createMany({
      data: batch,
      skipDuplicates: true,
    });
    
    const done = Math.min(i + BATCH, total);
    const pct = ((done / total) * 100).toFixed(0);
    if (done % 10000 === 0 || done === total) {
      console.log(`  [Events] ${done}/${total} (${pct}%)`);
    }
  }

  console.log(`[TURBO] All ${total} events inserted!`);
  return records;
}

// ─── Step 3: Build contract lifecycle current ───────────────────────
function resolveCurrentStatus(lastEvent) {
  if (lastEvent.eventType === "SETTLEMENT") return "SETTLED";
  if (lastEvent.eventType === "BOOKING_RENEWAL") return "ROLLED_OVER";
  if ((lastEvent.overdueDays ?? 0) > 0) return "OVERDUE_ACTIVE";
  return "ACTIVE";
}

async function buildAndInsertCurrent(events) {
  // Group events by rootContractNo + collateralType in memory
  const rootGroups = new Map();
  for (const e of events) {
    if (!e.outletCode || !e.contractNo || !e.eventDate) continue;
    const rootContractNo = e.parentContractNo || e.contractNo;
    const key = `${e.collateralType}::${rootContractNo}`;
    if (!rootGroups.has(key)) rootGroups.set(key, []);
    rootGroups.get(key).push(e);
  }

  // Sort each group by eventDate and build current records
  const currentRecords = [];
  for (const [, group] of rootGroups) {
    group.sort((a, b) => {
      if (a.eventDate < b.eventDate) return -1;
      if (a.eventDate > b.eventDate) return 1;
      return (a.sourceEventKey || "").localeCompare(b.sourceEventKey || "");
    });
    
    const last = group[group.length - 1];
    const rootContractNo = last.parentContractNo || last.contractNo;
    
    let interestIncomeCumulative = new Prisma.Decimal(0);
    for (const e of group) {
      interestIncomeCumulative = addDecimal(interestIncomeCumulative, e.interestIncome);
    }

    currentRecords.push({
      businessUnit: last.businessUnit ?? "GADAI_MAS",
      collateralType: last.collateralType,
      rootContractNo,
      contractNoLatest: last.contractNo,
      customerId: last.customerId ?? null,
      outletCode: last.outletCode,
      outletName: last.outletName ?? null,
      branchName: last.branchName ?? null,
      regionName: last.regionName ?? null,
      areaName: last.areaName ?? null,
      statusCurrent: resolveCurrentStatus(last),
      lastEventType: last.eventType,
      lastEventDate: safeDate(last.eventDate),
      lastEventTs: safeDateTime(last.eventTs),
      registerDate: safeDate(last.registerDate),
      disbursementDate: safeDate(last.disbursementDate),
      dueDate: safeDate(last.dueDate),
      settlementDate: safeDate(last.settlementDate),
      tenorDays: last.tenorDays ?? null,
      overdueDaysCurrent: last.overdueDays ?? null,
      renewalCountCurrent: last.renewalCount ?? null,
      isRenewalCurrent: Boolean(last.isRenewal),
      ltvRatioCurrent: decimalOrNull(last.ltvRatio),
      principalInitialCurrent: decimalOrNull(last.principalInitial),
      loanInitialCurrent: decimalOrNull(last.loanInitial),
      principalOutstandingCurrent: decimalOrNull(last.principalOutstanding),
      interestOutstandingCurrent: decimalOrNull(last.interestOutstanding),
      settlementAmountLatest: decimalOrNull(last.settlementAmount),
      saleAmountLatest: decimalOrNull(last.saleAmount),
      interestIncomeCumulative,
      settlementStatusLatest: last.settlementStatus ?? null,
      exitStatusLatest: last.exitStatus ?? null,
      sourceUpdatedAt: new Date(),
      deletedAt: null,
    });
  }

  // Bulk insert current records
  const BATCH = 500;
  console.log(`[TURBO] Inserting ${currentRecords.length} current contract records...`);
  for (let i = 0; i < currentRecords.length; i += BATCH) {
    const batch = currentRecords.slice(i, i + BATCH);
    await prisma.contractLifecycleCurrent.createMany({ data: batch });
    const done = Math.min(i + BATCH, currentRecords.length);
    if (done % 5000 === 0 || done === currentRecords.length) {
      console.log(`  [Current] ${done}/${currentRecords.length}`);
    }
  }
  console.log(`[TURBO] Current records inserted!`);
}

// ─── Step 4: Build and insert weekly snapshots ──────────────────────
function getWeeklyKey(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  let weekIndex;
  if (day <= 7) weekIndex = 1;
  else if (day <= 14) weekIndex = 2;
  else if (day <= 21) weekIndex = 3;
  else weekIndex = 4;
  return { year, month, weekIndex, key: `${year}-${month}-W${weekIndex}` };
}

function getEndOfMonth(year, monthOneBased) {
  return new Date(Date.UTC(year, monthOneBased, 0)).getUTCDate();
}

async function buildAndInsertSnapshots(events) {
  // Group by week -> outlet
  const weeklyGroups = new Map();
  for (const e of events) {
    if (!e.outletCode || !e.collateralType || !e.eventDate) continue;
    const { year, month, weekIndex, key: weekKey } = getWeeklyKey(e.eventDate);
    
    if (!weeklyGroups.has(weekKey)) {
      const lastDay = getEndOfMonth(year, month);
      const startDay = weekIndex === 1 ? 1 : weekIndex === 2 ? 8 : weekIndex === 3 ? 15 : 22;
      const endDay = weekIndex === 4 ? lastDay : weekIndex === 1 ? 7 : weekIndex === 2 ? 14 : 21;
      weeklyGroups.set(weekKey, {
        window: { year, month, weekIndex, startDay, endDay, lastDay },
        outlets: new Map(),
      });
    }

    const outletKey = `${e.collateralType}::${e.outletCode}`;
    const group = weeklyGroups.get(weekKey);
    if (!group.outlets.has(outletKey)) {
      group.outlets.set(outletKey, {
        businessUnit: e.businessUnit ?? "GADAI_MAS",
        collateralType: e.collateralType,
        outletCode: e.outletCode,
        outletName: e.outletName ?? null,
        branchName: e.branchName ?? null,
        regionName: e.regionName ?? null,
        areaName: e.areaName ?? null,
        bookingEventCount: 0,
        newBookingCount: 0,
        renewalBookingCount: 0,
        bookingAmount: new Prisma.Decimal(0),
        ovdBookingCount: 0,
        ltvSum: new Prisma.Decimal(0),
        ltvCount: 0,
        settlementCount: 0,
        settlementAmount: new Prisma.Decimal(0),
        lateSettlementCount: 0,
        interestIncome: new Prisma.Decimal(0),
        saleAmount: new Prisma.Decimal(0),
      });
    }

    const bucket = group.outlets.get(outletKey);
    if (e.eventType === "BOOKING_NEW" || e.eventType === "BOOKING_RENEWAL") {
      bucket.bookingEventCount++;
      if (e.eventType === "BOOKING_NEW") bucket.newBookingCount++;
      if (e.eventType === "BOOKING_RENEWAL") bucket.renewalBookingCount++;
      bucket.bookingAmount = addDecimal(bucket.bookingAmount, e.loanInitial);
      if ((e.overdueDays ?? 0) > 0) bucket.ovdBookingCount++;
      if (e.ltvRatio != null) {
        bucket.ltvSum = addDecimal(bucket.ltvSum, e.ltvRatio);
        bucket.ltvCount++;
      }
    }
    if (e.eventType === "SETTLEMENT") {
      bucket.settlementCount++;
      bucket.settlementAmount = addDecimal(bucket.settlementAmount, e.settlementAmount);
      bucket.interestIncome = addDecimal(bucket.interestIncome, e.interestIncome);
      bucket.saleAmount = addDecimal(bucket.saleAmount, e.saleAmount);
      if ((e.overdueDays ?? 0) > 0) bucket.lateSettlementCount++;
    }
  }

  // Build snapshot records
  const snapshotRecords = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const [weekKey, group] of weeklyGroups) {
    const { year, month, weekIndex, startDay, endDay } = group.window;
    const startStr = `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
    const endStr = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
    const periodStart = asDateOnly(startStr);
    const periodEnd = asDateOnly(endStr);
    const publishedDate = asDateOnly(today);

    for (const row of group.outlets.values()) {
      const avgLtv = row.ltvCount > 0
        ? row.ltvSum.dividedBy(new Prisma.Decimal(row.ltvCount.toString()))
        : null;

      snapshotRecords.push({
        businessUnit: row.businessUnit,
        collateralType: row.collateralType,
        periodYear: year,
        periodMonth: month,
        weekIndex,
        periodStart,
        periodEnd,
        publishedDate,
        outletCode: row.outletCode,
        outletName: row.outletName,
        branchName: row.branchName,
        regionName: row.regionName,
        areaName: row.areaName,
        bookingEventCount: row.bookingEventCount,
        newBookingCount: row.newBookingCount,
        renewalBookingCount: row.renewalBookingCount,
        bookingAmount: row.bookingAmount,
        ovdBookingCount: row.ovdBookingCount,
        avgLtv,
        settlementCount: row.settlementCount,
        settlementAmount: row.settlementAmount,
        lateSettlementCount: row.lateSettlementCount,
        interestIncome: row.interestIncome,
        saleAmount: row.saleAmount,
        sourceRunAt: new Date(),
        deletedAt: null,
      });
    }
  }

  // Bulk insert
  const BATCH = 500;
  console.log(`[TURBO] Inserting ${snapshotRecords.length} snapshot rows...`);
  for (let i = 0; i < snapshotRecords.length; i += BATCH) {
    const batch = snapshotRecords.slice(i, i + BATCH);
    await prisma.branchWeeklySnapshot.createMany({ data: batch });
  }
  console.log(`[TURBO] Snapshots inserted!`);
  return snapshotRecords.length;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log("=== TURBO Import: Gadai MAS Data ===\n");

  // Clear cache file to force fresh extraction from Excel
  const cacheFile = path.join(__dirname, "_cached_extract.json");
  if (fs.existsSync(cacheFile)) {
    console.log("[TURBO] Clearing cached Excel extraction file...");
    fs.unlinkSync(cacheFile);
  }

  // Step 1: Extract
  const t1 = Date.now();
  const allEvents = extractAll();
  console.log(`[TURBO] Extracted ${allEvents.length} events in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

  if (allEvents.length === 0) {
    console.log("[TURBO] No events. Done.");
    return;
  }

  // Step 2: Bulk insert events
  const t2 = Date.now();
  await clearAndBulkInsertEvents(allEvents);
  console.log(`[TURBO] Events inserted in ${((Date.now() - t2) / 1000).toFixed(1)}s`);

  // Query all events to rebuild current records & snapshots
  console.log("[TURBO] Querying all events from database to rebuild current and snapshots...");
  const dbEvents = await prisma.contractLifecycleEvent.findMany({
    where: { deletedAt: null },
  });
  console.log(`[TURBO] Retrieved ${dbEvents.length} total events from database.`);

  const formattedEvents = dbEvents.map(e => ({
    businessUnit: e.businessUnit,
    collateralType: e.collateralType,
    contractNo: e.contractNo,
    parentContractNo: e.parentContractNo,
    rootContractNo: e.rootContractNo,
    customerId: e.customerId,
    outletCode: e.outletCode,
    outletName: e.outletName,
    branchName: e.branchName,
    regionName: e.regionName,
    areaName: e.areaName,
    eventType: e.eventType,
    eventDate: e.eventDate.toISOString().slice(0, 10),
    eventTs: e.eventTs ? e.eventTs.toISOString() : null,
    registerDate: e.registerDate ? e.registerDate.toISOString().slice(0, 10) : null,
    disbursementDate: e.disbursementDate ? e.disbursementDate.toISOString().slice(0, 10) : null,
    dueDate: e.dueDate ? e.dueDate.toISOString().slice(0, 10) : null,
    settlementDate: e.settlementDate ? e.settlementDate.toISOString().slice(0, 10) : null,
    tenorDays: e.tenorDays,
    overdueDays: e.overdueDays,
    renewalCount: e.renewalCount,
    isRenewal: e.isRenewal,
    ltvRatio: e.ltvRatio ? Number(e.ltvRatio) : null,
    principalInitial: e.principalInitial ? Number(e.principalInitial) : null,
    loanInitial: e.loanInitial ? Number(e.loanInitial) : null,
    principalOutstanding: e.principalOutstanding ? Number(e.principalOutstanding) : null,
    interestOutstanding: e.interestOutstanding ? Number(e.interestOutstanding) : null,
    settlementAmount: e.settlementAmount ? Number(e.settlementAmount) : null,
    saleAmount: e.saleAmount ? Number(e.saleAmount) : null,
    interestIncome: e.interestIncome ? Number(e.interestIncome) : null,
    settlementStatus: e.settlementStatus,
    exitStatus: e.exitStatus,
    sourceSystem: e.sourceSystem,
    sourceSheet: e.sourceSheet,
    sourceEventKey: e.sourceEventKey,
  }));

  // Step 3: Build & insert current
  const t3 = Date.now();
  await buildAndInsertCurrent(formattedEvents);
  console.log(`[TURBO] Current records in ${((Date.now() - t3) / 1000).toFixed(1)}s`);

  // Step 4: Build & insert snapshots
  const t4 = Date.now();
  const snapCount = await buildAndInsertSnapshots(formattedEvents);
  console.log(`[TURBO] ${snapCount} snapshots in ${((Date.now() - t4) / 1000).toFixed(1)}s`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== TURBO Import Complete in ${elapsed}s ===`);
  console.log(`Events: ${allEvents.length} | Date range: ${allEvents[0]?.eventDate} - ${allEvents[allEvents.length - 1]?.eventDate}`);
}

main()
  .catch((err) => {
    console.error("[TURBO] FAILED:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * import-fast.mjs
 * 
 * Fast version of import-all-data.mjs:
 * 1. Extracts ALL events from Excel in a SINGLE Python pass (no 48x file reads)
 * 2. Groups events by weekly window in JS memory
 * 3. Batch-upserts to database using Prisma transactions
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
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

// ─── Helper Functions ───────────────────────────────────────────────
function asDateOnly(isoDate) {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

function safeDate(value) {
  if (!value) return null;
  return asDateOnly(value);
}

function safeDateTime(value) {
  if (!value) return null;
  return new Date(value);
}

function decimalOrNull(value) {
  if (value === null || value === undefined) return null;
  return new Prisma.Decimal(value.toString());
}

function addDecimal(current, value) {
  if (value === null || value === undefined) return current;
  const incoming = new Prisma.Decimal(value.toString());
  return current.plus(incoming);
}

// ─── Step 1: Extract ALL events from Excel in one pass ──────────────
function extractAll() {
  const extractorPath = path.join(__dirname, "scripts", "etl", "extract_all_gadai_mas.py");
  const outputFile = path.join(
    os.tmpdir(),
    `gadai_all_${Date.now()}_${Math.random().toString(16).slice(2)}.json`
  );

  console.log("[FAST] Extracting ALL events from Excel (single pass)...");
  console.log(`[FAST] Data dir: ${DATA_DIR}`);
  console.log(`[FAST] Extractor: ${extractorPath}`);

  const result = spawnSync(
    "python",
    [extractorPath, "--data-dir", DATA_DIR, "--output", outputFile],
    { encoding: "utf8", stdio: "inherit", timeout: 600_000 } // 10 min timeout
  );

  if (result.status !== 0) {
    throw new Error(`Extractor failed with code ${result.status}`);
  }

  const payloadRaw = fs.readFileSync(outputFile, "utf8");
  fs.rmSync(outputFile, { force: true });
  const payload = JSON.parse(payloadRaw || "{}");
  return Array.isArray(payload.events) ? payload.events : [];
}

// ─── Step 2: Group events by weekly window ──────────────────────────
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

function groupByWeek(events) {
  const groups = new Map();
  for (const event of events) {
    if (!event.eventDate) continue;
    const { year, month, weekIndex, key } = getWeeklyKey(event.eventDate);
    if (!groups.has(key)) {
      const lastDay = getEndOfMonth(year, month);
      const startDay = weekIndex === 1 ? 1 : weekIndex === 2 ? 8 : weekIndex === 3 ? 15 : 22;
      const endDay = weekIndex === 4 ? lastDay : weekIndex === 1 ? 7 : weekIndex === 2 ? 14 : 21;
      groups.set(key, {
        events: [],
        window: {
          start: `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
          end: `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
          weekIndex,
          periodMonth: month,
          periodYear: year,
          publishedDate: new Date().toISOString().slice(0, 10),
        },
      });
    }
    groups.get(key).events.push(event);
  }
  return groups;
}

// ─── Step 3: Upsert events to database ──────────────────────────────
function mapKey(collateralType, contractNo) {
  return `${collateralType}::${contractNo}`;
}

async function buildRootMap() {
  const map = new Map();
  const rows = await prisma.contractLifecycleCurrent.findMany({
    where: { deletedAt: null },
    select: { collateralType: true, rootContractNo: true, contractNoLatest: true },
  });
  for (const row of rows) {
    map.set(mapKey(row.collateralType, row.contractNoLatest), row.rootContractNo);
    map.set(mapKey(row.collateralType, row.rootContractNo), row.rootContractNo);
  }
  return map;
}

function resolveRootContract(event, rootMap) {
  const ownKey = mapKey(event.collateralType, event.contractNo);
  const parentKey = event.parentContractNo
    ? mapKey(event.collateralType, event.parentContractNo)
    : null;
  if (rootMap.has(ownKey)) return rootMap.get(ownKey);
  if (parentKey && rootMap.has(parentKey)) return rootMap.get(parentKey);
  if (event.parentContractNo) return event.parentContractNo;
  return event.contractNo;
}

async function upsertAllEvents(events, rootMap) {
  const impactedRoots = new Set();
  const sorted = [...events].sort((a, b) => {
    if (a.eventDate < b.eventDate) return -1;
    if (a.eventDate > b.eventDate) return 1;
    return a.sourceEventKey.localeCompare(b.sourceEventKey);
  });

  // Batch in chunks of 50 for transaction efficiency
  const BATCH_SIZE = 50;
  for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
    const batch = sorted.slice(i, i + BATCH_SIZE);
    const operations = [];

    for (const event of batch) {
      if (!event.outletCode || !event.contractNo || !event.eventDate) continue;
      const rootContractNo = resolveRootContract(event, rootMap);
      const key = mapKey(event.collateralType, event.contractNo);
      rootMap.set(key, rootContractNo);
      rootMap.set(mapKey(event.collateralType, rootContractNo), rootContractNo);
      impactedRoots.add(`${event.collateralType}::${rootContractNo}`);

      const createOrUpdate = {
        businessUnit: event.businessUnit ?? "GADAI_MAS",
        collateralType: event.collateralType,
        contractNo: event.contractNo,
        parentContractNo: event.parentContractNo ?? null,
        rootContractNo,
        customerId: event.customerId ?? null,
        outletCode: event.outletCode,
        outletName: event.outletName ?? null,
        branchName: event.branchName ?? null,
        regionName: event.regionName ?? null,
        areaName: event.areaName ?? null,
        eventType: event.eventType,
        eventDate: safeDate(event.eventDate),
        eventTs: safeDateTime(event.eventTs),
        registerDate: safeDate(event.registerDate),
        disbursementDate: safeDate(event.disbursementDate),
        dueDate: safeDate(event.dueDate),
        settlementDate: safeDate(event.settlementDate),
        tenorDays: event.tenorDays ?? null,
        overdueDays: event.overdueDays ?? null,
        renewalCount: event.renewalCount ?? null,
        isRenewal: Boolean(event.isRenewal),
        ltvRatio: decimalOrNull(event.ltvRatio),
        principalInitial: decimalOrNull(event.principalInitial),
        loanInitial: decimalOrNull(event.loanInitial),
        principalOutstanding: decimalOrNull(event.principalOutstanding),
        interestOutstanding: decimalOrNull(event.interestOutstanding),
        settlementAmount: decimalOrNull(event.settlementAmount),
        saleAmount: decimalOrNull(event.saleAmount),
        interestIncome: decimalOrNull(event.interestIncome),
        settlementStatus: event.settlementStatus ?? null,
        exitStatus: event.exitStatus ?? null,
        sourceSystem: event.sourceSystem,
        sourceSheet: event.sourceSheet,
        sourceEventKey: event.sourceEventKey,
        deletedAt: null,
      };

      operations.push(
        prisma.contractLifecycleEvent.upsert({
          where: { sourceEventKey: event.sourceEventKey },
          update: createOrUpdate,
          create: createOrUpdate,
        })
      );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }
  }

  return impactedRoots;
}

// ─── Step 4: Refresh current status ─────────────────────────────────
function resolveCurrentStatus(lastEvent) {
  if (lastEvent.eventType === "SETTLEMENT") return "SETTLED";
  if (lastEvent.eventType === "BOOKING_RENEWAL") return "ROLLED_OVER";
  if ((lastEvent.overdueDays ?? 0) > 0) return "OVERDUE_ACTIVE";
  return "ACTIVE";
}

async function refreshCurrent(impactedRoots) {
  const operations = [];
  
  for (const rootKey of impactedRoots) {
    const [collateralType, rootContractNo] = rootKey.split("::");
    const events = await prisma.contractLifecycleEvent.findMany({
      where: { collateralType, rootContractNo, deletedAt: null },
      orderBy: [
        { eventDate: "asc" },
        { eventTs: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
    });

    if (events.length === 0) continue;
    const lastEvent = events[events.length - 1];
    let interestIncomeCumulative = new Prisma.Decimal(0);
    for (const row of events) {
      interestIncomeCumulative = addDecimal(interestIncomeCumulative, row.interestIncome);
    }

    const payload = {
      businessUnit: lastEvent.businessUnit,
      collateralType: lastEvent.collateralType,
      rootContractNo,
      contractNoLatest: lastEvent.contractNo,
      customerId: lastEvent.customerId,
      outletCode: lastEvent.outletCode,
      outletName: lastEvent.outletName,
      branchName: lastEvent.branchName,
      regionName: lastEvent.regionName,
      areaName: lastEvent.areaName,
      statusCurrent: resolveCurrentStatus(lastEvent),
      lastEventType: lastEvent.eventType,
      lastEventDate: lastEvent.eventDate,
      lastEventTs: lastEvent.eventTs,
      registerDate: lastEvent.registerDate,
      disbursementDate: lastEvent.disbursementDate,
      dueDate: lastEvent.dueDate,
      settlementDate: lastEvent.settlementDate,
      tenorDays: lastEvent.tenorDays,
      overdueDaysCurrent: lastEvent.overdueDays,
      renewalCountCurrent: lastEvent.renewalCount,
      isRenewalCurrent: lastEvent.isRenewal,
      ltvRatioCurrent: lastEvent.ltvRatio,
      principalInitialCurrent: lastEvent.principalInitial,
      loanInitialCurrent: lastEvent.loanInitial,
      principalOutstandingCurrent: lastEvent.principalOutstanding,
      interestOutstandingCurrent: lastEvent.interestOutstanding,
      settlementAmountLatest: lastEvent.settlementAmount,
      saleAmountLatest: lastEvent.saleAmount,
      interestIncomeCumulative,
      settlementStatusLatest: lastEvent.settlementStatus,
      exitStatusLatest: lastEvent.exitStatus,
      sourceUpdatedAt: new Date(),
      deletedAt: null,
    };

    operations.push(
      prisma.contractLifecycleCurrent.upsert({
        where: {
          rootContractNo_collateralType: { rootContractNo, collateralType },
        },
        update: payload,
        create: payload,
      })
    );
  }

  // Batch upsert current status in chunks of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    await prisma.$transaction(operations.slice(i, i + BATCH_SIZE));
  }
}

// ─── Step 5: Upsert weekly snapshots ────────────────────────────────
function initMetricBucket(sample) {
  return {
    businessUnit: sample.businessUnit ?? "GADAI_MAS",
    collateralType: sample.collateralType,
    outletCode: sample.outletCode,
    outletName: sample.outletName ?? null,
    branchName: sample.branchName ?? null,
    regionName: sample.regionName ?? null,
    areaName: sample.areaName ?? null,
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
  };
}

async function upsertWeeklySnapshots(weeklyGroups) {
  let totalSnapshots = 0;
  const operations = [];

  for (const [weekKey, group] of weeklyGroups) {
    const { window, events } = group;
    const metrics = new Map();

    for (const event of events) {
      if (!event.outletCode || !event.collateralType) continue;
      const key = `${event.collateralType}::${event.outletCode}`;
      if (!metrics.has(key)) {
        metrics.set(key, initMetricBucket(event));
      }
      const bucket = metrics.get(key);

      if (event.eventType === "BOOKING_NEW" || event.eventType === "BOOKING_RENEWAL") {
        bucket.bookingEventCount += 1;
        if (event.eventType === "BOOKING_NEW") bucket.newBookingCount += 1;
        if (event.eventType === "BOOKING_RENEWAL") bucket.renewalBookingCount += 1;
        bucket.bookingAmount = addDecimal(bucket.bookingAmount, event.loanInitial);
        if ((event.overdueDays ?? 0) > 0) bucket.ovdBookingCount += 1;
        if (event.ltvRatio !== null && event.ltvRatio !== undefined) {
          bucket.ltvSum = addDecimal(bucket.ltvSum, event.ltvRatio);
          bucket.ltvCount += 1;
        }
      }

      if (event.eventType === "SETTLEMENT") {
        bucket.settlementCount += 1;
        bucket.settlementAmount = addDecimal(bucket.settlementAmount, event.settlementAmount);
        bucket.interestIncome = addDecimal(bucket.interestIncome, event.interestIncome);
        bucket.saleAmount = addDecimal(bucket.saleAmount, event.saleAmount);
        if ((event.overdueDays ?? 0) > 0) bucket.lateSettlementCount += 1;
      }
    }

    const periodStart = asDateOnly(window.start);
    const periodEnd = asDateOnly(window.end);
    const publishedDate = asDateOnly(window.publishedDate);

    for (const row of metrics.values()) {
      const avgLtv =
        row.ltvCount > 0
          ? row.ltvSum.dividedBy(new Prisma.Decimal(row.ltvCount.toString()))
          : null;

      const payload = {
        businessUnit: row.businessUnit,
        collateralType: row.collateralType,
        periodYear: window.periodYear,
        periodMonth: window.periodMonth,
        weekIndex: window.weekIndex,
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
      };

      operations.push(
        prisma.branchWeeklySnapshot.upsert({
          where: {
            collateralType_outletCode_periodStart_periodEnd: {
              collateralType: row.collateralType,
              outletCode: row.outletCode,
              periodStart,
              periodEnd,
            },
          },
          update: payload,
          create: payload,
        })
      );
      totalSnapshots++;
    }
  }

  // Batch upsert snapshots in chunks of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    await prisma.$transaction(operations.slice(i, i + BATCH_SIZE));
  }

  return totalSnapshots;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log("=== FAST Import: Gadai MAS Data ===\n");

  // Step 1: Extract all events in a single Python pass
  const allEvents = extractAll();
  console.log(`\n[FAST] Total events extracted: ${allEvents.length}`);

  if (allEvents.length === 0) {
    console.log("[FAST] No events found. Check your data directory.");
    return;
  }

  // Step 2: Group by weekly window
  const weeklyGroups = groupByWeek(allEvents);
  console.log(`[FAST] Weekly windows with data: ${weeklyGroups.size}`);
  for (const [key, group] of [...weeklyGroups.entries()].sort()) {
    console.log(`  ${key}: ${group.events.length} events`);
  }

  // Step 3: Upsert all events to database
  console.log("\n[FAST] Upserting events to database...");
  const rootMap = await buildRootMap();
  const impactedRoots = await upsertAllEvents(allEvents, rootMap);
  console.log(`[FAST] Upserted events. Impacted roots: ${impactedRoots.size}`);

  // Step 4: Refresh current status
  console.log("[FAST] Refreshing contract lifecycle current...");
  await refreshCurrent(impactedRoots);
  console.log("[FAST] Current status refreshed.");

  // Step 5: Upsert weekly snapshots
  console.log("[FAST] Upserting weekly snapshots...");
  const snapshotCount = await upsertWeeklySnapshots(weeklyGroups);
  console.log(`[FAST] Upserted ${snapshotCount} snapshot rows.`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== FAST Import Complete in ${elapsed}s ===`);
}

main()
  .catch((error) => {
    console.error("[FAST] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

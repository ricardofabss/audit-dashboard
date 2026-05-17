import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";

const prismaUrlSource = process.env.ETL_DATABASE_URL
  ? "ETL_DATABASE_URL"
  : process.env.DIRECT_URL
    ? "DIRECT_URL"
    : process.env.DATABASE_URL
      ? "DATABASE_URL"
      : "NONE";
const prismaUrl =
  process.env.ETL_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = prismaUrl
  ? new PrismaClient({ datasources: { db: { url: prismaUrl } } })
  : new PrismaClient();

function maskPrismaUrl(url) {
  if (!url) return "N/A";
  const match = url.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)(\/.*)?$/i);
  if (!match) return "invalid-url-format";
  const user = match[1];
  const host = match[3];
  return `user=${user}, host=${host}`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function parseIsoDate(iso) {
  const [year, month, day] = String(iso).split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Tanggal tidak valid: ${iso}. Format wajib YYYY-MM-DD.`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

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

function dayInUtc(date) {
  return date.getUTCDate();
}

function monthInUtc(date) {
  return date.getUTCMonth() + 1;
}

function yearInUtc(date) {
  return date.getUTCFullYear();
}

function endOfMonthUtc(year, monthOneBased) {
  return new Date(Date.UTC(year, monthOneBased, 0));
}

function resolveWeeklyWindow(options) {
  const asOf = options.asOf ? parseIsoDate(options.asOf) : new Date();
  const asOfUtc = new Date(Date.UTC(yearInUtc(asOf), asOf.getUTCMonth(), dayInUtc(asOf)));

  if (options.windowStart && options.windowEnd) {
    const start = parseIsoDate(options.windowStart);
    const end = parseIsoDate(options.windowEnd);
    if (start > end) throw new Error("windowStart tidak boleh lebih besar dari windowEnd.");
    const weekIndex = Number(options.weekIndex ?? 0);
    if (![1, 2, 3, 4].includes(weekIndex)) {
      throw new Error("Jika memakai windowStart/windowEnd, weekIndex wajib 1-4.");
    }
    const periodMonth = Number(options.periodMonth ?? monthInUtc(start));
    const periodYear = Number(options.periodYear ?? yearInUtc(start));
    const publishedDate = options.publishedDate ? parseIsoDate(options.publishedDate) : asOfUtc;

    return {
      start: toIsoDate(start),
      end: toIsoDate(end),
      weekIndex,
      periodMonth,
      periodYear,
      publishedDate: toIsoDate(publishedDate),
      asOf: toIsoDate(asOfUtc),
    };
  }

  const day = dayInUtc(asOfUtc);
  const month = monthInUtc(asOfUtc);
  const year = yearInUtc(asOfUtc);

  if (day === 8) {
    return {
      start: `${year}-${String(month).padStart(2, "0")}-01`,
      end: `${year}-${String(month).padStart(2, "0")}-07`,
      weekIndex: 1,
      periodMonth: month,
      periodYear: year,
      publishedDate: toIsoDate(asOfUtc),
      asOf: toIsoDate(asOfUtc),
    };
  }

  if (day === 15) {
    return {
      start: `${year}-${String(month).padStart(2, "0")}-08`,
      end: `${year}-${String(month).padStart(2, "0")}-14`,
      weekIndex: 2,
      periodMonth: month,
      periodYear: year,
      publishedDate: toIsoDate(asOfUtc),
      asOf: toIsoDate(asOfUtc),
    };
  }

  if (day === 22) {
    return {
      start: `${year}-${String(month).padStart(2, "0")}-15`,
      end: `${year}-${String(month).padStart(2, "0")}-21`,
      weekIndex: 3,
      periodMonth: month,
      periodYear: year,
      publishedDate: toIsoDate(asOfUtc),
      asOf: toIsoDate(asOfUtc),
    };
  }

  if (day === 1) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const endDate = endOfMonthUtc(prevYear, prevMonth);
    return {
      start: `${prevYear}-${String(prevMonth).padStart(2, "0")}-22`,
      end: toIsoDate(endDate),
      weekIndex: 4,
      periodMonth: prevMonth,
      periodYear: prevYear,
      publishedDate: toIsoDate(asOfUtc),
      asOf: toIsoDate(asOfUtc),
    };
  }

  throw new Error(
    "Tanggal run tidak sesuai siklus mingguan (hanya tanggal 1, 8, 15, 22). " +
      "Untuk manual, pakai --windowStart --windowEnd --weekIndex.",
  );
}

function runExtractor({ dataDir, start, end }) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const extractorPath = path.join(__dirname, "extract_gadai_mas_weekly.py");
  const outputFile = path.join(
    os.tmpdir(),
    `gadai_weekly_${Date.now()}_${Math.random().toString(16).slice(2)}.json`,
  );
  const result = spawnSync(
    "python",
    [
      extractorPath,
      "--data-dir",
      dataDir,
      "--start",
      start,
      "--end",
      end,
      "--output",
      outputFile,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(`Extractor gagal: ${result.stderr || result.stdout}`);
  }

  const payloadRaw = fs.readFileSync(outputFile, "utf8");
  fs.rmSync(outputFile, { force: true });
  const payload = JSON.parse(payloadRaw || "{}");
  return Array.isArray(payload.events) ? payload.events : [];
}

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

async function upsertEvents(events) {
  const impactedRoots = new Set();
  const rootMap = await buildRootMap();
  const sorted = [...events].sort((a, b) => {
    if (a.eventDate < b.eventDate) return -1;
    if (a.eventDate > b.eventDate) return 1;
    return a.sourceEventKey.localeCompare(b.sourceEventKey);
  });

  for (const event of sorted) {
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

    await prisma.contractLifecycleEvent.upsert({
      where: { sourceEventKey: event.sourceEventKey },
      update: createOrUpdate,
      create: createOrUpdate,
    });
  }

  return impactedRoots;
}

function resolveCurrentStatus(lastEvent) {
  if (lastEvent.eventType === "SETTLEMENT") return "SETTLED";
  if (lastEvent.eventType === "BOOKING_RENEWAL") return "ROLLED_OVER";
  if ((lastEvent.overdueDays ?? 0) > 0) return "OVERDUE_ACTIVE";
  return "ACTIVE";
}

async function refreshCurrent(impactedRoots) {
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

    await prisma.contractLifecycleCurrent.upsert({
      where: {
        rootContractNo_collateralType: {
          rootContractNo,
          collateralType,
        },
      },
      update: payload,
      create: payload,
    });
  }
}

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

async function upsertWeeklySnapshot(window, events) {
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

    await prisma.branchWeeklySnapshot.upsert({
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
    });
  }

  return metrics.size;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const window = resolveWeeklyWindow(args);
  const dataDir =
    args.dataDir ||
    process.env.GADAI_MAS_DATA_DIR ||
    "C:\\Users\\USER\\OneDrive\\Desktop\\Kaizen\\Sample data\\Gadai MAS";

  console.log("[ETL] Weekly window:", window);
  console.log("[ETL] Data directory:", dataDir);
  console.log(`[ETL] Prisma URL source: ${prismaUrlSource} (${maskPrismaUrl(prismaUrl)})`);

  const events = runExtractor({
    dataDir,
    start: window.start,
    end: window.end,
  });
  console.log(`[ETL] Extracted events: ${events.length}`);
  if (events.length === 0) {
    console.log("[ETL] No events in selected window. Done.");
    return;
  }

  const impactedRoots = await upsertEvents(events);
  console.log(`[ETL] Upserted events. Impacted roots: ${impactedRoots.size}`);

  await refreshCurrent(impactedRoots);
  console.log("[ETL] Refreshed contract_lifecycle_current.");

  const snapshotCount = await upsertWeeklySnapshot(window, events);
  console.log(`[ETL] Upserted branch_weekly_snapshot rows: ${snapshotCount}`);
}

main()
  .catch((error) => {
    console.error("[ETL] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

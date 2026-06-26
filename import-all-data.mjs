import { execSync } from "child_process";

// Let's use pure JS Date manipulation to avoid extra dependencies.
console.log("=== Auto Import All Pawnbroking (Gadai) Data ===");

const startDate = new Date(Date.UTC(2026, 0, 1)); // 1 Januari 2026
const endDate = new Date(Date.UTC(2026, 11, 31)); // 31 Desember 2026

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getEndOfMonth(year, monthOneBased) {
  return new Date(Date.UTC(year, monthOneBased, 0));
}

// Generate all weekly cycles
const cycles = [];
let current = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

while (current <= endDate) {
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth() + 1; // 1-based

  // W1: 1-7
  cycles.push({
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${year}-${String(month).padStart(2, "0")}-07`,
    weekIndex: 1,
    month,
    year
  });

  // W2: 8-14
  cycles.push({
    start: `${year}-${String(month).padStart(2, "0")}-08`,
    end: `${year}-${String(month).padStart(2, "0")}-14`,
    weekIndex: 2,
    month,
    year
  });

  // W3: 15-21
  cycles.push({
    start: `${year}-${String(month).padStart(2, "0")}-15`,
    end: `${year}-${String(month).padStart(2, "0")}-21`,
    weekIndex: 3,
    month,
    year
  });

  // W4: 22-end of month
  const lastDay = getEndOfMonth(year, month).getUTCDate();
  cycles.push({
    start: `${year}-${String(month).padStart(2, "0")}-22`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    weekIndex: 4,
    month,
    year
  });

  // Go to next month
  current.setUTCMonth(current.getUTCMonth() + 1);
}

console.log(`Generated ${cycles.length} weekly windows to import.`);
console.log("Starting import process... (This might take a few minutes)");

let importedCount = 0;

for (let i = 0; i < cycles.length; i++) {
  const cycle = cycles[i];
  const progress = `[${i + 1}/${cycles.length}]`;
  const cmd = `node scripts/etl/weekly_gadai_mas.mjs --windowStart ${cycle.start} --windowEnd ${cycle.end} --weekIndex ${cycle.weekIndex} --periodMonth ${cycle.month} --periodYear ${cycle.year}`;
  
  console.log(`${progress} Executing: ${cycle.start} to ${cycle.end} (W${cycle.weekIndex})...`);
  
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: "pipe" });
    
    // Check if events were actually found
    if (output.includes("No events in selected window")) {
      // Quietly skip empty weeks to avoid log spam
    } else {
      console.log(`   -> Success! ${output.split("\n").filter(l => l.includes("[ETL]")).join(" | ")}`);
      importedCount++;
    }
  } catch (err) {
    console.error(`   -> FAILED at ${cycle.start} to ${cycle.end}:`, err.message);
    if (err.stderr) console.error("Stderr:", err.stderr);
  }
}

console.log(`\n=== Import Completed! ===`);
console.log(`Processed ${cycles.length} weeks.`);
console.log(`Successfully imported ${importedCount} active data weeks to your homeserver database.`);

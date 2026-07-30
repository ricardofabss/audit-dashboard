#!/usr/bin/env node
// Run this script to push the new DB table and seed anomaly rules.
// Usage: node setup-anomaly-rules.mjs
// Run from the project root directory.

import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("=== Step 1/3: Pushing Prisma schema to database ===");
try {
  execSync("npx prisma db push --accept-data-loss", { cwd: __dirname, stdio: "inherit" });
  console.log("✅ Schema pushed successfully.\n");
} catch (e) {
  console.error("❌ Failed to push schema. Please run 'npx prisma db push' manually.");
  process.exit(1);
}

console.log("=== Step 2/3: Generating Prisma client ===");
try {
  execSync("npx prisma generate", { cwd: __dirname, stdio: "inherit" });
  console.log("✅ Prisma client generated.\n");
} catch (e) {
  console.error("❌ Failed to generate Prisma client.");
  process.exit(1);
}

console.log("=== Step 3/3: Seeding anomaly rules ===");
try {
  execSync("node prisma/seed-anomaly-rules.mjs", { cwd: __dirname, stdio: "inherit" });
  console.log("\n✅ All done! Anomaly rules are now in the database.\n");
  console.log("You can now restart 'npm run dev' to use the updated data.");
} catch (e) {
  console.error("❌ Failed to seed anomaly rules.");
  process.exit(1);
}

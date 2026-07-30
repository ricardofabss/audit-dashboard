// Prisma db push + generate + seed in one script
// Run: node run-prisma-setup.mjs
import { execSync } from "child_process";

try {
  console.log("Step 1: npx prisma db push...");
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
  console.log("Step 2: npx prisma generate...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("Done! Now visit http://localhost:3000/api/seed-rules to seed the anomaly rules.");
} catch(e) {
  console.error("Error:", e.message);
}

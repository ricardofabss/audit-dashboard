import { PrismaClient } from "@prisma/client";
import net from "net";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

console.log("=== AuditSphere DB Diagnostics ===");

// 1. Load environment variables
const envPath = path.resolve(process.cwd(), ".env");
const envLocalPath = path.resolve(process.cwd(), ".env.local");

let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envLocalPath)) {
  console.log("Loading env from .env.local...");
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  if (envConfig.DATABASE_URL) {
    databaseUrl = envConfig.DATABASE_URL;
  }
} else if (fs.existsSync(envPath)) {
  console.log("Loading env from .env...");
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  if (envConfig.DATABASE_URL) {
    databaseUrl = envConfig.DATABASE_URL;
  }
}

if (!databaseUrl) {
  console.error("ERROR: DATABASE_URL is not set in environment or env files.");
  process.exit(1);
}

// Clean quotes
databaseUrl = databaseUrl.replace(/^["']|["']$/g, "");

console.log(`Database URL found: ${databaseUrl.replace(/:([^:@]+)@/, ":****@")}`);

// 2. Parse URL details
let host = "";
let port = 5432;
let user = "";
let dbName = "";

try {
  const match = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
  if (match) {
    user = match[1];
    host = match[3];
    port = match[4] ? parseInt(match[4], 10) : 5432;
    dbName = match[5];
  } else {
    // try standard URL parser
    const url = new URL(databaseUrl);
    host = url.hostname;
    port = parseInt(url.port || "5432", 10);
    user = url.username;
    dbName = url.pathname.substring(1);
  }
} catch (e) {
  console.error("ERROR: Could not parse DATABASE_URL.", e.message);
}

if (!host) {
  console.error("ERROR: Host could not be extracted from URL.");
  process.exit(1);
}

console.log(`\n--- 1. Testing TCP Connection ---`);
console.log(`Connecting to host: ${host} on port: ${port}...`);

const socket = new net.Socket();
const startTime = Date.now();

socket.setTimeout(5000);

socket.on("connect", () => {
  const duration = Date.now() - startTime;
  console.log(`SUCCESS: TCP connection established to ${host}:${port} in ${duration}ms!`);
  socket.destroy();
  testPrisma();
});

socket.on("timeout", () => {
  console.error(`\nFAILED: TCP Connection timed out after 5000ms.`);
  console.error(`Suggestions:`);
  console.error(`- Check if the homeserver IP address (${host}) is correct and active.`);
  console.error(`- Verify that the homeserver PostgreSQL service is running.`);
  console.error(`- Check if there is a firewall blocking port ${port} on the server or client.`);
  console.error(`- Ensure you are on the same private network (Tailscale/LAN/VPN) as ${host}.`);
  socket.destroy();
});

socket.on("error", (err) => {
  console.error(`\nFAILED: TCP Connection error:`, err.message);
  console.error(`Suggestions:`);
  console.error(`- If 'connection refused', check if PostgreSQL is configured to listen on all interfaces (listen_addresses = '*') on the host.`);
  console.error(`- Ensure port ${port} is the correct port for your PostgreSQL server.`);
  socket.destroy();
});

socket.connect(port, host);

// 3. Test Prisma query
async function testPrisma() {
  console.log(`\n--- 2. Testing Database Authentications & Schema ---`);
  console.log(`Initializing PrismaClient...`);
  
  // Set the process env DATABASE_URL explicitly to make sure Prisma picks it up
  process.env.DATABASE_URL = databaseUrl;
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    console.log("Connecting and running simple query: SELECT 1...");
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log("SUCCESS: SELECT 1 succeeded!", result);

    console.log("\nChecking if tables exist (querying profile count)...");
    const profileCount = await prisma.profile.count();
    console.log(`SUCCESS: Successfully connected to database and found ${profileCount} profiles.`);
    console.log("The connection is fully functional!");
  } catch (err) {
    console.error(`\nFAILED: Database operation failed.`);
    console.error(`Error message:`, err.message);
    
    if (err.code === "P1001" || err.message.includes("Can't reach database server")) {
      console.error("\nSuggestion: Prisma could not reach the server. Since TCP succeeded, check if PostgreSQL is starting up or has reached max connections.");
    } else if (err.message.includes("password authentication failed")) {
      console.error("\nSuggestion: Username or password in your DATABASE_URL is incorrect.");
    } else if (err.message.includes("database") && err.message.includes("does not exist")) {
      console.error(`\nSuggestion: The database '${dbName}' does not exist on the server. You need to create it first, or run 'npx prisma db push' to create it.`);
    } else if (err.message.includes("relation") && err.message.includes("does not exist")) {
      console.error("\nSuggestion: Database exists, but tables are missing. Run 'npx prisma db push' followed by 'node prisma/seed.mjs' to sync and seed your schema.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

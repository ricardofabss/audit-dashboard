import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import net from "net";

export const dynamic = "force-dynamic";

function checkTcp(host: string, port: number): Promise<string> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2500);
    socket.on("connect", () => {
      socket.destroy();
      resolve("CONNECTED_SUCCESS");
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve("TIMEOUT_EXPIRED");
    });
    socket.on("error", (err) => {
      socket.destroy();
      resolve(`ERROR: ${err.message}`);
    });
    socket.connect(port, host);
  });
}

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "NOT_SET";
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");

  const tcpRemote = await checkTcp("100.72.19.38", 5432);
  const tcpLocal = await checkTcp("127.0.0.1", 5432);

  let remotePrismaResult = "SKIPPED";
  if (tcpRemote === "CONNECTED_SUCCESS") {
    try {
      const p = new PrismaClient({ datasources: { db: { url: dbUrl } } });
      await p.$queryRaw`SELECT 1`;
      const count = await p.contractLifecycleEvent.count();
      remotePrismaResult = `SUCCESS (events: ${count})`;
      await p.$disconnect();
    } catch (e: any) {
      remotePrismaResult = `PrismaError: ${e.message}`;
    }
  }

  let localPrismaResult = "SKIPPED";
  if (tcpLocal === "CONNECTED_SUCCESS") {
    try {
      const localUrl = "postgresql://postgres:postgres@127.0.0.1:5432/auditsphere";
      const p = new PrismaClient({ datasources: { db: { url: localUrl } } });
      await p.$queryRaw`SELECT 1`;
      const count = await p.contractLifecycleEvent.count();
      localPrismaResult = `SUCCESS (events: ${count})`;
      await p.$disconnect();
    } catch (e: any) {
      localPrismaResult = `PrismaError: ${e.message}`;
    }
  }

  return NextResponse.json({
    envDatabaseUrl: maskedUrl,
    tcpCheck: {
      remote_100_72_19_38_port_5432: tcpRemote,
      local_127_0_0_1_port_5432: tcpLocal,
    },
    prismaCheck: {
      remoteDb: remotePrismaResult,
      localDb: localPrismaResult,
    },
  });
}

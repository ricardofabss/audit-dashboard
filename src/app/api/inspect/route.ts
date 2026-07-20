import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cmd = searchParams.get("cmd") || "npx prisma db push --accept-data-loss";
    
    console.log("Running command:", cmd);
    const { stdout, stderr } = await execAsync(cmd);
    
    return NextResponse.json({ success: true, stdout, stderr });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: String(error), stdout: error.stdout, stderr: error.stderr });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const activities = await db.auditActivity.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const formattedActivities = activities.map((a) => ({
      title: a.title,
      detail: a.detail,
      time: a.time,
      tone: a.tone as "cyan" | "emerald" | "amber" | "red" | "indigo" | "slate",
    }));
    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error("GET /api/activities error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, detail, time, tone } = body;
    
    const newActivity = await db.auditActivity.create({
      data: {
        title,
        detail,
        time,
        tone,
      },
    });

    return NextResponse.json({ success: true, activity: newActivity });
  } catch (error) {
    console.error("POST /api/activities error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

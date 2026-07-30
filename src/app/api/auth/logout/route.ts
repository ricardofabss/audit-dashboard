import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  
  // Set expired cookie to force deletion on all path levels and domains
  response.cookies.set("auditsphere_session", "", {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  });

  return response;
}

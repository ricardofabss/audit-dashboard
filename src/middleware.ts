import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Verify HTTP-Only Session Cookie
  const sessionCookie = request.cookies.get("auditsphere_session");

  // If no valid session cookie exists, redirect immediately to /login
  if (!sessionCookie || !sessionCookie.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};

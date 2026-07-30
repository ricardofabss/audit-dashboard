import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/session"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Verify HTTP-Only Session Cookie
  const sessionCookie = request.cookies.get("auditsphere_session");

  // If no session cookie exists, redirect immediately to /login
  if (!sessionCookie || !sessionCookie.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files (_next/static, _next/image, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

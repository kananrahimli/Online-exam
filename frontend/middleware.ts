import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  // API route-lar üçün CORS headers əlavə et
  if (isApiRoute) {
    const response = NextResponse.next();

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Preflight request (OPTIONS) üçün
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }

    return response;
  }

  // Login olubsa və login səhifəsindədirsə -> dashboard-a redirect et
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Login olmayıbsa və dashboard-dadırsa -> login-ə redirect et
  if (!token && isDashboard) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*", // Bütün API route-lar
    "/login", // Login səhifəsi
    "/dashboard/:path*", // Dashboard və alt səhifələr
  ],
};

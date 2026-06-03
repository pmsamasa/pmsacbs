import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicPaths = ["/login", "/auth/callback", "/manifest.webmanifest", "/sw.js", "/icon"];
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|mp4|webmanifest)$/);

  if (publicPaths.includes(pathname) || isPublicAsset) {
    return NextResponse.next();
  }

  const hasSupabaseSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));

  if (!hasSupabaseSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const publicPaths = ["/login", "/auth/callback", "/manifest.webmanifest", "/sw.js"];
  const isPublicAsset = pathname.startsWith("/_next") || pathname.startsWith("/icons") || pathname.match(/\.(png|jpg|jpeg|svg|ico|mp4)$/);

  if (!user && !publicPaths.includes(pathname) && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "head" ? "/head" : profile?.role === "manager" ? "/manager" : "/customer";
    return NextResponse.redirect(url);
  }

  return response;
}


import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  // Routes reachable without a session (login forms & password recovery).
  const isPublicPath =
    url.pathname === "/login" ||
    url.pathname === "/signup" ||
    url.pathname === "/forgot-password" ||
    url.pathname === "/update-password";
  // Auth landing pages: signed-in users have no business there.
  const isAuthLanding =
    url.pathname === "/login" || url.pathname === "/signup";

  if (!user && !isPublicPath) {
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthLanding) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Admin-only routes: verify the caller's profile role server-side as a
  // second layer on top of the client-side <ProtectRole> guards. RLS still
  // blocks any direct data mutation for non-admins.
  if (user && url.pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
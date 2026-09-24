import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy (formerly middleware).
 * Refreshes Supabase auth sessions on every request and enforces
 * route protection based on authentication state.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh / read the session and enforce route rules.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isAuthed = !!user;
  const isJomlinkUser = isAuthed && user.app_metadata?.app === "jomlink";

  const protectedRoutes = ["/dashboard", "/opportunities/new", "/admin"];

  // Unauthenticated user tries to access a protected route → login.
  if (!isAuthed && protectedRoutes.some((p) => pathname.startsWith(p))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated Jomlink user tries to access auth pages → dashboard.
  if (
    isJomlinkUser &&
    (pathname.startsWith("/login") || pathname.startsWith("/register"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
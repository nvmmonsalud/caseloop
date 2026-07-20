import { updateSession } from "@insforge/sdk/ssr/middleware";
import type { CookieStore } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isInsForgePersistenceEnabled } from "@/lib/insforge/config";
import { buildLoginPath } from "@/lib/auth/navigation";

function copyResponseCookies(source: NextResponse, destination: NextResponse) {
  for (const cookie of source.cookies.getAll()) destination.cookies.set(cookie);
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!isInsForgePersistenceEnabled()) return response;

  const session = await updateSession({
    requestCookies: request.cookies as unknown as CookieStore,
    responseCookies: response.cookies as unknown as CookieStore,
  });

  const protectedRoute = request.nextUrl.pathname.startsWith("/student") || request.nextUrl.pathname.startsWith("/faculty");
  if (protectedRoute && !session.accessToken) {
    const intendedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const reason = session.error ? "session_expired" : "sign_in_required";
    const loginResponse = NextResponse.redirect(new URL(buildLoginPath(intendedPath, reason), request.url));
    copyResponseCookies(response, loginResponse);
    return loginResponse;
  }

  return response;
}

export const config = {
  matcher: ["/student/:path*", "/faculty/:path*", "/login"],
};

import { updateSession } from "@insforge/sdk/ssr/middleware";
import type { CookieStore } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isInsForgePersistenceEnabled } from "@/lib/insforge/config";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!isInsForgePersistenceEnabled()) return response;

  await updateSession({
    requestCookies: request.cookies as unknown as CookieStore,
    responseCookies: response.cookies as unknown as CookieStore,
  });
  return response;
}

export const config = {
  matcher: ["/student/:path*", "/faculty/:path*", "/login"],
};

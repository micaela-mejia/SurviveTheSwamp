import { auth0 } from "@/lib/auth0";

// Next.js 16 uses proxy.js (formerly middleware.js). Auth0 mounts
// /auth/login, /auth/logout, /auth/callback and /auth/profile through it.
export async function proxy(request) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

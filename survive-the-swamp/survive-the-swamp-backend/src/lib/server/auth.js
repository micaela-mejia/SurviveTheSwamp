import "server-only";
import { auth0 } from "@/lib/auth0";
import { jsonError } from "./http.js";

// Use at the top of every protected route:
//   const { user, response } = await requireUser();
//   if (response) return response;
// user.id is the Auth0 "sub" and is the key for ALL of a user's data.
export async function requireUser() {
  const session = await auth0.getSession();
  const sub = session?.user?.sub;
  if (!sub) {
    return { user: null, response: jsonError("Sign in required.", 401) };
  }
  return {
    user: {
      id: sub,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    },
    response: null,
  };
}

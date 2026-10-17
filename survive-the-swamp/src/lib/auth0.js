import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const isAuth0Configured = Boolean(
  process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_SECRET &&
    (process.env.AUTH0_CLIENT_SECRET ||
      process.env.AUTH0_CLIENT_ASSERTION_SIGNING_KEY),
);

// Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET and
// APP_BASE_URL from the environment (.env.local).
export const auth0 = new Auth0Client();

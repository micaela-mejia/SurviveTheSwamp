import "server-only";
import { NextResponse } from "next/server";
import { BackendConfigError, DatabaseError } from "./errors.js";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function jsonError(message, status = 400, headers) {
  return NextResponse.json({ error: message }, { status, headers });
}

// Returns { body } on success or { response } with a ready 400 error.
export async function readJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { response: jsonError("Request body must be a JSON object.") };
    }
    return { body };
  } catch {
    return { response: jsonError("Request body must be valid JSON.") };
  }
}

export function handleRouteError(error, context) {
  if (error instanceof BackendConfigError) {
    console.error(`${context}:`, error.message);
    return jsonError("The server is not fully configured yet.", 503);
  }
  if (error instanceof DatabaseError) {
    console.error(`${context}:`, error.message, error.details);
    return jsonError("Something went wrong saving your data. Try again.", 500);
  }
  console.error(`${context}: unexpected error`, error);
  return jsonError("Unexpected server error.", 500);
}

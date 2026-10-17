import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { listAssignments } from "@/lib/server/store";
import { computeTide } from "@/lib/server/tide";
import { handleRouteError } from "@/lib/server/http";

export const runtime = "nodejs";

// GET /api/tide -> { level: 0-100, state: calm|choppy|storm|sinking, upcoming }
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    const assignments = await listAssignments(user.id);
    return NextResponse.json(computeTide(assignments));
  } catch (error) {
    return handleRouteError(error, "GET /api/tide");
  }
}

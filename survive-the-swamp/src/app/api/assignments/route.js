import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { ensureProfile, listAssignments, saveAssignments } from "@/lib/server/store";
import { validateAssignments } from "@/lib/server/validate";
import { handleRouteError, jsonError, readJson } from "@/lib/server/http";

export const runtime = "nodejs";

// GET /api/assignments -> all of the signed-in user's assignments + tasks.
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    return NextResponse.json({ assignments: await listAssignments(user.id) });
  } catch (error) {
    return handleRouteError(error, "GET /api/assignments");
  }
}

// POST /api/assignments  body: { assignments: [...] }  (the /api/syllabus output)
export async function POST(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const parsed = await readJson(request);
  if (parsed.response) return parsed.response;

  const result = validateAssignments(parsed.body);
  if (!result.ok) return jsonError(result.error);

  try {
    await ensureProfile(user);
    const assignments = await saveAssignments(user.id, result.value);
    return NextResponse.json({ assignments }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/assignments");
  }
}

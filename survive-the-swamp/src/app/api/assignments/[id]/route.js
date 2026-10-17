import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { deleteAssignment } from "@/lib/server/store";
import { UUID_RE, handleRouteError, jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

// DELETE /api/assignments/:id  (its tasks are deleted with it)
export async function DELETE(_request, { params }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Assignment not found.", 404);

  try {
    const deleted = await deleteAssignment(user.id, id);
    if (!deleted) return jsonError("Assignment not found.", 404);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/assignments/[id]");
  }
}

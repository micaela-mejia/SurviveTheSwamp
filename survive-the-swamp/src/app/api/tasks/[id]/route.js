import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getInventory, setTaskCompleted } from "@/lib/server/store";
import { validateCompleted } from "@/lib/server/validate";
import { UUID_RE, handleRouteError, jsonError, readJson } from "@/lib/server/http";

export const runtime = "nodejs";

// PATCH /api/tasks/:id  body: { completed: boolean }
// -> { task, reward, inventory }. `reward` is set only the first time a task
// is completed, so un-checking and re-checking can't farm resources.
export async function PATCH(request, { params }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Task not found.", 404);

  const parsed = await readJson(request);
  if (parsed.response) return parsed.response;
  const result = validateCompleted(parsed.body);
  if (!result.ok) return jsonError(result.error);

  try {
    const task = await setTaskCompleted(user.id, id, result.value);
    if (!task) return jsonError("Task not found.", 404);
    const inventory = await getInventory(user.id);
    return NextResponse.json({
      task: { id: task.id, completed: task.completed },
      reward: task.reward,
      inventory,
    });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/tasks/[id]");
  }
}

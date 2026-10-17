import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabase } from "./supabase.js";
import { DatabaseError } from "./errors.js";

// ALL database access lives in this file. Every query filters by userId
// (the Auth0 "sub"), because the service-role key bypasses row-level security.

function check({ data, error }, what) {
  if (error) {
    throw new DatabaseError(`${what} failed.`, { code: error.code, message: error.message });
  }
  return data;
}

export function toTask(row) {
  return {
    id: row.id,
    title: row.title,
    minutes: row.minutes,
    position: row.position,
    completed: row.completed,
    completedAt: row.completed_at,
  };
}

export function toAssignment(row) {
  return {
    id: row.id,
    course: row.course ?? "",
    title: row.title,
    dueDate: row.due_date, // "YYYY-MM-DD" or null
    dueDateRaw: row.due_date_raw, // text as the syllabus wrote it
    tasks: (row.tasks ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(toTask),
  };
}

export async function ensureProfile(user) {
  const res = await getSupabase()
    .from("profiles")
    .upsert({ user_id: user.id, email: user.email }, { onConflict: "user_id" });
  check(res, "Creating profile");
}

export async function getInventory(userId) {
  const res = await getSupabase()
    .from("profiles")
    .select("driftwood, rope, canvas")
    .eq("user_id", userId)
    .maybeSingle();
  const row = check(res, "Loading inventory");
  return {
    driftwood: row?.driftwood ?? 0,
    rope: row?.rope ?? 0,
    canvas: row?.canvas ?? 0,
  };
}

export async function listAssignments(userId) {
  const res = await getSupabase()
    .from("assignments")
    .select("*, tasks(*)")
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });
  return check(res, "Loading assignments").map(toAssignment);
}

export async function saveAssignments(userId, items) {
  const supabase = getSupabase();
  const assignmentRows = [];
  const taskRows = [];

  items.forEach((item, i) => {
    const id = randomUUID();
    assignmentRows.push({
      id,
      user_id: userId,
      course: item.course,
      title: item.title,
      due_date: item.dueDate,
      due_date_raw: item.dueDateRaw,
      position: i,
    });
    item.tasks.forEach((task, j) => {
      taskRows.push({
        id: randomUUID(),
        assignment_id: id,
        user_id: userId,
        title: task.title,
        minutes: task.minutes,
        position: j,
      });
    });
  });

  check(await supabase.from("assignments").insert(assignmentRows), "Saving assignments");

  if (taskRows.length > 0) {
    const res = await supabase.from("tasks").insert(taskRows);
    if (res.error) {
      // Best-effort rollback so we never keep assignments without their tasks.
      await supabase
        .from("assignments")
        .delete()
        .eq("user_id", userId)
        .in("id", assignmentRows.map((r) => r.id));
      throw new DatabaseError("Saving tasks failed.", {
        code: res.error.code,
        message: res.error.message,
      });
    }
  }

  return assignmentRows.map((row) =>
    toAssignment({
      ...row,
      tasks: taskRows
        .filter((t) => t.assignment_id === row.id)
        .map((t) => ({ ...t, completed: false, completed_at: null })),
    }),
  );
}

export async function deleteAssignment(userId, assignmentId) {
  const res = await getSupabase()
    .from("assignments")
    .delete()
    .eq("user_id", userId)
    .eq("id", assignmentId)
    .select("id");
  return check(res, "Deleting assignment").length > 0;
}

// Atomic in Postgres (see supabase/schema.sql). Returns null if the task does
// not exist or belongs to someone else. `reward` is "driftwood" | "rope" |
// "canvas" the FIRST time a task is completed, otherwise null.
export async function setTaskCompleted(userId, taskId, completed) {
  const res = await getSupabase().rpc("set_task_completed", {
    p_user: userId,
    p_task: taskId,
    p_done: completed,
  });
  const rows = check(res, "Updating task");
  if (!rows?.length) return null;
  return {
    id: rows[0].out_task_id,
    completed: rows[0].out_completed,
    reward: rows[0].out_reward,
  };
}

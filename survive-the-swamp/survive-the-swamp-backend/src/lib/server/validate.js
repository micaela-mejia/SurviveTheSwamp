import { parseDueDate } from "./dates.js";

// Validates + normalizes the body of POST /api/assignments. The expected input
// is exactly what /api/syllabus returns: { assignments: [{ course, title,
// dueDate, checklist: [string | { title, minutes }] }] }. Pure.

export const LIMITS = { assignments: 50, tasks: 30, title: 300, course: 120, due: 100 };

function str(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validateAssignments(body, today = new Date()) {
  const list = body?.assignments;
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, error: "Send a non-empty 'assignments' array." };
  }
  if (list.length > LIMITS.assignments) {
    return { ok: false, error: `Send at most ${LIMITS.assignments} assignments at a time.` };
  }

  const value = [];
  for (const [i, item] of list.entries()) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: `Assignment ${i + 1} must be an object.` };
    }
    const title = str(item.title, LIMITS.title);
    if (!title) return { ok: false, error: `Assignment ${i + 1} needs a title.` };

    const checklist = item.checklist ?? item.tasks ?? [];
    if (!Array.isArray(checklist) || checklist.length > LIMITS.tasks) {
      return { ok: false, error: `Assignment ${i + 1} needs a checklist of at most ${LIMITS.tasks} items.` };
    }

    const tasks = [];
    for (const entry of checklist) {
      const taskTitle = str(typeof entry === "string" ? entry : entry?.title, LIMITS.title);
      if (!taskTitle) continue; // skip blanks instead of failing the whole save
      const m = typeof entry === "object" ? entry?.minutes : null;
      const minutes = Number.isInteger(m) && m >= 1 && m <= 180 ? m : null;
      tasks.push({ title: taskTitle, minutes });
    }

    const dueDateRaw = str(item.dueDateRaw ?? item.dueDate, LIMITS.due) || null;
    const dueDate = parseDueDate(item.dueDate, today) ?? parseDueDate(item.dueDateRaw, today);

    value.push({
      course: str(item.course, LIMITS.course) || null,
      title,
      dueDateRaw,
      dueDate,
      tasks,
    });
  }
  return { ok: true, value };
}

export function validateCompleted(body) {
  return typeof body?.completed === "boolean"
    ? { ok: true, value: body.completed }
    : { ok: false, error: "Send { \"completed\": true | false }." };
}

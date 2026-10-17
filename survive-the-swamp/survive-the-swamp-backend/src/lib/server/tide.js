// The "Academic Water Level". Pure: no imports.
//
// pressure = sum over assignments due within 7 days (or overdue) of
//            unfinishedTasks * urgency
// urgency  = 1 (due in 7 days) rising to 2 (due today); overdue = 2
// level    = 100 * (1 - e^(-pressure / 20))   -> 0..100, saturates smoothly

const DAY = 86400000;
const WINDOW_DAYS = 7;

export function daysUntil(dueDate, today = new Date()) {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due - now) / DAY);
}

export function raftState(level) {
  if (level < 25) return "calm";
  if (level < 50) return "choppy";
  if (level < 75) return "storm";
  return "sinking";
}

export function computeTide(assignments, today = new Date()) {
  let pressure = 0;
  const upcoming = [];

  for (const a of assignments) {
    if (!a.dueDate) continue;
    const remaining = (a.tasks ?? []).filter((t) => !t.completed).length;
    if (remaining === 0) continue;
    const daysLeft = daysUntil(a.dueDate, today);
    if (daysLeft > WINDOW_DAYS) continue;

    const urgency = daysLeft < 0 ? 2 : 1 + (WINDOW_DAYS - daysLeft) / WINDOW_DAYS;
    pressure += remaining * urgency;
    upcoming.push({
      assignmentId: a.id,
      title: a.title,
      course: a.course,
      dueDate: a.dueDate,
      daysLeft,
      remaining,
    });
  }

  upcoming.sort((x, y) => x.daysLeft - y.daysLeft);
  const level = Math.round(100 * (1 - Math.exp(-pressure / 20)));
  return {
    level,
    state: raftState(level),
    pressure: Math.round(pressure * 10) / 10,
    upcoming,
  };
}

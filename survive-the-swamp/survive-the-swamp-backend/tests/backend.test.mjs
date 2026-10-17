import test from "node:test";
import assert from "node:assert/strict";
import { parseDueDate } from "../src/lib/server/dates.js";
import { computeTide, daysUntil, raftState } from "../src/lib/server/tide.js";
import { validateAssignments, validateCompleted } from "../src/lib/server/validate.js";

const TODAY = new Date(2026, 9, 17); // Oct 17, 2026 (local)

test("parseDueDate handles common syllabus formats", () => {
  assert.equal(parseDueDate("October 15, 2026", TODAY), "2026-10-15");
  assert.equal(parseDueDate("Oct 15", TODAY), "2026-10-15"); // recent past stays this year
  assert.equal(parseDueDate("Jan 15", TODAY), "2027-01-15"); // far past -> next year
  assert.equal(parseDueDate("10/22", TODAY), "2026-10-22");
  assert.equal(parseDueDate("10/22/26", TODAY), "2026-10-22");
  assert.equal(parseDueDate("2026-11-03", TODAY), "2026-11-03");
  assert.equal(parseDueDate("Nov 3rd at 11:59pm", TODAY), "2026-11-03");
  assert.equal(parseDueDate("3 December 2026", TODAY), "2026-12-03");
  assert.equal(parseDueDate("Sept. 30", TODAY), "2026-09-30");
});

test("parseDueDate returns null for vague or invalid dates", () => {
  assert.equal(parseDueDate("Not specified", TODAY), null);
  assert.equal(parseDueDate("Week 5", TODAY), null);
  assert.equal(parseDueDate("TBD", TODAY), null);
  assert.equal(parseDueDate("Feb 30, 2026", TODAY), null);
  assert.equal(parseDueDate("", TODAY), null);
  assert.equal(parseDueDate(undefined, TODAY), null);
});

test("daysUntil and raftState", () => {
  assert.equal(daysUntil("2026-10-20", TODAY), 3);
  assert.equal(daysUntil("2026-10-15", TODAY), -2);
  assert.equal(raftState(0), "calm");
  assert.equal(raftState(30), "choppy");
  assert.equal(raftState(60), "storm");
  assert.equal(raftState(90), "sinking");
});

test("computeTide: empty and fully completed work is calm", () => {
  assert.deepEqual(computeTide([], TODAY), { level: 0, state: "calm", pressure: 0, upcoming: [] });
  const done = [{ id: "a", title: "A", dueDate: "2026-10-18", tasks: [{ completed: true }] }];
  assert.equal(computeTide(done, TODAY).level, 0);
});

test("computeTide: only counts work due within 7 days or overdue", () => {
  const tide = computeTide(
    [
      { id: "soon", title: "Soon", course: "X", dueDate: "2026-10-20", tasks: [{ completed: true }, { completed: false }, { completed: false }, { completed: false }] },
      { id: "late", title: "Late", course: "X", dueDate: "2026-10-15", tasks: [{ completed: false }, { completed: false }] },
      { id: "far", title: "Far", course: "X", dueDate: "2026-12-01", tasks: [{ completed: false }] },
      { id: "nodate", title: "No date", course: "X", dueDate: null, tasks: [{ completed: false }] },
    ],
    TODAY,
  );
  assert.deepEqual(tide.upcoming.map((u) => u.assignmentId), ["late", "soon"]);
  assert.equal(tide.pressure, 8.7); // 3 * 1.571 + 2 * 2
  assert.equal(tide.level, 35);
  assert.equal(tide.state, "choppy");
});

test("validateAssignments normalizes the /api/syllabus output", () => {
  const result = validateAssignments(
    {
      assignments: [
        { course: " BIO 101 ", title: " Lab report ", dueDate: "Nov 3rd", checklist: ["Outline", "  ", "Draft", { title: "Edit", minutes: 20 }] },
        { course: "", title: "Final", dueDate: "Not specified", checklist: [] },
      ],
    },
    TODAY,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value[0].course, "BIO 101");
  assert.equal(result.value[0].title, "Lab report");
  assert.equal(result.value[0].dueDate, "2026-11-03");
  assert.equal(result.value[0].dueDateRaw, "Nov 3rd");
  assert.deepEqual(result.value[0].tasks, [
    { title: "Outline", minutes: null },
    { title: "Draft", minutes: null },
    { title: "Edit", minutes: 20 },
  ]);
  assert.equal(result.value[1].course, null);
  assert.equal(result.value[1].dueDate, null);
});

test("validateAssignments rejects bad input", () => {
  assert.equal(validateAssignments({}).ok, false);
  assert.equal(validateAssignments({ assignments: [] }).ok, false);
  assert.equal(validateAssignments({ assignments: [{ title: "" , checklist: [] }] }).ok, false);
  assert.equal(validateAssignments({ assignments: [{ title: "A", checklist: "nope" }] }).ok, false);
  const many = Array.from({ length: 51 }, () => ({ title: "A", checklist: [] }));
  assert.equal(validateAssignments({ assignments: many }).ok, false);
});

test("validateCompleted", () => {
  assert.equal(validateCompleted({ completed: true }).ok, true);
  assert.equal(validateCompleted({ completed: "yes" }).ok, false);
  assert.equal(validateCompleted(null).ok, false);
});

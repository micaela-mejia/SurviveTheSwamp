"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const MAX_SYLLABUS_LENGTH = 30_000;

async function readApiResponse(response, fallbackMessage) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ? result.error : fallbackMessage,
    );
  }

  return result;
}

function normalizeSavedAssignments(items) {
  if (
    !Array.isArray(items) ||
    !items.every(
      (assignment) =>
        assignment &&
        typeof assignment.id === "string" &&
        typeof assignment.title === "string" &&
        Array.isArray(assignment.tasks) &&
        assignment.tasks.every(
          (task) =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.completed === "boolean",
        ),
    )
  ) {
    throw new Error("The server returned an unexpected assignment list.");
  }

  return items.map((assignment) => ({
    ...assignment,
    course: assignment.course ?? "",
    dueDate:
      assignment.dueDateRaw || assignment.dueDate || "Not specified",
  }));
}

export default function SyllabusForm() {
  const [syllabusText, setSyllabusText] = useState("");
  const [assignments, setAssignments] = useState(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSavedAssignments, setIsLoadingSavedAssignments] =
    useState(true);
  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set());
  const [isCelebrationDismissed, setIsCelebrationDismissed] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState({ id: 0, x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;

    async function loadSavedAssignments() {
      try {
        const response = await fetch("/api/assignments");
        const result = await readApiResponse(
          response,
          "Could not load your saved assignments.",
        );
        const savedAssignments = normalizeSavedAssignments(result.assignments);

        if (!cancelled) {
          setAssignments(savedAssignments.length ? savedAssignments : null);
          const savedTasks = savedAssignments.flatMap(
            (assignment) => assignment.tasks,
          );
          setIsCelebrationDismissed(
            savedTasks.length > 0 && savedTasks.every((task) => task.completed),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your saved assignments.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingSavedAssignments(false);
      }
    }

    loadSavedAssignments();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalTasks =
    assignments?.reduce(
      (total, assignment) => total + assignment.tasks.length,
      0,
    ) ?? 0;

  const allTasksComplete =
    totalTasks > 0 &&
    (assignments ?? []).every((assignment) =>
      assignment.tasks.every((task) => task.completed),
    );

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage("");
    setError("");
    setIsLoading(true);

    try {
      const analysisResponse = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusText }),
      });
      const result = await readApiResponse(
        analysisResponse,
        "The syllabus could not be analyzed. Please try again.",
      );

      if (
        !Array.isArray(result.assignments) ||
        !result.assignments.every(
          (assignment) =>
            assignment &&
            typeof assignment.course === "string" &&
            typeof assignment.title === "string" &&
            typeof assignment.dueDate === "string" &&
            Array.isArray(assignment.checklist) &&
            assignment.checklist.every((item) => typeof item === "string"),
        )
      ) {
        throw new Error("The server returned an unexpected analysis response.");
      }

      if (result.assignments.length === 0) {
        setStatusMessage("No assignments were identified in that syllabus.");
        return;
      }

      const saveResponse = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: result.assignments }),
      });
      const savedResult = await readApiResponse(
        saveResponse,
        "The analysis succeeded, but the assignments could not be saved.",
      );
      const savedAssignments = normalizeSavedAssignments(
        savedResult.assignments,
      );

      setAssignments((current) => [...(current ?? []), ...savedAssignments]);
      setStatusMessage(
        `Added ${savedAssignments.length} ${
          savedAssignments.length === 1 ? "assignment" : "assignments"
        } to your saved plan.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The syllabus could not be analyzed and saved. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleChecklistItem(assignmentId, task, event) {
    if (pendingTaskIds.has(task.id)) return;

    const completed = !task.completed;
    const checkbox = event.currentTarget.getBoundingClientRect();
    setPendingTaskIds((current) => new Set(current).add(task.id));
    setError("");
    setStatusMessage("");

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      const result = await readApiResponse(
        response,
        "Could not save that checklist update.",
      );

      if (
        result.task?.id !== task.id ||
        typeof result.task.completed !== "boolean"
      ) {
        throw new Error("The server returned an unexpected task update.");
      }

      setAssignments((current) =>
        current?.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                tasks: assignment.tasks.map((currentTask) =>
                  currentTask.id === task.id
                    ? { ...currentTask, completed: result.task.completed }
                    : currentTask,
                ),
              }
            : assignment,
        ),
      );
      setIsCelebrationDismissed(false);

      if (result.task.completed && !task.completed) {
        setConfettiBurst((current) => ({
          id: current.id + 1,
          x: checkbox.left + checkbox.width / 2,
          y: checkbox.top + checkbox.height / 2,
        }));
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not save that checklist update.",
      );
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  }

  return (
    <main className="syllabus-page">
      <Link
        aria-label="Survive the Swamp home"
        className="syllabus-logo"
        href="/"
      >
        <span
          aria-label="Survive the Swamp alligator logo. Hover or focus to make it chomp."
          className="syllabus-gator"
          role="img"
          tabIndex={0}
        >
          <Image
            alt=""
            className="syllabus-gator-art syllabus-gator-open"
            fill
            sizes="180px"
            src="/artwork/gator-open-clean.png"
          />
          <Image
            alt=""
            className="syllabus-gator-art syllabus-gator-closed"
            fill
            sizes="180px"
            src="/artwork/gator-closed-clean.png"
          />
        </span>
      </Link>
      <Link className="syllabus-logout" href="/auth/logout">
        Log out
      </Link>

      <header className="syllabus-header">
        <h1>
          <span>Conquer your syllabus</span>
          <span>Before it conquers you.</span>
        </h1>
        <p>
          Paste your syllabus below and we&apos;ll break it into manageable
          assignments.
        </p>
      </header>

      <section aria-label="Enter your syllabus" className="syllabus-cloud">
        <Image
          alt=""
          className="syllabus-cloud-art"
          fill
          sizes="(max-width: 700px) 100vw, 760px"
          src="/artwork/login-cloud-clean.png"
        />
        <form className="syllabus-cloud-content" onSubmit={handleSubmit}>
          <textarea
            aria-label="Syllabus text"
            className="syllabus-input"
            id="syllabus-text"
            maxLength={MAX_SYLLABUS_LENGTH}
            onChange={(event) => setSyllabusText(event.target.value)}
            placeholder="Paste or type the relevant syllabus text here..."
            required
            value={syllabusText}
          />
          <div className="syllabus-form-footer">
            <p className="syllabus-character-count">
              {syllabusText.length.toLocaleString()} /{" "}
              {MAX_SYLLABUS_LENGTH.toLocaleString()}
            </p>
            <button
              className="syllabus-submit"
              disabled={
                isLoading ||
                isLoadingSavedAssignments ||
                !syllabusText.trim()
              }
              type="submit"
            >
              {isLoadingSavedAssignments
                ? "Loading saved plan..."
                : isLoading
                  ? "Analyzing..."
                  : assignments !== null
                    ? "Add to assignment plan"
                    : "Break down syllabus"}
            </button>
          </div>
        </form>
      </section>

      {assignments !== null && (
        <section
          aria-live="polite"
          aria-label="Assignment breakdowns"
          className="syllabus-results"
        >
          {assignments.length === 0 ? (
            <p className="syllabus-empty">
              No assignments could be identified in the supplied text.
            </p>
          ) : (
            <ul className="syllabus-assignment-list">
              {assignments.map((assignment) => (
                <li className="syllabus-assignment" key={assignment.id}>
                  <div className="syllabus-assignment-heading">
                    <div>
                      {assignment.course ? (
                        <p className="syllabus-course">{assignment.course}</p>
                      ) : null}
                      <h2>{assignment.title}</h2>
                    </div>
                    <p className="syllabus-due-date">Due: {assignment.dueDate}</p>
                  </div>
                  {assignment.tasks.length > 0 ? (
                    <ul className="syllabus-checklist">
                      {assignment.tasks.map((task) => (
                        <li key={task.id}>
                          <label>
                            <input
                              checked={task.completed}
                              disabled={pendingTaskIds.has(task.id)}
                              onChange={(event) =>
                                toggleChecklistItem(
                                  assignment.id,
                                  task,
                                  event,
                                )
                              }
                              type="checkbox"
                            />
                            <span
                              className={
                                task.completed
                                  ? "syllabus-checklist-complete"
                                  : ""
                              }
                            >
                              {task.title}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="syllabus-no-checklist">
                      No checklist steps were provided for this assignment.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button
            className="syllabus-start-over"
            onClick={() => {
              setSyllabusText("");
              setError("");
              setStatusMessage("");
            }}
            type="button"
          >
            Clear syllabus text
          </button>
        </section>
      )}

      {error ? (
        <p className="syllabus-error" role="alert">
          {error}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="syllabus-status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {confettiBurst.id > 0 ? (
        <span
          aria-hidden="true"
          className="syllabus-checklist-confetti"
          key={confettiBurst.id}
          style={{ left: confettiBurst.x, top: confettiBurst.y }}
        >
          {Array.from({ length: 10 }, (_, index) => (
            <span className="syllabus-checklist-confetti-piece" key={index} />
          ))}
        </span>
      ) : null}

      {allTasksComplete && !isCelebrationDismissed ? (
        <div className="syllabus-celebration-backdrop">
          <section
            aria-labelledby="syllabus-celebration-title"
            aria-modal="true"
            className="syllabus-celebration-dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsCelebrationDismissed(true);
              }
            }}
            role="dialog"
          >
            <button
              aria-label="Close celebration"
              autoFocus
              className="syllabus-celebration-close"
              onClick={() => setIsCelebrationDismissed(true)}
              type="button"
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <div aria-hidden="true" className="syllabus-celebration-gator">
              <Image
                alt=""
                className="syllabus-celebration-gator-art"
                fill
                sizes="(max-width: 640px) 160px, 220px"
                src="/artwork/gator-open-clean.png"
              />
            </div>
            <h2 id="syllabus-celebration-title">You survived the swamp!</h2>
          </section>
        </div>
      ) : null}

      <p className="syllabus-privacy-note">
        Your syllabus text is sent to Gemini for analysis. Don&apos;t include
        sensitive information that isn&apos;t needed for this task.
      </p>
    </main>
  );
}

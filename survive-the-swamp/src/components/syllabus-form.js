"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const MAX_SYLLABUS_LENGTH = 30_000;

export default function SyllabusForm() {
  const [syllabusText, setSyllabusText] = useState("");
  const [assignments, setAssignments] = useState(null);
  const [completedItems, setCompletedItems] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCelebrationDismissed, setIsCelebrationDismissed] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState({ id: 0, x: 0, y: 0 });
  const totalTasks =
    assignments?.reduce(
      (total, assignment) => total + assignment.checklist.length,
      0,
    ) ?? 0;

  const allTasksComplete =
    totalTasks > 0 &&
    (assignments ?? []).every((assignment, assignmentIndex) =>
      assignment.checklist.every((_, itemIndex) =>
        Boolean(completedItems[`${assignmentIndex}-${itemIndex}`]),
      ),
    );

  async function handleSubmit(event) {
    event.preventDefault();
    setAssignments(null);
    setCompletedItems({});
    setIsCelebrationDismissed(false);
    setError("");
    setIsLoading(true);

    let response;
    try {
      response = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusText }),
      });
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setIsLoading(false);
      return;
    }

    let result;
    try {
      result = await response.json();
    } catch {
      setError("The server returned an unreadable response. Please try again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    if (!response.ok) {
      setError(
        typeof result.error === "string"
          ? result.error
          : "The syllabus could not be analyzed. Please try again.",
      );
      return;
    }

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
      setError("The server returned an unexpected response. Please try again.");
      return;
    }

    setAssignments(result.assignments);
  }

  function toggleChecklistItem(itemId, event) {
    if (!completedItems[itemId]) {
      const checkbox = event.currentTarget.getBoundingClientRect();
      setConfettiBurst((current) => ({
        id: current.id + 1,
        x: checkbox.left + checkbox.width / 2,
        y: checkbox.top + checkbox.height / 2,
      }));
    }

    setIsCelebrationDismissed(false);
    setCompletedItems((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
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
              disabled={isLoading || !syllabusText.trim()}
              type="submit"
            >
              {isLoading
                ? "Analyzing..."
                : assignments !== null
                  ? "Update assignment plan"
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
              {assignments.map((assignment, assignmentIndex) => (
                <li
                  className="syllabus-assignment"
                  key={`${assignment.course}-${assignment.title}-${assignmentIndex}`}
                >
                  <div className="syllabus-assignment-heading">
                    <div>
                      {assignment.course ? (
                        <p className="syllabus-course">{assignment.course}</p>
                      ) : null}
                      <h2>{assignment.title}</h2>
                    </div>
                    <p className="syllabus-due-date">Due: {assignment.dueDate}</p>
                  </div>
                  {assignment.checklist.length > 0 ? (
                    <ul className="syllabus-checklist">
                      {assignment.checklist.map((item, itemIndex) => {
                        const itemId = `${assignmentIndex}-${itemIndex}`;
                        return (
                          <li key={itemId}>
                            <label>
                              <input
                                checked={Boolean(completedItems[itemId])}
                                onChange={(event) =>
                                  toggleChecklistItem(itemId, event)
                                }
                                type="checkbox"
                              />
                              <span
                                className={
                                  completedItems[itemId]
                                    ? "syllabus-checklist-complete"
                                    : ""
                                }
                              >
                                {item}
                              </span>
                            </label>
                          </li>
                        );
                      })}
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
              setAssignments(null);
              setCompletedItems({});
              setIsCelebrationDismissed(false);
              setError("");
            }}
            type="button"
          >
            Enter a different syllabus
          </button>
        </section>
      )}

      {error ? (
        <p className="syllabus-error" role="alert">
          {error}
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

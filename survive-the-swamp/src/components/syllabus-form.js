"use client";

import { useState } from "react";

const MAX_SYLLABUS_LENGTH = 30_000;

export default function SyllabusForm() {
  const [syllabusText, setSyllabusText] = useState("");
  const [breakdown, setBreakdown] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBreakdown("");
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

    if (typeof result.breakdown !== "string") {
      setError("The server returned an unexpected response. Please try again.");
      return;
    }

    setBreakdown(result.breakdown);
  }

  return (
    <section className="mt-10 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
      <form onSubmit={handleSubmit}>
        <label
          className="block text-base font-semibold"
          htmlFor="syllabus-text"
        >
          Syllabus text
        </label>
        <textarea
          className="mt-3 min-h-64 w-full resize-y rounded-xl border border-slate-300 p-4 text-base leading-7 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          id="syllabus-text"
          maxLength={MAX_SYLLABUS_LENGTH}
          onChange={(event) => setSyllabusText(event.target.value)}
          placeholder="Paste the relevant syllabus text here..."
          required
          value={syllabusText}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {syllabusText.length.toLocaleString()} /{" "}
            {MAX_SYLLABUS_LENGTH.toLocaleString()} characters
          </p>
          <button
            className="rounded-full bg-emerald-800 px-6 py-3 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !syllabusText.trim()}
            type="submit"
          >
            {isLoading ? "Analyzing..." : "Break down syllabus"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {breakdown ? (
        <section className="mt-8 border-t border-slate-200 pt-6" aria-live="polite">
          <h2 className="text-xl font-semibold">Your study plan</h2>
          <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-5 leading-7 text-slate-800">
            {breakdown}
          </div>
        </section>
      ) : null}
    </section>
  );
}

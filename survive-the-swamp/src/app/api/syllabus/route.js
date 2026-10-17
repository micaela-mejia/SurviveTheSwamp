import { NextResponse } from "next/server";
import {
  GeminiConfigurationError,
  GeminiServiceError,
  generateAssignmentChecklist,
} from "@/lib/server/gemini";
import { requireUser } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const MAX_SYLLABUS_LENGTH = 30_000;
const RATE_LIMIT = 10; // analyses per user per hour (protects the Gemini quota)

export async function POST(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = rateLimit(`syllabus:${user.id}`, RATE_LIMIT, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many syllabus analyses. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }
    throw error;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  const { syllabusText } = body;
  if (typeof syllabusText !== "string" || !syllabusText.trim()) {
    return NextResponse.json(
      { error: "Provide syllabus text to analyze." },
      { status: 400 },
    );
  }

  if (syllabusText.length > MAX_SYLLABUS_LENGTH) {
    return NextResponse.json(
      { error: `Syllabus text must be ${MAX_SYLLABUS_LENGTH} characters or fewer.` },
      { status: 413 },
    );
  }

  try {
    const assignments = await generateAssignmentChecklist(syllabusText);
    return NextResponse.json({ assignments });
  } catch (error) {
    if (error instanceof GeminiConfigurationError) {
      return NextResponse.json(
        { error: "Gemini is not configured. Add GEMINI_API_KEY to .env.local and restart the server." },
        { status: 503 },
      );
    }

    if (error instanceof GeminiServiceError) {
      console.error("Syllabus parsing failed:", {
        message: error.message,
        ...error.details,
      });
      return NextResponse.json(
        { error: "Gemini could not analyze the syllabus. Please try again." },
        { status: 502 },
      );
    }

    throw error;
  }
}

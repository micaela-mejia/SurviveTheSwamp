import { NextResponse } from "next/server";
import {
  GeminiConfigurationError,
  GeminiServiceError,
  generateSyllabusBreakdown,
} from "@/lib/server/gemini";

export const runtime = "nodejs";

const MAX_SYLLABUS_LENGTH = 30_000;

export async function POST(request) {
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
    const breakdown = await generateSyllabusBreakdown(syllabusText);
    return NextResponse.json({ breakdown });
  } catch (error) {
    if (error instanceof GeminiConfigurationError) {
      return NextResponse.json(
        { error: "Gemini is not configured. Add GEMINI_API_KEY to .env.local and restart the server." },
        { status: 503 },
      );
    }

    if (error instanceof GeminiServiceError) {
      return NextResponse.json(
        { error: "Gemini could not analyze the syllabus. Please try again." },
        { status: 502 },
      );
    }

    throw error;
  }
}

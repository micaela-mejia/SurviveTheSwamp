import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { ensureProfile, getInventory } from "@/lib/server/store";
import { handleRouteError } from "@/lib/server/http";

export const runtime = "nodejs";

// GET /api/me -> who is signed in + their raft inventory.
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    await ensureProfile(user);
    const inventory = await getInventory(user.id);
    return NextResponse.json({
      user: { name: user.name, email: user.email },
      inventory,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/me");
  }
}

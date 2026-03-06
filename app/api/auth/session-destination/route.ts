import { NextResponse } from "next/server";

import { getCurrentSession, getSessionDestination } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();
  const destination = session ? getSessionDestination(session.role) : "/login";

  return NextResponse.json(
    { destination },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}


import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { getMarzbanAdapter } from "@/server/services/marzban";

function toSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error.";
}

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        ok: false,
      },
      { status: 401 }
    );
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "Forbidden",
        ok: false,
      },
      { status: 403 }
    );
  }

  try {
    const adapter = getMarzbanAdapter();
    await adapter.healthCheck();

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      ok: true,
      provider: "MARZBAN",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: toSafeErrorMessage(error),
        ok: false,
        provider: "MARZBAN",
      },
      { status: 503 }
    );
  }
}

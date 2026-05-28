import { NextResponse } from "next/server";

import { buildSingBoxSplitConfig, loadVlessProfile } from "@/lib/split-subscription-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ subId: string }> }) {
  try {
    const { subId } = await context.params;
    const profile = await loadVlessProfile(subId);

    return NextResponse.json(buildSingBoxSplitConfig(profile), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="pulsar-sing-box-${subId}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to build split config." },
      { status: 404 }
    );
  }
}

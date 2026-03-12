import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusQuerySchema = z.object({
  paymentRequestId: z.string().trim().min(1),
});

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: {
      username: session.username,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = statusQuerySchema.safeParse({
    paymentRequestId: searchParams.get("paymentRequestId") ?? "",
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Некорректный идентификатор платежа." }, { status: 400 });
  }

  const paymentRequest = await prisma.paymentRequest.findFirst({
    select: {
      approvedAt: true,
      id: true,
      plategaStatus: true,
      rejectedAt: true,
      status: true,
    },
    where: {
      id: parsedQuery.data.paymentRequestId,
      userId: user.id,
    },
  });

  if (!paymentRequest) {
    return NextResponse.json({ error: "Платеж не найден." }, { status: 404 });
  }

  const isFinal = paymentRequest.status === "APPROVED" || paymentRequest.status === "REJECTED";

  return NextResponse.json({
    approvedAt: paymentRequest.approvedAt?.toISOString() ?? null,
    isFinal,
    paymentRequestId: paymentRequest.id,
    plategaStatus: paymentRequest.plategaStatus ?? null,
    rejectedAt: paymentRequest.rejectedAt?.toISOString() ?? null,
    status: paymentRequest.status,
  });
}

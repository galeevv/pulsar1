import { prisma } from "@/lib/prisma";

import { ensureBootstrapData } from "./auth";

export async function getAppPaymentsData(username: string) {
  await ensureBootstrapData();

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username },
  });

  if (!user) {
    return null;
  }

  const [openPaymentRequest, paymentRequests] = await Promise.all([
    prisma.paymentRequest.findFirst({
      orderBy: { createdAt: "desc" },
      where: {
        status: {
          in: ["CREATED", "MARKED_PAID"],
        },
        userId: user.id,
      },
    }),
    prisma.paymentRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      where: { userId: user.id },
    }),
  ]);

  return {
    openPaymentRequest,
    paymentRequests,
  };
}

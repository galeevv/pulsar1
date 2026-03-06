import { prisma } from "@/lib/prisma";

export async function getAdminTariffs() {
  return prisma.tariff.findMany({
    orderBy: [{ isEnabled: "desc" }, { createdAt: "desc" }],
  });
}

export async function getActiveTariffs() {
  return prisma.tariff.findMany({
    orderBy: [{ priceRub: "asc" }, { devicePriceRub: "asc" }, { createdAt: "asc" }],
    where: { isEnabled: true },
  });
}

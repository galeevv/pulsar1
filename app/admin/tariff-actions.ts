"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function buildRedirectUrl(params: {
  anchor: string;
  error?: string;
  notice?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.notice) {
    searchParams.set("notice", params.notice);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();
  return `/admin${query ? `?${query}` : ""}${params.anchor}`;
}

async function ensureAdminActor() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }
}

export async function archiveTariffAction(formData: FormData) {
  await ensureAdminActor();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect(buildRedirectUrl({ anchor: "#tariffs", error: "Тариф не найден." }));
  }

  await prisma.tariff.update({
    data: { isEnabled: false },
    where: { id },
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  redirect(buildRedirectUrl({ anchor: "#tariffs", notice: "Тариф архивирован." }));
}

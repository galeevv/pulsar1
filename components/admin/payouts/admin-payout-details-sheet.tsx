"use client";

import Link from "next/link";
import { BanknoteArrowDown, Building2, CircleUserRound, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";

import {
  approvePayoutRequestAction,
  markPayoutRequestPaidAction,
  rejectPayoutRequestAction,
} from "@/app/admin/payout-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminPayoutRow } from "@/lib/admin/admin-payouts-types";

import {
  formatCredits,
  formatNullableText,
  formatPayoutDateTime,
  formatRub,
  getPayoutStatusVariant,
} from "./admin-payouts-presenters";

function SectionCard({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <section className="rounded-card border border-border/70 bg-background/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-background/60">
          <Icon className="size-4 text-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {children}
    </section>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-foreground">{value}</span>
    </div>
  );
}

function parsePayoutDetailsSnapshot(snapshot: string | null | undefined) {
  const raw = (snapshot ?? "").trim();
  if (!raw) {
    return {
      bank: null,
      destination: null,
      raw: "",
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      bank?: string;
      destination?: string;
      payoutDestination?: string;
    };

    const bank = parsed.bank?.trim() || null;
    const destination = parsed.destination?.trim() || parsed.payoutDestination?.trim() || null;

    if (bank || destination) {
      return { bank, destination, raw };
    }
  } catch {
    // Ignore JSON parse errors and continue with text parsing.
  }

  const bankMatch = raw.match(/Банк:\s*(.+)/i);
  const destinationMatch = raw.match(/(?:Телефон или карта|Реквизиты):\s*(.+)/i);

  return {
    bank: bankMatch?.[1]?.trim() ?? null,
    destination: destinationMatch?.[1]?.trim() ?? null,
    raw,
  };
}

function mapPayoutStatusLabelRu(status: AdminPayoutRow["status"]) {
  if (status === "pending") {
    return "На проверке";
  }

  if (status === "approved") {
    return "Одобрена";
  }

  if (status === "rejected") {
    return "Отклонена";
  }

  if (status === "paid") {
    return "Выплачена";
  }

  return "Отменена";
}

export function AdminPayoutDetailsSheet({
  onOpenChange,
  open,
  payout,
  redirectPath,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  payout: AdminPayoutRow | null;
  redirectPath: string;
}) {
  const payoutDetails = parsePayoutDetailsSnapshot(payout?.details.payoutDetailsSnapshot);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Детали заявки на вывод</DialogTitle>
          <DialogDescription>
            Просмотр заявки и доступные действия администратора.
          </DialogDescription>
        </DialogHeader>

        {payout ? (
          <div className="space-y-3">
            <section className="rounded-card border border-border/70 bg-background/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                    <BanknoteArrowDown className="size-5 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Сумма заявки</p>
                    <p className="text-lg font-semibold text-foreground">{formatRub(payout.amountRub)}</p>
                  </div>
                </div>
                <Badge className="shrink-0" variant={getPayoutStatusVariant(payout.status)}>
                  {mapPayoutStatusLabelRu(payout.status)}
                </Badge>
              </div>
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <SectionCard icon={ReceiptText} title="Данные заявки">
                <div className="space-y-2">
                  <KeyValue label="Кредиты" value={formatCredits(payout.amountCredits)} />
                  <KeyValue label="Создано" value={formatPayoutDateTime(payout.createdAt)} />
                  <KeyValue
                    label="Проверено"
                    value={
                      payout.details.reviewedAt
                        ? formatPayoutDateTime(payout.details.reviewedAt)
                        : "-"
                    }
                  />
                  <KeyValue
                    label="Выплачено"
                    value={payout.details.paidAt ? formatPayoutDateTime(payout.details.paidAt) : "-"}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={CircleUserRound} title="Пользователь">
                <div className="space-y-3">
                  <KeyValue label="Логин" value={formatNullableText(payout.username)} />
                  <Button asChild className="w-full sm:w-auto" radius="card" size="sm" type="button" variant="outline">
                    <Link href={`/admin/users?q=${encodeURIComponent(payout.username ?? payout.userId)}`}>
                      Открыть профиль
                    </Link>
                  </Button>
                </div>
              </SectionCard>
            </div>

            <SectionCard icon={Building2} title="Реквизиты выплаты">
              <div className="space-y-2">
                <KeyValue label="Банк" value={payoutDetails.bank ?? "-"} />
                <KeyValue label="Телефон/карта" value={payoutDetails.destination ?? "-"} />
                {!payoutDetails.bank && !payoutDetails.destination ? (
                  <p className="text-sm text-muted-foreground">
                    {formatNullableText(payout.details.payoutDetailsSnapshot)}
                  </p>
                ) : null}
              </div>
            </SectionCard>

            {payout.status === "pending" || payout.status === "approved" ? (
              <SectionCard icon={BanknoteArrowDown} title="Действия">
                <div className="grid gap-2 sm:flex sm:flex-wrap">
                  {payout.status === "pending" ? (
                    <form action={approvePayoutRequestAction} className="w-full sm:w-auto">
                      <input name="payoutRequestId" type="hidden" value={payout.id} />
                      <input name="redirectPath" type="hidden" value={redirectPath} />
                      <Button className="w-full" radius="card" type="submit" variant="outline">
                        Одобрить
                      </Button>
                    </form>
                  ) : null}

                  {payout.status === "approved" ? (
                    <form action={markPayoutRequestPaidAction} className="w-full sm:w-auto">
                      <input name="payoutRequestId" type="hidden" value={payout.id} />
                      <input name="redirectPath" type="hidden" value={redirectPath} />
                      <Button className="w-full" radius="card" type="submit" variant="outline">
                        Отметить как выплачено
                      </Button>
                    </form>
                  ) : null}

                  <form action={rejectPayoutRequestAction} className="w-full sm:w-auto">
                    <input name="payoutRequestId" type="hidden" value={payout.id} />
                    <input name="redirectPath" type="hidden" value={redirectPath} />
                    <input name="rejectionReason" type="hidden" value="Отклонено администратором." />
                    <Button className="w-full" radius="card" type="submit" variant="destructive">
                      Отклонить
                    </Button>
                  </form>
                </div>
              </SectionCard>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

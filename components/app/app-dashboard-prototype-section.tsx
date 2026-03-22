import {
  BarChart3,
  BanknoteArrowDown,
  BadgeCheck,
  CircleDollarSign,
  File,
  Gift,
  Handshake,
  Headset,
  Smartphone,
  TicketPercent,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";

import { SupportDialog } from "@/components/support/support-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LegalDocuments } from "@/lib/legal-documents";
import { cn } from "@/lib/utils";

import { AppCopyTextButton } from "./app-copy-text-button";
import {
  CancelPayoutRequestForm,
  CreatePayoutRequestForm,
  GenerateReferralCodeForm,
  PromoCodeApplyForm,
} from "./app-dashboard-dialog-actions";
import { AppDevicesManagementDialog } from "./app-devices-management-dialog";
import { AppSectionShell } from "./app-section-shell";
import { AppSetupDialog } from "./app-setup-dialog";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";
import { AppUserAgreementDialog } from "./app-user-agreement-dialog";

type ReferralProgramSettings = {
  defaultDiscountPct: number;
  defaultRewardCredits: number;
  isEnabled: boolean;
  minimumPayoutCredits: number;
};

type OwnReferralCode = {
  _count: { uses: number };
  code: string;
  discountPct: number;
  rewardCredits: number;
} | null;

type PromoRedemption = {
  createdAt: Date;
  promoCode: {
    code: string;
    creditAmount: number;
  };
};

type ReferralStats = {
  confirmedInvitedCount: number;
  conversionRatePct: number;
  totalEarnedCredits: number;
  totalInvitedCount: number;
};

type RecentReferralActivity = {
  createdAt: Date;
  discountPctSnapshot: number;
  id: string;
  referredUsername: string;
  rewardCreditsSnapshot: number;
  rewardGrantedAt: Date | null;
};

type PayoutSummary = {
  activeRequest: {
    amountCredits: number;
    amountRub: number;
    createdAt: Date;
    id: string;
    status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED";
  } | null;
  availableCredits: number;
  minimumPayoutCredits: number;
  recentRequests: Array<{
    amountCredits: number;
    amountRub: number;
    createdAt: Date;
    id: string;
    rejectionReason: string | null;
    status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED";
  }>;
  reservedCredits: number;
  totalPaidOutCredits: number;
};

type ActiveSubscriptionItem = {
  deviceLimit: number;
  deviceSlots: Array<{
    configUrl: string | null;
    id: string;
    label: string | null;
    lastSyncError: string | null;
    slotIndex: number;
    status: "ACTIVE" | "BLOCKED" | "FREE";
  }>;
  devices: number;
  endsAt: Date;
  expiresAt: Date | null;
  paymentRequest: {
    status: "APPROVED" | "CREATED" | "REJECTED";
  } | null;
  startsAt: Date | null;
  startedAt: Date;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  subscriptionUrl: string | null;
  tariffName: string;
} | null;

type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

function formatDate(date: Date) {
  return date.toLocaleDateString("ru-RU");
}

function getMonthsLabel(months: number) {
  if (months === 1) {
    return "1 месяц";
  }

  if (months >= 2 && months <= 4) {
    return `${months} месяца`;
  }

  return `${months} месяцев`;
}

function formatTariffLabel(value: string) {
  if (!/constructor/i.test(value)) {
    return value;
  }

  const monthsMatch = value.match(/(\d+)\s*(?:m|ме(?:с|сяц(?:а|ев)?)?)\b/i);
  if (!monthsMatch) {
    return value;
  }

  const months = Number.parseInt(monthsMatch[1] ?? "", 10);
  if (!Number.isFinite(months) || months <= 0) {
    return value;
  }

  return getMonthsLabel(months);
}

function mapSubscriptionStatus(status: SubscriptionStatus) {
  if (status === "ACTIVE") {
    return { label: "Активна", tone: "success" as const };
  }

  if (status === "EXPIRED") {
    return { label: "Истекла", tone: "default" as const };
  }

  return { label: "Отозвана", tone: "default" as const };
}

function mapPayoutStatusLabel(status: PayoutSummary["recentRequests"][number]["status"]) {
  if (status === "PENDING") {
    return "На проверке";
  }

  if (status === "APPROVED") {
    return "Одобрена";
  }

  if (status === "REJECTED") {
    return "Отклонена";
  }

  if (status === "PAID") {
    return "Выплачена";
  }

  return "Отменена";
}

function mapPayoutStatusVariant(status: PayoutSummary["recentRequests"][number]["status"]) {
  if (status === "PENDING") {
    return "warning" as const;
  }

  if (status === "APPROVED") {
    return "success" as const;
  }

  if (status === "PAID") {
    return "secondary" as const;
  }

  return "destructive" as const;
}

function formatPeopleMetric(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  const noun =
    mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)
      ? "человека"
      : "человек";

  return `${value} ${noun}`;
}

function formatRubMetric(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)}₽`;
}

function PromoCodesDialog({
  defaultOpen,
  promoCodeRedemptions,
}: {
  defaultOpen: boolean;
  promoCodeRedemptions: PromoRedemption[];
}) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-button w-full px-button-x"
          radius="card"
          type="button"
          variant="outline"
        >
          <Gift className="size-4" />
          Открыть промокоды
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[88svh] overflow-y-auto p-4 sm:max-w-lg sm:p-6"
        preventAutoFocus
      >
        <DialogHeader className="text-left">
          <DialogTitle>Промокоды</DialogTitle>
          <DialogDescription>
            Промокод пополняет внутренний баланс фиксированным количеством кредитов.
          </DialogDescription>
        </DialogHeader>

        <PromoCodeApplyForm />

        <div className="space-y-2">
          <p className="text-sm font-semibold">Последние применения</p>
          {promoCodeRedemptions.length ? (
            promoCodeRedemptions.map((item) => (
              <div
                key={`${item.promoCode.code}-${item.createdAt.toISOString()}`}
                className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
              >
                <p className="text-sm font-semibold">{item.promoCode.code}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  +{item.promoCode.creditAmount} кредитов
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
              <p className="text-sm text-muted-foreground">Промокоды еще не применялись.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReferralSystemDialog({
  canGenerateReferralCode,
  defaultOpen,
  hasApprovedPayment,
  ownReferralCode,
  payout,
  recentReferralActivity,
  referralProgramSettings,
  referralStats,
}: {
  canGenerateReferralCode: boolean;
  defaultOpen: boolean;
  hasApprovedPayment: boolean;
  ownReferralCode: OwnReferralCode;
  payout: PayoutSummary;
  recentReferralActivity: RecentReferralActivity[];
  referralProgramSettings: ReferralProgramSettings;
  referralStats: ReferralStats;
}) {
  const canGenerate =
    canGenerateReferralCode &&
    referralProgramSettings.isEnabled &&
    hasApprovedPayment &&
    !ownReferralCode;

  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-button w-full px-button-x"
          radius="card"
          type="button"
          variant="outline"
        >
          <UsersRound className="size-4" />
          Открыть рефералку
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88svh] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Реферальная система</DialogTitle>
          <DialogDescription>1 Сredit = 1 RUB</DialogDescription>
        </DialogHeader>

        <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "inline-flex h-[44px] w-[44px] items-center justify-center rounded-card border border-border bg-background/60"
              )}
            >
              <Handshake
                className={cn(
                  "size-[22px]",
                  referralProgramSettings.isEnabled ? "text-white" : "text-muted-foreground"
                )}
              />
            </div>
            <div
              className={cn(
                "space-y-0 text-sm",
                referralProgramSettings.isEnabled ? "text-white" : "text-muted-foreground"
              )}
            >
              <p>Другу скидка {referralProgramSettings.defaultDiscountPct}%</p>
              <p>Вам {referralProgramSettings.defaultRewardCredits} кредитов</p>
            </div>
          </div>
        </div>

        {ownReferralCode ? (
          <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                  <TicketPercent className="size-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{ownReferralCode.code}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="sm:hidden">Исп. — {ownReferralCode._count.uses}</span>
                    <span className="hidden sm:inline">Использований: {ownReferralCode._count.uses}</span>
                  </p>
                </div>
              </div>
              <AppCopyTextButton
                className="self-center"
                label={
                  <>
                    <span className="sm:hidden">Скопировать</span>
                    <span className="hidden sm:inline">Скопировать код</span>
                  </>
                }
                successMessage="Реферальный код скопирован."
                value={ownReferralCode.code}
              />
            </div>
          </div>
        ) : null}

        {!ownReferralCode ? (
          <GenerateReferralCodeForm canGenerate={canGenerate} />
        ) : null}

        {!canGenerate && !ownReferralCode ? (
          <p className="text-[12px] text-muted-foreground">
            {!hasApprovedPayment
              ? "ReferralCode станет доступен после первой подтвержденной оплаты."
              : "Генерация сейчас недоступна из-за глобальных настроек реферальной системы."}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full" radius="card" type="button" variant="outline">
                <BarChart3 className="size-4" />
                Детальная аналитика
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader className="text-left">
                <DialogTitle>Детальная аналитика</DialogTitle>
                <DialogDescription>Основные метрики приглашений и выплат.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                      <UsersRound className="size-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Приглашено</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatPeopleMetric(referralStats.totalInvitedCount)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                      <BadgeCheck className="size-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Активных</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatPeopleMetric(referralStats.confirmedInvitedCount)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                      <Wallet className="size-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Заработано</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatRubMetric(referralStats.totalEarnedCredits)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                      <BanknoteArrowDown className="size-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Выплачено</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatRubMetric(payout.totalPaidOutCredits)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full" radius="card" type="button" variant="outline">
                <CircleDollarSign className="size-4" />
                История и активность
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader className="text-left">
                <DialogTitle>История заявок и активность</DialogTitle>
                <DialogDescription>История заявок на вывод и реферальная активность.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <div className="mb-3 flex items-center gap-2">
                    <CircleDollarSign className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">История заявок на вывод</p>
                  </div>
                  <div className="space-y-2">
                    {payout.recentRequests.length ? (
                      payout.recentRequests.map((request) => (
                        <div
                          className="space-y-3 rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
                          key={request.id}
                        >
                          <Badge
                            className="w-full justify-center sm:hidden"
                            variant={mapPayoutStatusVariant(request.status)}
                          >
                            {mapPayoutStatusLabel(request.status)}
                          </Badge>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                                <BanknoteArrowDown className="size-5 text-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{request.amountRub} ₽</p>
                                <p className="text-xs text-muted-foreground">
                                  Создано: {formatDate(request.createdAt)}
                                </p>
                              </div>
                            </div>
                            <Badge className="hidden sm:inline-flex" variant={mapPayoutStatusVariant(request.status)}>
                              {mapPayoutStatusLabel(request.status)}
                            </Badge>
                          </div>
                          {request.rejectionReason ? (
                            <p className="mt-1 text-xs text-destructive">{request.rejectionReason}</p>
                          ) : null}
                          {request.status === "PENDING" ? (
                            <CancelPayoutRequestForm payoutRequestId={request.id} />
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-card border border-border/60 bg-background/30 p-3 text-sm text-muted-foreground">
                        Пока нет заявок на вывод.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <div className="mb-2 flex items-center gap-2">
                    <UsersRound className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Последняя реферальная активность</p>
                  </div>
                  <div className="space-y-2">
                    {recentReferralActivity.length ? (
                      recentReferralActivity.map((event) => (
                        <div
                          className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
                          key={event.id}
                        >
                          <Badge
                            className="mb-3 w-full justify-center sm:hidden"
                            variant={event.rewardGrantedAt ? "success" : "warning"}
                          >
                            {event.rewardGrantedAt ? "Начислено" : "Ожидает"}
                          </Badge>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                                <UsersRound className="size-5 text-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{event.referredUsername}</p>
                                <p className="text-xs text-muted-foreground">
                                  Создано: {formatDate(event.createdAt)}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className="hidden sm:inline-flex"
                              variant={event.rewardGrantedAt ? "success" : "warning"}
                            >
                              {event.rewardGrantedAt ? "Начислено" : "Ожидает"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-card border border-border/60 bg-background/30 p-3 text-sm text-muted-foreground">
                        Реферальные события появятся после регистраций по вашему коду.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full" radius="card" type="button" variant="outline">
                <BanknoteArrowDown className="size-4" />
                Вывести
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
              <DialogHeader className="text-left">
                <DialogTitle>Создать заявку на вывод</DialogTitle>
                <DialogDescription>
                  Вывод доступного баланса кредитов на банковскую карту.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-card border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
                <p>Доступно: {payout.availableCredits} credits</p>
                <p>Минимум: {payout.minimumPayoutCredits} credits</p>
              </div>

              <CreatePayoutRequestForm minimumPayoutCredits={payout.minimumPayoutCredits} />
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppDashboardPrototypeSection({
  activeSubscription,
  canGenerateReferralCode,
  credits,
  defaultDialog,
  hasApprovedPayment,
  legalDocuments,
  ownReferralCode,
  payout,
  promoCodeRedemptions,
  recentReferralActivity,
  referralProgramSettings,
  referralStats,
  username,
}: {
  activeSubscription: ActiveSubscriptionItem;
  canGenerateReferralCode: boolean;
  credits: number;
  defaultDialog: "promo" | "referral" | null;
  hasApprovedPayment: boolean;
  legalDocuments: LegalDocuments;
  ownReferralCode: OwnReferralCode;
  payout: PayoutSummary;
  promoCodeRedemptions: PromoRedemption[];
  recentReferralActivity: RecentReferralActivity[];
  referralProgramSettings: ReferralProgramSettings;
  referralStats: ReferralStats;
  username: string;
}) {
  const subscriptionStatus = activeSubscription
    ? mapSubscriptionStatus(activeSubscription.status)
    : { label: "Нет подписки", tone: "default" as const };
  const subscriptionEnd = activeSubscription
    ? activeSubscription.expiresAt ?? activeSubscription.endsAt
    : null;
  const devicesCount = activeSubscription
    ? Math.max(activeSubscription.devices, activeSubscription.deviceLimit)
    : 0;
  const tariffLabel = activeSubscription
    ? formatTariffLabel(activeSubscription.tariffName)
    : "Нет подписки";
  const subscriptionStatusLabel =
    activeSubscription && subscriptionStatus.tone === "success" && subscriptionEnd
      ? `Активна до ${formatDate(subscriptionEnd)}`
      : subscriptionStatus.label;
  const isPromoDialogOpenByDefault = defaultDialog === "promo";
  const isReferralDialogOpenByDefault = defaultDialog === "referral";

  return (
    <AppSectionShell
      description="Подписка, устройства, поддержка и бонусы."
      eyebrow="DASHBOARD"
      id="dashboard"
      title="Управление"
    >
      <div className="space-y-4">
        <div className="scroll-mt-24" id="benefits" />
        <AppSurface className="min-w-0">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Подписка</p>
              </div>
              <AppStatusPill label={subscriptionStatusLabel} tone={subscriptionStatus.tone} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-card border border-border/70 bg-background/40 px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <TicketPercent className="size-3.5" />
                  Тариф
                </p>
                <p className="mt-0 text-base font-semibold text-foreground">{tariffLabel}</p>
              </div>
              <div className="rounded-card border border-border/70 bg-background/40 px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Smartphone className="size-3.5" />
                  Устройства
                </p>
                <p className="mt-0 text-base font-semibold text-foreground">{devicesCount || "—"}</p>
              </div>
              <div className="rounded-card border border-border/70 bg-background/40 px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UserRound className="size-3.5" />
                  Username
                </p>
                <p className="mt-0 text-base font-semibold text-foreground">{username}</p>
              </div>
              <div className="rounded-card border border-border/70 bg-background/40 px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Wallet className="size-3.5" />
                  Баланс
                </p>
                <p className="mt-0 text-base font-semibold text-foreground">{credits} кредитов</p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              
              <AppSetupDialog subscriptionUrl={activeSubscription?.subscriptionUrl ?? null} />
              <AppDevicesManagementDialog activeSubscription={activeSubscription} />
            </div>
          </div>
        </AppSurface>

        <div className="grid gap-4 md:grid-cols-2">
          <AppSurface className="min-w-0">
            <div className="space-y-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-border bg-background/60">
                <UsersRound className="size-5 text-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Реферальная система</p>
                <p className="text-sm text-muted-foreground">
                  Генерация личного referral-кода и контроль условий бонусной модели.
                </p>
              </div>
              <ReferralSystemDialog
                canGenerateReferralCode={canGenerateReferralCode}
                defaultOpen={isReferralDialogOpenByDefault}
                hasApprovedPayment={hasApprovedPayment}
                ownReferralCode={ownReferralCode}
                payout={payout}
                recentReferralActivity={recentReferralActivity}
                referralProgramSettings={referralProgramSettings}
                referralStats={referralStats}
              />
            </div>
          </AppSurface>

          <AppSurface className="min-w-0">
            <div className="space-y-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-border bg-background/60">
                <Gift className="size-5 text-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Промокоды</p>
                <p className="text-sm text-muted-foreground">
                  Применение промокода и история последних начислений на баланс.
                </p>
              </div>
              <PromoCodesDialog
                defaultOpen={isPromoDialogOpenByDefault}
                promoCodeRedemptions={promoCodeRedemptions}
              />
            </div>
          </AppSurface>

          <div className="scroll-mt-24 md:scroll-mt-28" id="support">
            <AppSurface className="min-w-0">
            <div className="space-y-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-border bg-background/60">
                <Headset className="size-5 text-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Связаться с поддержкой</p>
                <p className="text-sm text-muted-foreground">
                  Быстрый переход к тикетам и диалогу с командой поддержки.
                </p>
              </div>
              <SupportDialog />
            </div>
            </AppSurface>
          </div>

          <div className="scroll-mt-24 md:scroll-mt-28" id="legal">
            <AppSurface className="min-w-0">
            <div className="space-y-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-border bg-background/60">
                <File className="size-5 text-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Юридическая информация</p>
                <p className="text-sm text-muted-foreground">
                  Ключевые документы, условия использования и базовые ограничения сервиса.
                </p>
              </div>
              <AppUserAgreementDialog legalDocuments={legalDocuments} />
            </div>
            </AppSurface>
          </div>
        </div>
      </div>
    </AppSectionShell>
  );
}

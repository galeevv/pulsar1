import {
  BadgeCheck,
  FileText,
  Gift,
  Handshake,
  Headset,
  Smartphone,
  TicketPercent,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  applyPromoCodeAction,
  generateOwnReferralCodeAction,
} from "@/app/app/actions";
import { SupportDialog } from "@/components/support/support-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

function PromoCodesDialog({
  promoCodeRedemptions,
}: {
  promoCodeRedemptions: PromoRedemption[];
}) {
  return (
    <Dialog>
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
      <DialogContent className="max-h-[88svh] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Промокоды</DialogTitle>
          <DialogDescription>
            Промокод пополняет внутренний баланс фиксированным количеством кредитов.
          </DialogDescription>
        </DialogHeader>

        <form action={applyPromoCodeAction} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="dashboard-promo-code-input">
              PromoCode
            </label>
            <Input
              id="dashboard-promo-code-input"
              name="code"
              placeholder="Введите промокод"
              required
            />
          </div>

          <Button className="h-button w-full px-button-x" radius="card" type="submit">
            Применить промокод
          </Button>
        </form>

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
  hasApprovedPayment,
  ownReferralCode,
  referralProgramSettings,
}: {
  canGenerateReferralCode: boolean;
  hasApprovedPayment: boolean;
  ownReferralCode: OwnReferralCode;
  referralProgramSettings: ReferralProgramSettings;
}) {
  const canGenerate =
    canGenerateReferralCode &&
    referralProgramSettings.isEnabled &&
    hasApprovedPayment &&
    !ownReferralCode;

  return (
    <Dialog>
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
      <DialogContent className="max-h-[88svh] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Реферальная система</DialogTitle>
          <DialogDescription>
            Управление личным referral-кодом и условиями бонусов.
          </DialogDescription>
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
            <p className="text-sm font-semibold">{ownReferralCode.code}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Скидка {ownReferralCode.discountPct}% • бонус {ownReferralCode.rewardCredits} кредитов
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Использований: {ownReferralCode._count.uses}
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
            <p className="text-sm text-muted-foreground">
              У вас пока нет referral-кода. На текущем этапе его можно сгенерировать только один раз.
            </p>
          </div>
        )}

        <form action={generateOwnReferralCodeAction}>
          <Button
            className="h-button w-full px-button-x"
            disabled={!canGenerate}
            radius="card"
            type="submit"
          >
            {ownReferralCode ? "ReferralCode уже создан" : "Сгенерировать ReferralCode"}
          </Button>
        </form>

        {!canGenerate && !ownReferralCode ? (
          <p className="text-[12px] text-muted-foreground">
            {!hasApprovedPayment
              ? "ReferralCode станет доступен после первой подтвержденной оплаты."
              : "Генерация сейчас недоступна из-за глобальных настроек реферальной системы."}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function AppDashboardPrototypeSection({
  activeSubscription,
  canGenerateReferralCode,
  credits,
  hasApprovedPayment,
  ownReferralCode,
  promoCodeRedemptions,
  referralProgramSettings,
  userAgreementText,
  username,
}: {
  activeSubscription: ActiveSubscriptionItem;
  canGenerateReferralCode: boolean;
  credits: number;
  hasApprovedPayment: boolean;
  ownReferralCode: OwnReferralCode;
  promoCodeRedemptions: PromoRedemption[];
  referralProgramSettings: ReferralProgramSettings;
  userAgreementText: string;
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
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TicketPercent className="size-3.5" />
                  Тариф
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{tariffLabel}</p>
              </div>
              <div className="rounded-card border border-border/70 bg-background/40 px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Smartphone className="size-3.5" />
                  Устройства
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{devicesCount || "—"}</p>
              </div>
              <div className="rounded-card border border-border/70 bg-background/40 px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="size-3.5" />
                  Username
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{username}</p>
              </div>
              <div className="rounded-card border border-border/70 bg-background/40 px-3 py-2">
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="size-3.5" />
                  Баланс
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{credits} кредитов</p>
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
                <FileText className="size-5 text-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Пользовательское соглашение</p>
                <p className="text-sm text-muted-foreground">
                  Ключевые условия использования сервиса и зона ответственности сторон.
                </p>
              </div>
              <AppUserAgreementDialog userAgreementText={userAgreementText} />
            </div>
          </AppSurface>

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
              <PromoCodesDialog promoCodeRedemptions={promoCodeRedemptions} />
            </div>
          </AppSurface>

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
                hasApprovedPayment={hasApprovedPayment}
                ownReferralCode={ownReferralCode}
                referralProgramSettings={referralProgramSettings}
              />
            </div>
          </AppSurface>
        </div>
      </div>
    </AppSectionShell>
  );
}

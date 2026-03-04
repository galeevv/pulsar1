import { Gift, Sparkles } from "lucide-react";

import { applyPromoCodeAction, generateOwnReferralCodeAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AppSectionShell } from "./app-section-shell";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";

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

export function AppBenefitsSection({
  canGenerateReferralCode,
  hasApprovedPayment,
  ownReferralCode,
  promoCodeRedemptions,
  referralProgramSettings,
}: {
  canGenerateReferralCode: boolean;
  hasApprovedPayment: boolean;
  ownReferralCode: OwnReferralCode;
  promoCodeRedemptions: PromoRedemption[];
  referralProgramSettings: ReferralProgramSettings;
}) {
  return (
    <AppSectionShell
      description="Здесь уже доступны реальные действия: пользователь может сгенерировать свой referral-код по глобальным правилам и применить promo-код для пополнения баланса."
      eyebrow="BENEFITS"
      id="benefits"
      title="Рефералка и промокоды"
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <AppSurface>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Реферальная система</p>
            </div>

            <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Новому пользователю: скидка {referralProgramSettings.defaultDiscountPct}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Автору кода: {referralProgramSettings.defaultRewardCredits} кредитов
                  </p>
                </div>
                <AppStatusPill
                  label={referralProgramSettings.isEnabled ? "Включена" : "Выключена"}
                  tone={referralProgramSettings.isEnabled ? "success" : "default"}
                />
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
                  У вас пока нет referral-кода. На текущем этапе его можно сгенерировать только
                  один раз.
                </p>
              </div>
            )}

            <form action={generateOwnReferralCodeAction}>
              <Button
                className="h-button w-full px-button-x"
                disabled={!canGenerateReferralCode}
                radius="card"
                type="submit"
              >
                {ownReferralCode ? "ReferralCode уже создан" : "Сгенерировать ReferralCode"}
              </Button>
            </form>

            {!canGenerateReferralCode && !ownReferralCode ? (
              <p className="text-sm text-muted-foreground">
                {hasApprovedPayment
                  ? "Генерация сейчас недоступна из-за глобальных настроек реферальной системы."
                  : "ReferralCode станет доступен после первой подтвержденной оплаты."}
              </p>
            ) : null}
          </div>
        </AppSurface>

        <AppSurface>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Промокоды</p>
            </div>

            <p className="text-sm text-muted-foreground">
              Промокод пополняет внутренний баланс фиксированным количеством кредитов. Один и тот
              же код нельзя применить дважды на одном аккаунте.
            </p>

            <form action={applyPromoCodeAction} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="promo-code-input">
                  PromoCode
                </label>
                <Input
                  id="promo-code-input"
                  name="code"
                  placeholder="Введите промокод"
                  required
                />
              </div>

              <Button className="h-button w-full px-button-x" radius="card" type="submit">
                Применить промокод
              </Button>
            </form>

            <div className="space-y-3">
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
                  <p className="text-sm text-muted-foreground">
                    Промокоды еще не применялись.
                  </p>
                </div>
              )}
            </div>
          </div>
        </AppSurface>
      </div>
    </AppSectionShell>
  );
}

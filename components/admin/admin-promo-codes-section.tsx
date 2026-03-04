import { createPromoCodeAction, togglePromoCodeAction } from "@/app/admin/actions";
import { AdminDatePickerField } from "@/components/admin/admin-date-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type PromoCodeItem = {
  _count: { redemptions: number };
  code: string;
  createdAt: Date;
  creditAmount: number;
  expiresAt: Date | null;
  id: string;
  isEnabled: boolean;
  maxRedemptions: number;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Без срока";
  }

  return value.toLocaleString("ru-RU");
}

export function AdminPromoCodesSection({
  promoCodes,
}: {
  promoCodes: PromoCodeItem[];
}) {
  return (
    <AdminSectionShell
      description="PromoCode пополняет баланс клиента фиксированным количеством кредитов. Один и тот же пользователь не сможет применить один и тот же промокод дважды."
      eyebrow="PROMO"
      id="promocodes"
      title="PromoCode"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <AdminSurface>
          <form action={createPromoCodeAction} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="promo-code-value">
                Код
              </label>
              <Input
                id="promo-code-value"
                name="code"
                placeholder="Оставьте пустым для автогенерации"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="promo-code-credits">
                Начисление (кредиты)
              </label>
              <Input
                id="promo-code-credits"
                min="1"
                name="creditAmount"
                required
                type="number"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="promo-code-limit">
                Глобальный лимит применений
              </label>
              <Input
                id="promo-code-limit"
                min="1"
                name="maxRedemptions"
                required
                type="number"
              />
            </div>

            <AdminDatePickerField label="Срок действия" name="expiresAt" />

            <Button className="h-button w-full px-button-x" radius="card" type="submit">
              Создать промокод
            </Button>
          </form>
        </AdminSurface>

        <AdminSurface>
          <div className="space-y-3">
            {promoCodes.map((item) => (
              <div
                key={item.id}
                className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{item.code}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      +{item.creditAmount} кредитов
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Использовано: {item._count.redemptions} / {item.maxRedemptions}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Истекает: {formatDate(item.expiresAt)}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <AdminStatusPill
                      label={item.isEnabled ? "Включен" : "Выключен"}
                      tone={item.isEnabled ? "success" : "default"}
                    />
                    <form action={togglePromoCodeAction}>
                      <input name="id" type="hidden" value={item.id} />
                      <input
                        name="nextEnabled"
                        type="hidden"
                        value={item.isEnabled ? "false" : "true"}
                      />
                      <Button radius="card" type="submit" variant="outline">
                        {item.isEnabled ? "Выключить" : "Включить"}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminSurface>
      </div>
    </AdminSectionShell>
  );
}

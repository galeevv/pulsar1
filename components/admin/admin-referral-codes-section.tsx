import {
  createReferralCodeAction,
  toggleReferralCodeAction,
  updateReferralProgramSettingsAction,
} from "@/app/admin/actions";
import { AdminDatePickerField } from "@/components/admin/admin-date-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type ReferralCodeItem = {
  _count: { uses: number };
  code: string;
  createdAt: Date;
  discountPct: number;
  expiresAt: Date | null;
  id: string;
  isEnabled: boolean;
  ownerUser: { username: string } | null;
  rewardCredits: number;
};

type ReferralProgramSettings = {
  defaultDiscountPct: number;
  defaultRewardCredits: number;
  isEnabled: boolean;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Без срока";
  }

  return value.toLocaleString("ru-RU");
}

export function AdminReferralCodesSection({
  referralCodes,
  referralProgramSettings,
}: {
  referralCodes: ReferralCodeItem[];
  referralProgramSettings: ReferralProgramSettings;
}) {
  return (
    <AdminSectionShell
      description="ReferralCode многоразовый. Пользователь сможет сгенерировать только один свой referral-код после первой подтвержденной оплаты, а параметры такого кода будут браться из глобальных настроек ниже. При этом у администратора остается возможность создавать кастомные referral-коды вручную."
      eyebrow="REFERRAL"
      id="referral-codes"
      title="ReferralCode"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminSurface>
            <form action={updateReferralProgramSettingsAction} className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Глобальная реферальная система</p>
                  <p className="text-sm text-muted-foreground">
                    Используется для пользовательской кнопки «Сгенерировать ReferralCode».
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    defaultChecked={referralProgramSettings.isEnabled}
                    name="isEnabled"
                    type="checkbox"
                  />
                  Включена
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="referral-default-discount">
                  Скидка новому пользователю (%)
                </label>
                <Input
                  defaultValue={referralProgramSettings.defaultDiscountPct}
                  id="referral-default-discount"
                  min="1"
                  max="100"
                  name="defaultDiscountPct"
                  required
                  type="number"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="referral-default-reward">
                  Бонус автору (кредиты)
                </label>
                <Input
                  defaultValue={referralProgramSettings.defaultRewardCredits}
                  id="referral-default-reward"
                  min="1"
                  name="defaultRewardCredits"
                  required
                  type="number"
                />
              </div>

              <Button className="h-button w-full px-button-x" radius="card" type="submit">
                Сохранить глобальные настройки
              </Button>
            </form>
          </AdminSurface>

          <AdminSurface>
            <form action={createReferralCodeAction} className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Кастомный referral-код администратора</p>
                <p className="text-sm text-muted-foreground">
                  Для отдельных кампаний админ может создать referral-код с кастомными
                  параметрами.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="referral-code-value">
                  Код
                </label>
                <Input
                  id="referral-code-value"
                  name="code"
                  placeholder="Оставьте пустым для автогенерации"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="referral-code-discount">
                  Скидка на первую покупку (%)
                </label>
                <Input
                  id="referral-code-discount"
                  min="1"
                  max="100"
                  name="discountPct"
                  required
                  type="number"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="referral-code-reward">
                  Бонус автору (кредиты)
                </label>
                <Input
                  id="referral-code-reward"
                  min="1"
                  name="rewardCredits"
                  required
                  type="number"
                />
              </div>

              <AdminDatePickerField label="Срок действия" name="expiresAt" />

              <Button className="h-button w-full px-button-x" radius="card" type="submit">
                Создать кастомный referral-код
              </Button>
            </form>
          </AdminSurface>
        </div>

        <AdminSurface>
          <div className="space-y-3">
            {referralCodes.map((item) => (
              <div
                key={item.id}
                className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{item.code}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Скидка {item.discountPct}% • бонус {item.rewardCredits} кредитов
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Использований: {item._count.uses} • владелец:{" "}
                      {item.ownerUser?.username ?? "ADMIN"}
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
                    <form action={toggleReferralCodeAction}>
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

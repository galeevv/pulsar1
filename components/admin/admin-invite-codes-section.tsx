import { createInviteCodeAction, toggleInviteCodeAction } from "@/app/admin/actions";
import { AdminDatePickerField } from "@/components/admin/admin-date-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type InviteCodeItem = {
  code: string;
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  isEnabled: boolean;
  usedAt: Date | null;
  usedBy: { username: string } | null;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Без срока";
  }

  return value.toLocaleString("ru-RU");
}

export function AdminInviteCodesSection({
  inviteCodes,
}: {
  inviteCodes: InviteCodeItem[];
}) {
  return (
    <AdminSectionShell
      description="InviteCode нужен для регистрации и работает только один раз. После успешной регистрации код теперь автоматически помечается как использованный и выключается."
      eyebrow="INVITE"
      id="invite-codes"
      title="InviteCode"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <AdminSurface>
          <form action={createInviteCodeAction} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="invite-code-value">
                Код
              </label>
              <Input
                id="invite-code-value"
                name="code"
                placeholder="Оставьте пустым для автогенерации"
              />
            </div>

            <AdminDatePickerField label="Срок действия" name="expiresAt" />

            <Button className="h-button w-full px-button-x" radius="card" type="submit">
              Создать invite-код
            </Button>
          </form>
        </AdminSurface>

        <AdminSurface>
          <div className="space-y-3">
            {inviteCodes.map((item) => (
              <div
                key={item.id}
                className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{item.code}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Истекает: {formatDate(item.expiresAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.usedBy ? `Использован: ${item.usedBy.username}` : "Еще не использован"}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <AdminStatusPill
                      label={item.isEnabled ? "Включен" : "Выключен"}
                      tone={item.isEnabled ? "success" : "default"}
                    />
                    <form action={toggleInviteCodeAction}>
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

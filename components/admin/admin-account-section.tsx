import { updateAdminCredentialsAction } from "@/app/admin/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

export function AdminAccountSection({
  currentUsername,
}: {
  currentUsername: string;
}) {
  return (
    <AdminSectionShell
      description="Управление логином и паролем администратора. Логин валидируется по правилам Marzban: 3-32 символа, a-z, 0-9 и _. Для изменения требуется текущий пароль."
      eyebrow="ACCOUNT"
      id="account"
      title="Учетные данные администратора"
    >
      <AdminSurface>
        <form action={updateAdminCredentialsAction} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">
              Текущий логин: <span className="font-medium text-foreground">{currentUsername}</span>
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="admin-current-password">
              Текущий пароль
            </label>
            <Input
              id="admin-current-password"
              name="currentPassword"
              placeholder="Введите текущий пароль"
              required
              type="password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="admin-next-username">
              Новый логин
            </label>
            <Input
              id="admin-next-username"
              maxLength={32}
              minLength={3}
              name="nextUsername"
              pattern="[a-z0-9_]+"
              placeholder="Оставьте пустым, если не меняете"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="admin-next-password">
              Новый пароль
            </label>
            <Input
              id="admin-next-password"
              minLength={8}
              name="nextPassword"
              placeholder="Минимум 8 символов"
              type="password"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="admin-next-password-confirmation"
            >
              Подтверждение нового пароля
            </label>
            <Input
              id="admin-next-password-confirmation"
              minLength={8}
              name="nextPasswordConfirmation"
              placeholder="Повторите новый пароль"
              type="password"
            />
          </div>

          <div className="md:col-span-2">
            <Button className="h-button px-button-x" radius="card" type="submit">
              Сохранить учетные данные
            </Button>
          </div>
        </form>
      </AdminSurface>
    </AdminSectionShell>
  );
}

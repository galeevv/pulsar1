import { AppSectionShell } from "./app-section-shell";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";

export function AppProfileSection({
  credits,
  username,
}: {
  credits: number;
  username: string;
}) {
  return (
    <AppSectionShell
      description="Базовая информация о профиле, статусе доступа и накопленном балансе. Позже здесь добавим историю действий и настройки аккаунта."
      eyebrow="PROFILE"
      id="profile"
      title="Профиль"
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <AppSurface>
          <p className="text-sm font-semibold">Username</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{username}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ваш основной идентификатор для входа.
          </p>
        </AppSurface>

        <AppSurface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Статус аккаунта</p>
              <p className="mt-2 text-sm text-muted-foreground">
                На текущем этапе доступ считается активным.
              </p>
            </div>
            <AppStatusPill label="Активен" tone="success" />
          </div>
        </AppSurface>

        <AppSurface>
          <p className="text-sm font-semibold">Внутренний баланс</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{credits} кредитов</p>
          <p className="mt-2 text-sm text-muted-foreground">
            1 рубль = 1 кредит. Здесь сразу видны пополнения от promo-кодов и бонусов по
            реферальной системе.
          </p>
        </AppSurface>
      </div>
    </AppSectionShell>
  );
}

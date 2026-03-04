import { Role } from "@/generated/prisma";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type UserItem = {
  createdAt: Date;
  credits: number;
  role: Role;
  username: string;
};

export function AdminUsersSection({
  users,
}: {
  users: UserItem[];
}) {
  return (
    <AdminSectionShell
      description="Список последних пользователей и их текущий внутренний баланс. Позже здесь появятся фильтры, просмотр профиля и ручные административные действия."
      eyebrow="USERS"
      id="users"
      title="Пользователи"
    >
      <AdminSurface>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.username}
              className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{user.username}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {user.role} • {user.credits} кредитов
                  </p>
                </div>
                <AdminStatusPill
                  label={user.role === "ADMIN" ? "Администратор" : "Клиент"}
                  tone={user.role === "ADMIN" ? "success" : "default"}
                />
              </div>
            </div>
          ))}
        </div>
      </AdminSurface>
    </AdminSectionShell>
  );
}

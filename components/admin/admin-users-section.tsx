import { Role } from "@/generated/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type UserItem = {
  createdAt: Date;
  credits: number;
  role: Role;
  username: string;
};

function formatDate(value: Date) {
  return value.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function AdminUsersSection({
  users,
}: {
  users: UserItem[];
}) {
  return (
    <AdminSectionShell
      description="Последние зарегистрированные пользователи и их текущий внутренний баланс. Блок используется для быстрой проверки ролей, кредитов и динамики регистраций."
      eyebrow="USERS"
      id="users"
      title="Пользователи"
    >
      <AdminSurface className="overflow-hidden p-0">
        {users.length ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70">
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Пользователь
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Роль
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Баланс
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Создан
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow className="border-border/70 hover:bg-background/45" key={user.username}>
                      <TableCell className="px-6 py-4 font-medium">{user.username}</TableCell>
                      <TableCell className="px-6 py-4">
                        <AdminStatusPill
                          label={user.role === "ADMIN" ? "Администратор" : "Клиент"}
                          tone={user.role === "ADMIN" ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">
                        {user.credits} кредитов
                      </TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-card md:hidden">
              {users.map((user) => (
                <div
                  className="rounded-card border border-border/70 bg-background/45 p-card-compact"
                  key={user.username}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{user.username}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Создан: {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <AdminStatusPill
                      label={user.role === "ADMIN" ? "Админ" : "Клиент"}
                      tone={user.role === "ADMIN" ? "success" : "default"}
                    />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{user.credits} кредитов</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground md:px-6">
            Пользователей пока нет.
          </div>
        )}
      </AdminSurface>
    </AdminSectionShell>
  );
}

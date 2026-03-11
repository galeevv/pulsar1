import Link from "next/link";

import { updateUserAgreementAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

export function AdminRulesSection({
  userAgreementText,
}: {
  userAgreementText: string;
}) {
  return (
    <AdminSectionShell
      description="Управление текстом пользовательского соглашения, которое публикуется на странице /rules."
      eyebrow="LEGAL"
      id="rules"
      title="Пользовательское соглашение"
    >
      <AdminSurface>
        <form action={updateUserAgreementAction} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Публичная страница:{" "}
              <Link className="text-foreground underline underline-offset-4" href="/rules" target="_blank">
                /rules
              </Link>
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="admin-user-agreement-text">
              Текст соглашения
            </label>
            <textarea
              className="min-h-[420px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              defaultValue={userAgreementText}
              id="admin-user-agreement-text"
              name="userAgreementText"
              required
            />
          </div>

          <Button className="h-button px-button-x" radius="card" type="submit">
            Сохранить соглашение
          </Button>
        </form>
      </AdminSurface>
    </AdminSectionShell>
  );
}

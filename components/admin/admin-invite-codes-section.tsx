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
    return "No expiration";
  }

  return value.toLocaleString("ru-RU");
}

export function AdminInviteCodesSection({
  inviteCodes,
  embedded = false,
}: {
  inviteCodes: InviteCodeItem[];
  embedded?: boolean;
}) {
  const content = (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <AdminSurface>
        <form action={createInviteCodeAction} className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Create invite code</h3>
            <p className="text-sm text-muted-foreground">
              Set a custom value or leave the field empty for automatic generation.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="invite-code-value">
              Code
            </label>
            <Input id="invite-code-value" name="code" placeholder="Leave empty for auto generation" />
          </div>

          <AdminDatePickerField label="Expiration date" name="expiresAt" />

          <Button className="h-button w-full px-button-x" radius="card" type="submit">
            Create invite code
          </Button>
        </form>
      </AdminSurface>

      <AdminSurface>
        {inviteCodes.length ? (
          <div className="space-y-3">
            {inviteCodes.map((item) => (
              <div
                className="rounded-card border border-border/70 bg-background/45 p-card-compact md:p-card-compact-md"
                key={item.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold tracking-tight">{item.code}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Expires: {formatDate(item.expiresAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.usedBy ? `Used by: ${item.usedBy.username}` : "Not used yet"}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <AdminStatusPill
                      label={item.isEnabled ? "Enabled" : "Disabled"}
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
                        {item.isEnabled ? "Disable" : "Enable"}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-border/70 bg-background/30 px-4 py-12 text-center text-sm text-muted-foreground">
            No invite codes yet.
          </div>
        )}
      </AdminSurface>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AdminSectionShell
      description="Invite codes are used for closed registration and can only be applied once."
      eyebrow="INVITE"
      id="invite-codes"
      title="Invite Codes"
    >
      {content}
    </AdminSectionShell>
  );
}

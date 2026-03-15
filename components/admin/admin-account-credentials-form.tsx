"use client";

import { usePathname } from "next/navigation";

import { updateAdminCredentialsAction } from "@/app/admin/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
};

function Field({ id, label, hint, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AdminAccountCredentialsForm({
  currentUsername,
  submitLabel = "Save account data",
}: {
  currentUsername: string;
  submitLabel?: string;
}) {
  const pathname = usePathname() ?? "/admin";

  return (
    <form action={updateAdminCredentialsAction} className="space-y-6">
      <input name="returnPath" type="hidden" value={pathname} />

      <div className="rounded-card border border-border/70 bg-background/40 p-card-compact md:p-card-compact-md">
        <p className="text-sm text-muted-foreground">Current username</p>
        <p className="mt-1 text-base font-semibold tracking-tight">{currentUsername}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="admin-current-password" label="Current password">
          <Input
            id="admin-current-password"
            name="currentPassword"
            placeholder="Enter current password"
            required
            type="password"
          />
        </Field>

        <Field
          hint="Leave empty if you do not want to change username."
          id="admin-next-username"
          label="New username"
        >
          <Input
            id="admin-next-username"
            maxLength={32}
            minLength={3}
            name="nextUsername"
            pattern="[a-z0-9_]+"
            placeholder="new_admin"
          />
        </Field>

        <Field hint="Minimum length is 8 characters." id="admin-next-password" label="New password">
          <Input
            id="admin-next-password"
            minLength={8}
            name="nextPassword"
            placeholder="Minimum 8 characters"
            type="password"
          />
        </Field>

        <Field id="admin-next-password-confirmation" label="Confirm new password">
          <Input
            id="admin-next-password-confirmation"
            minLength={8}
            name="nextPasswordConfirmation"
            placeholder="Repeat new password"
            type="password"
          />
        </Field>
      </div>

      <div className="flex justify-start">
        <Button className="h-button px-button-x" radius="card" type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

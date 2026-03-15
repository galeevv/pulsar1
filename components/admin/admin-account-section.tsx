import { AdminAccountCredentialsForm } from "@/components/admin/admin-account-credentials-form";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

export function AdminAccountSection({
  currentUsername,
}: {
  currentUsername: string;
}) {
  return (
    <AdminSectionShell
      description="Manage administrator login and password. Current password is required for every change."
      eyebrow="SECURITY"
      id="account"
      title="Administrator credentials"
    >
      <AdminSurface>
        <AdminAccountCredentialsForm currentUsername={currentUsername} />
      </AdminSurface>
    </AdminSectionShell>
  );
}

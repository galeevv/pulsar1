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
    return "No expiration";
  }

  return value.toLocaleString("ru-RU");
}

export function AdminReferralCodesSection({
  referralCodes,
  referralProgramSettings,
  embedded = false,
}: {
  referralCodes: ReferralCodeItem[];
  referralProgramSettings: ReferralProgramSettings;
  embedded?: boolean;
}) {
  const content = (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="space-y-6">
        <AdminSurface>
          <form action={updateReferralProgramSettingsAction} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Global referral settings</h3>
              <p className="text-sm text-muted-foreground">
                Used when users generate referral codes from their account area.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-card border border-border/70 bg-background/40 p-card-compact md:p-card-compact-md">
              <div className="space-y-1">
                <p className="text-sm font-medium">Referral system</p>
                <p className="text-xs text-muted-foreground">Global on/off switch.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input defaultChecked={referralProgramSettings.isEnabled} name="isEnabled" type="checkbox" />
                Enabled
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="referral-default-discount">
                New user discount (%)
              </label>
              <Input
                defaultValue={referralProgramSettings.defaultDiscountPct}
                id="referral-default-discount"
                max="100"
                min="1"
                name="defaultDiscountPct"
                required
                type="number"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="referral-default-reward">
                Referrer reward (credits)
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
              Save global settings
            </Button>
          </form>
        </AdminSurface>

        <AdminSurface>
          <form action={createReferralCodeAction} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Create custom referral code</h3>
              <p className="text-sm text-muted-foreground">
                Create campaign-specific referral codes with custom values.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="referral-code-value">
                Code
              </label>
              <Input id="referral-code-value" name="code" placeholder="Leave empty for auto generation" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="referral-code-discount">
                First purchase discount (%)
              </label>
              <Input
                id="referral-code-discount"
                max="100"
                min="1"
                name="discountPct"
                required
                type="number"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="referral-code-reward">
                Referrer reward (credits)
              </label>
              <Input id="referral-code-reward" min="1" name="rewardCredits" required type="number" />
            </div>

            <AdminDatePickerField label="Expiration date" name="expiresAt" />

            <Button className="h-button w-full px-button-x" radius="card" type="submit">
              Create referral code
            </Button>
          </form>
        </AdminSurface>
      </div>

      <AdminSurface>
        {referralCodes.length ? (
          <div className="space-y-3">
            {referralCodes.map((item) => (
              <div
                className="rounded-card border border-border/70 bg-background/45 p-card-compact md:p-card-compact-md"
                key={item.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold tracking-tight">{item.code}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Discount {item.discountPct}% • reward {item.rewardCredits} credits
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Uses: {item._count.uses} • owner: {item.ownerUser?.username ?? "ADMIN"}
                    </p>
                    <p className="text-sm text-muted-foreground">Expires: {formatDate(item.expiresAt)}</p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <AdminStatusPill
                      label={item.isEnabled ? "Enabled" : "Disabled"}
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
            No referral codes yet.
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
      description="Referral codes are reusable and can be generated by users after first successful payment."
      eyebrow="REFERRAL"
      id="referral-codes"
      title="Referral Codes"
    >
      {content}
    </AdminSectionShell>
  );
}

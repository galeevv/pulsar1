import { createPromoCodeAction, togglePromoCodeAction } from "@/app/admin/actions";
import { AdminDatePickerField } from "@/components/admin/admin-date-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type PromoCodeItem = {
  _count: { redemptions: number };
  code: string;
  createdAt: Date;
  creditAmount: number;
  expiresAt: Date | null;
  id: string;
  isEnabled: boolean;
  maxRedemptions: number;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "No expiration";
  }

  return value.toLocaleString("ru-RU");
}

export function AdminPromoCodesSection({
  promoCodes,
  embedded = false,
}: {
  promoCodes: PromoCodeItem[];
  embedded?: boolean;
}) {
  const content = (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <AdminSurface>
        <form action={createPromoCodeAction} className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Create promo code</h3>
            <p className="text-sm text-muted-foreground">
              Configure credit amount, redemption limit and expiration date.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="promo-code-value">
              Code
            </label>
            <Input id="promo-code-value" name="code" placeholder="Leave empty for auto generation" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="promo-code-credits">
              Credit amount
            </label>
            <Input id="promo-code-credits" min="1" name="creditAmount" required type="number" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="promo-code-limit">
              Max redemptions
            </label>
            <Input id="promo-code-limit" min="1" name="maxRedemptions" required type="number" />
          </div>

          <AdminDatePickerField label="Expiration date" name="expiresAt" />

          <Button className="h-button w-full px-button-x" radius="card" type="submit">
            Create promo code
          </Button>
        </form>
      </AdminSurface>

      <AdminSurface>
        {promoCodes.length ? (
          <div className="space-y-3">
            {promoCodes.map((item) => (
              <div
                className="rounded-card border border-border/70 bg-background/45 p-card-compact md:p-card-compact-md"
                key={item.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold tracking-tight">{item.code}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      +{item.creditAmount} credits
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Used: {item._count.redemptions} / {item.maxRedemptions}
                    </p>
                    <p className="text-sm text-muted-foreground">Expires: {formatDate(item.expiresAt)}</p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <AdminStatusPill
                      label={item.isEnabled ? "Enabled" : "Disabled"}
                      tone={item.isEnabled ? "success" : "default"}
                    />
                    <form action={togglePromoCodeAction}>
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
            No promo codes yet.
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
      description="Promo codes top up user balance with a fixed amount of internal credits."
      eyebrow="PROMO"
      id="promocodes"
      title="Promo Codes"
    >
      {content}
    </AdminSectionShell>
  );
}

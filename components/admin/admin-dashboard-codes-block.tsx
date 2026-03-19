import {
  createInviteCodeAction,
  createPromoCodeAction,
  createReferralCodeAction,
} from "@/app/admin/actions";
import { AdminDatePickerField } from "@/components/admin/admin-date-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdminCopyCodeButton } from "./admin-copy-code-button";

function PreviewCard({
  code,
  placeholder,
  title,
}: {
  code?: string;
  placeholder: string;
  title: string;
}) {
  return (
    <div className="flex h-full flex-col justify-between rounded-card border border-border/70 bg-background/35 p-4">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        <p className="rounded-card border border-border/70 bg-background/40 px-3 py-2 font-mono text-sm font-medium tracking-[0.08em]">
          {code || placeholder}
        </p>
      </div>
      <AdminCopyCodeButton value={code} />
    </div>
  );
}

export function AdminDashboardCodesBlock() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Codes</h3>
        <p className="text-sm text-muted-foreground">Create and preview registration and marketing codes.</p>
      </div>

      <Tabs className="gap-4" defaultValue="referral">
        <TabsList className="grid h-10 w-full grid-cols-3 rounded-card border border-border bg-background/40 p-0" variant="default">
          <TabsTrigger value="referral">Referral Codes</TabsTrigger>
          <TabsTrigger value="invite">Invite Codes</TabsTrigger>
          <TabsTrigger value="promo">Promo Codes</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-0" value="invite">
          <div className="grid gap-4 md:grid-cols-2">
            <form action={createInviteCodeAction} className="space-y-4">
              <input name="redirectPath" type="hidden" value="/admin" />

              <div>
                <h4 className="text-base font-semibold">Create Invite</h4>
                <p className="text-sm text-muted-foreground">Single-use access tokens for priority users.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Code</label>
                <Input
                  className="h-input border-border/70 bg-background/40"
                  name="code"
                  placeholder="Leave empty for auto generation"
                />
              </div>

              <AdminDatePickerField label="Expiration date" name="expiresAt" />

              <Button className="w-full" radius="card" type="submit">
                Generate Invite
              </Button>
            </form>

            <PreviewCard
              placeholder="Code will be generated only after click on Generate Invite."
              title="Invite preview"
            />
          </div>
        </TabsContent>

        <TabsContent className="mt-0" value="referral">
          <div className="grid gap-4 md:grid-cols-2">
            <form action={createReferralCodeAction} className="space-y-4">
              <input name="redirectPath" type="hidden" value="/admin" />

              <div>
                <h4 className="text-base font-semibold">Create Referral</h4>
                <p className="text-sm text-muted-foreground">Reusable rewards-based code for invited users.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Code</label>
                <Input
                  className="h-input border-border/70 bg-background/40"
                  name="code"
                  placeholder="Leave empty for auto generation"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Discount %</label>
                  <Input
                    className="h-input border-border/70 bg-background/40"
                    defaultValue={50}
                    min={1}
                    name="discountPct"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Reward credits</label>
                  <Input
                    className="h-input border-border/70 bg-background/40"
                    defaultValue={100}
                    min={1}
                    name="rewardCredits"
                    type="number"
                  />
                </div>
              </div>

              <AdminDatePickerField label="Expiration date" name="expiresAt" />

              <Button className="w-full" radius="card" type="submit">
                Generate Referral
              </Button>
            </form>

            <PreviewCard
              placeholder="Code will be generated only after click on Generate Referral."
              title="Referral preview"
            />
          </div>
        </TabsContent>

        <TabsContent className="mt-0" value="promo">
          <div className="grid gap-4 md:grid-cols-2">
            <form action={createPromoCodeAction} className="space-y-4">
              <input name="redirectPath" type="hidden" value="/admin" />

              <div>
                <h4 className="text-base font-semibold">Create Promo</h4>
                <p className="text-sm text-muted-foreground">Credit top-up code with a controlled redemption limit.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Code</label>
                <Input
                  className="h-input border-border/70 bg-background/40"
                  name="code"
                  placeholder="Leave empty for auto generation"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Credits amount</label>
                  <Input
                    className="h-input border-border/70 bg-background/40"
                    defaultValue={500}
                    min={1}
                    name="creditAmount"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Max redemptions</label>
                  <Input
                    className="h-input border-border/70 bg-background/40"
                    defaultValue={25}
                    min={1}
                    name="maxRedemptions"
                    type="number"
                  />
                </div>
              </div>

              <AdminDatePickerField label="Expiration date" name="expiresAt" />

              <Button className="w-full" radius="card" type="submit">
                Generate Promo
              </Button>
            </form>

            <PreviewCard
              placeholder="Code will be generated only after click on Generate Promo."
              title="Promo preview"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

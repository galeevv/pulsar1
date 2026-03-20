"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Check, Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AdminPaymentRow } from "@/lib/admin/admin-payments-types";

import {
  formatBooleanState,
  formatNullableText,
  formatPaymentDateTime,
  formatPercent,
  formatRub,
  getPaymentMethodLabel,
  getPaymentMethodVariant,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  getSubscriptionOutcomeLabel,
  getSubscriptionOutcomeVariant,
} from "./admin-payments-presenters";

function CopyValueButton({
  value,
}: {
  value: string | null;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      disabled={!value}
      onClick={handleCopy}
      radius="card"
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      <span className="sr-only">Copy value</span>
    </Button>
  );
}

function DetailsBlock({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-3 rounded-card border border-border/70 bg-background/30 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0">{value}</div>
    </div>
  );
}

export function AdminPaymentDetailsSheet({
  onOpenChange,
  open,
  payment,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  payment: AdminPaymentRow | null;
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/70 px-4 py-4">
          <SheetTitle>Payment details</SheetTitle>
          <SheetDescription>
            Read-only audit view for payment request data, snapshots and outcomes.
          </SheetDescription>
        </SheetHeader>

        {payment ? (
          <div className="space-y-4 p-4">
            <DetailsBlock title="Payment info">
              <KeyValue
                label="Internal ID"
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{payment.id}</span>
                    <CopyValueButton value={payment.id} />
                  </div>
                }
              />
              <KeyValue
                label="External ID"
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {formatNullableText(payment.externalPaymentId)}
                    </span>
                    <CopyValueButton value={payment.externalPaymentId} />
                  </div>
                }
              />
              <KeyValue
                label="Status"
                value={
                  <Badge variant={getPaymentStatusVariant(payment.status)}>
                    {getPaymentStatusLabel(payment.status)}
                  </Badge>
                }
              />
              <KeyValue
                label="Method"
                value={
                  <Badge variant={getPaymentMethodVariant(payment.method)}>
                    {getPaymentMethodLabel(payment.method)}
                  </Badge>
                }
              />
              <KeyValue label="Created at" value={formatPaymentDateTime(payment.createdAt)} />
              <KeyValue label="Updated at" value={formatPaymentDateTime(payment.updatedAt)} />
            </DetailsBlock>

            <DetailsBlock title="User">
              <KeyValue label="Username" value={formatNullableText(payment.username)} />
              <KeyValue label="User ID" value={<span className="font-mono text-xs">{payment.userId}</span>} />
              <KeyValue
                label="Telegram ID"
                value={formatNullableText(payment.details.user.telegramId)}
              />

              <div className="pt-1">
                <Button asChild radius="card" size="sm" type="button" variant="outline">
                  <Link href={`/admin/users?q=${encodeURIComponent(payment.username ?? payment.userId)}`}>
                    Open in Users
                  </Link>
                </Button>
              </div>
            </DetailsBlock>

            <DetailsBlock title="Pricing snapshot">
              {payment.details.pricingSnapshot ? (
                <div className="space-y-2">
                  <KeyValue
                    label="Months"
                    value={formatNullableText(
                      payment.details.pricingSnapshot.months?.toString() ?? null
                    )}
                  />
                  <KeyValue
                    label="Devices"
                    value={formatNullableText(
                      payment.details.pricingSnapshot.devices?.toString() ?? null
                    )}
                  />
                  <KeyValue
                    label="VPN monthly price"
                    value={formatRub(payment.details.pricingSnapshot.vpnMonthlyPrice ?? null)}
                  />
                  <KeyValue
                    label="Devices monthly price"
                    value={formatRub(payment.details.pricingSnapshot.devicesMonthlyPrice ?? null)}
                  />
                  <KeyValue
                    label="Duration discount"
                    value={formatPercent(
                      payment.details.pricingSnapshot.durationDiscountPercent ?? null
                    )}
                  />
                  <KeyValue
                    label="Referral discount"
                    value={formatPercent(
                      payment.details.pricingSnapshot.referralDiscountPercent ?? null
                    )}
                  />
                  <KeyValue
                    label="Applied referral discount"
                    value={formatPercent(
                      payment.details.pricingSnapshot.appliedReferralDiscountPercent ?? null
                    )}
                  />
                  <KeyValue
                    label="Total before discount"
                    value={formatRub(payment.details.pricingSnapshot.totalBeforeDiscountRub ?? null)}
                  />
                  <KeyValue
                    label="After duration discount"
                    value={formatRub(
                      payment.details.pricingSnapshot.totalAfterDurationDiscountRub ?? null
                    )}
                  />
                  <KeyValue
                    label="Final total"
                    value={formatRub(payment.details.pricingSnapshot.finalTotalRub ?? null)}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Pricing snapshot is not available.</p>
              )}
            </DetailsBlock>

            <DetailsBlock title="Subscription outcome">
              <KeyValue
                label="Created / issued"
                value={
                  <Badge variant={getSubscriptionOutcomeVariant(payment.subscriptionOutcome)}>
                    {getSubscriptionOutcomeLabel(payment.subscriptionOutcome)}
                  </Badge>
                }
              />
              <KeyValue
                label="Subscription ID"
                value={
                  payment.details.subscription ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{payment.details.subscription.id}</span>
                      <CopyValueButton value={payment.details.subscription.id} />
                    </div>
                  ) : (
                    "-"
                  )
                }
              />
              <KeyValue
                label="Starts at"
                value={
                  payment.details.subscription?.startsAt
                    ? formatPaymentDateTime(payment.details.subscription.startsAt)
                    : "-"
                }
              />
              <KeyValue
                label="Ends at"
                value={
                  payment.details.subscription?.endsAt
                    ? formatPaymentDateTime(payment.details.subscription.endsAt)
                    : "-"
                }
              />
              <KeyValue
                label="Devices"
                value={
                  payment.details.subscription
                    ? `${payment.details.subscription.devices ?? "-"} / ${
                        payment.details.subscription.maxDevices ?? "-"
                      }`
                    : "-"
                }
              />
            </DetailsBlock>

            <DetailsBlock title="Referral outcome">
              <KeyValue
                label="Reward applied"
                value={formatBooleanState(payment.details.referral?.rewardApplied ?? null)}
              />
              <KeyValue
                label="Referral label"
                value={formatNullableText(payment.details.referral?.label ?? null)}
              />
            </DetailsBlock>

            <DetailsBlock title="Webhook / sync notes">
              {payment.details.webhook ? (
                <>
                  <KeyValue
                    label="Webhook received"
                    value={formatBooleanState(payment.details.webhook.received)}
                  />
                  <KeyValue
                    label="Last webhook status"
                    value={formatNullableText(payment.details.webhook.status ?? null)}
                  />
                  <KeyValue
                    label="Sync status"
                    value="Unknown"
                  />
                  <KeyValue
                    label="Last error snippet"
                    value={
                      <p className="break-words text-sm text-muted-foreground">
                        {formatNullableText(payment.details.webhook.lastError ?? null)}
                      </p>
                    }
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {payment.method === "credits"
                    ? "Webhook data is not applicable for Credits payments."
                    : "Webhook data is unavailable for this payment."}
                </p>
              )}
            </DetailsBlock>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}


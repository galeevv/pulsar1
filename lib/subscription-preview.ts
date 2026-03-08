import { calculateSubscriptionPrice } from "@/lib/subscription-pricing";

export type SubscriptionDurationPreviewRule = {
  discountPercent: number;
  monthlyPrice: number;
  months: number;
};

export type SubscriptionPricingPreviewSettings = {
  baseDeviceMonthlyPrice: number;
  extraDeviceMonthlyPrice: number;
};

export function calculateAppSubscriptionPreviewPrice(input: {
  devices: number;
  firstPurchaseDiscountPct: number;
  pricingSettings: SubscriptionPricingPreviewSettings;
  rule: SubscriptionDurationPreviewRule;
}) {
  return calculateSubscriptionPrice({
    baseDeviceMonthlyPrice: input.pricingSettings.baseDeviceMonthlyPrice,
    devices: input.devices,
    durationDiscountPercent: input.rule.discountPercent,
    extraDeviceMonthlyPrice: input.pricingSettings.extraDeviceMonthlyPrice,
    months: input.rule.months,
    referralDiscountPercent: input.firstPurchaseDiscountPct,
    vpnMonthlyPrice: input.rule.monthlyPrice,
  });
}

export function calculateAdminSubscriptionPreviewPrice(input: {
  baseDeviceMonthlyPrice: number;
  devices: number;
  discountPercent: number;
  extraDeviceMonthlyPrice: number;
  months: number;
  vpnMonthlyPrice: number;
}) {
  return calculateSubscriptionPrice({
    baseDeviceMonthlyPrice: input.baseDeviceMonthlyPrice,
    devices: input.devices,
    durationDiscountPercent: input.discountPercent,
    extraDeviceMonthlyPrice: input.extraDeviceMonthlyPrice,
    months: input.months,
    vpnMonthlyPrice: input.vpnMonthlyPrice,
  });
}

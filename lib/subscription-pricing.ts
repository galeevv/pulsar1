export type CalculateSubscriptionPriceInput = {
  baseDeviceMonthlyPrice: number;
  devices: number;
  durationDiscountPercent: number;
  extraDeviceMonthlyPrice: number;
  months: number;
  referralDiscountPercent?: number;
  vpnMonthlyPrice: number;
};

function normalizePercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function applyPercentDiscount(amountRub: number, discountPercent: number) {
  const normalized = normalizePercent(discountPercent);
  return Math.max(0, Math.round((amountRub * (100 - normalized)) / 100));
}

export function calculateSubscriptionPrice(input: CalculateSubscriptionPriceInput) {
  const durationDiscountPercent = normalizePercent(input.durationDiscountPercent);
  const referralDiscountPercent = normalizePercent(input.referralDiscountPercent ?? 0);
  const devices = Math.max(1, Math.floor(input.devices));
  const months = Math.max(1, Math.floor(input.months));
  const baseDeviceMonthlyPrice = Math.max(0, Math.floor(input.baseDeviceMonthlyPrice));
  const extraDeviceMonthlyPrice = Math.max(0, Math.floor(input.extraDeviceMonthlyPrice));
  const vpnMonthlyPrice = Math.max(0, Math.floor(input.vpnMonthlyPrice));

  const devicesMonthlyPrice =
    baseDeviceMonthlyPrice + Math.max(0, devices - 1) * extraDeviceMonthlyPrice;
  const monthlyPrice = vpnMonthlyPrice + devicesMonthlyPrice;
  const totalBeforeDiscountRub = monthlyPrice * months;
  const vpnTotalBeforeDurationDiscountRub = vpnMonthlyPrice * months;
  const vpnTotalAfterDurationDiscountRub = applyPercentDiscount(
    vpnTotalBeforeDurationDiscountRub,
    durationDiscountPercent
  );
  const devicesTotalRub = devicesMonthlyPrice * months;
  const totalAfterDurationDiscountRub = vpnTotalAfterDurationDiscountRub + devicesTotalRub;
  const appliedReferralDiscountPercent = months === 1 ? referralDiscountPercent : 0;
  const finalTotalRub = applyPercentDiscount(
    totalAfterDurationDiscountRub,
    appliedReferralDiscountPercent
  );

  return {
    baseDeviceMonthlyPrice,
    devices,
    devicesMonthlyPrice,
    durationDiscountPercent,
    extraDeviceMonthlyPrice,
    finalTotalRub,
    monthlyPrice,
    months,
    referralDiscountPercent: appliedReferralDiscountPercent,
    totalAfterDurationDiscountRub,
    totalBeforeDiscountRub,
    vpnMonthlyPrice,
  };
}

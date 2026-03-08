import { calculateSubscriptionPrice } from "@/lib/subscription-pricing";
import { describe, expect, it } from "vitest";

describe("calculateSubscriptionPrice", () => {
  it("calculates full constructor price with duration and referral discounts", () => {
    const result = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: 299,
      devices: 3,
      durationDiscountPercent: 10,
      extraDeviceMonthlyPrice: 100,
      months: 6,
      referralDiscountPercent: 20,
      vpnMonthlyPrice: 400,
    });

    expect(result.devicesMonthlyPrice).toBe(499);
    expect(result.monthlyPrice).toBe(899);
    expect(result.totalBeforeDiscountRub).toBe(5394);
    expect(result.totalAfterDurationDiscountRub).toBe(5154);
    expect(result.finalTotalRub).toBe(5082);
  });

  it("normalizes boundary values: floors numbers and clamps invalid ranges", () => {
    const result = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: -10,
      devices: 0.9,
      durationDiscountPercent: -5,
      extraDeviceMonthlyPrice: -99,
      months: 0,
      referralDiscountPercent: 130,
      vpnMonthlyPrice: 20.8,
    });

    expect(result.baseDeviceMonthlyPrice).toBe(0);
    expect(result.extraDeviceMonthlyPrice).toBe(0);
    expect(result.devices).toBe(1);
    expect(result.months).toBe(1);
    expect(result.vpnMonthlyPrice).toBe(20);
    expect(result.durationDiscountPercent).toBe(0);
    expect(result.referralDiscountPercent).toBe(100);
    expect(result.totalBeforeDiscountRub).toBe(20);
    expect(result.finalTotalRub).toBe(0);
  });

  it("applies rounding on each discount stage", () => {
    const result = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: 0,
      devices: 1,
      durationDiscountPercent: 33,
      extraDeviceMonthlyPrice: 0,
      months: 3,
      referralDiscountPercent: 10,
      vpnMonthlyPrice: 333,
    });

    expect(result.totalBeforeDiscountRub).toBe(999);
    expect(result.totalAfterDurationDiscountRub).toBe(669);
    expect(result.finalTotalRub).toBe(647);
  });

  it("does not apply duration discount to device component", () => {
    const result = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: 100,
      devices: 3,
      durationDiscountPercent: 50,
      extraDeviceMonthlyPrice: 50,
      months: 2,
      referralDiscountPercent: 0,
      vpnMonthlyPrice: 200,
    });

    // devicesMonthlyPrice = 100 + (3 - 1) * 50 = 200
    // devices total for 2 months = 400 (no duration discount)
    // vpn total = 200 * 2 = 400, after 50% = 200
    // totalAfterDuration = 400 + 200 = 600
    expect(result.devicesMonthlyPrice).toBe(200);
    expect(result.totalBeforeDiscountRub).toBe(800);
    expect(result.totalAfterDurationDiscountRub).toBe(600);
    expect(result.finalTotalRub).toBe(600);
  });

  it("rounds discount percentages to integers before applying", () => {
    const result = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: 0,
      devices: 1,
      durationDiscountPercent: 12.6,
      extraDeviceMonthlyPrice: 0,
      months: 1,
      referralDiscountPercent: 9.5,
      vpnMonthlyPrice: 1000,
    });

    expect(result.durationDiscountPercent).toBe(13);
    expect(result.referralDiscountPercent).toBe(10);
    expect(result.totalAfterDurationDiscountRub).toBe(870);
    expect(result.finalTotalRub).toBe(783);
  });

  it("applies referral discount only to first month VPN amount", () => {
    const result = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: 100,
      devices: 2,
      durationDiscountPercent: 0,
      extraDeviceMonthlyPrice: 50,
      months: 3,
      referralDiscountPercent: 50,
      vpnMonthlyPrice: 300,
    });

    // devicesMonthlyPrice = 150, devicesTotal = 450
    // vpnTotalAfterDuration = 900
    // totalAfterDuration = 1350
    // referral applies only to first month vpn (300), discount amount = 150
    // final = 1350 - 150 = 1200
    expect(result.totalAfterDurationDiscountRub).toBe(1350);
    expect(result.finalTotalRub).toBe(1200);
  });
});

import { calculateSubscriptionPrice } from "@/lib/subscription-pricing";
import { describe, expect, it } from "vitest";

describe("calculateSubscriptionPrice", () => {
  it("calculates full constructor price and disables referral for multi-month period", () => {
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
    expect(result.referralDiscountPercent).toBe(0);
    expect(result.finalTotalRub).toBe(5154);
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
    expect(result.referralDiscountPercent).toBe(0);
    expect(result.finalTotalRub).toBe(669);
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

  it("does not apply referral discount for periods longer than one month", () => {
    const result = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: 100,
      devices: 2,
      durationDiscountPercent: 0,
      extraDeviceMonthlyPrice: 50,
      months: 3,
      referralDiscountPercent: 50,
      vpnMonthlyPrice: 300,
    });

    expect(result.totalAfterDurationDiscountRub).toBe(1350);
    expect(result.referralDiscountPercent).toBe(0);
    expect(result.finalTotalRub).toBe(1350);
  });

  it("applies referral discount to the full total for 1-month plans", () => {
    const result = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: 70,
      devices: 2,
      durationDiscountPercent: 10,
      extraDeviceMonthlyPrice: 30,
      months: 1,
      referralDiscountPercent: 50,
      vpnMonthlyPrice: 100,
    });

    // devicesMonthlyPrice = 70 + 30 = 100
    // vpn after duration discount = 100 - 10% = 90
    // totalAfterDuration = 90 + 100 = 190
    // final with referral 50% = 95
    expect(result.totalAfterDurationDiscountRub).toBe(190);
    expect(result.referralDiscountPercent).toBe(50);
    expect(result.finalTotalRub).toBe(95);
  });
});

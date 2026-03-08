import {
  calculateAdminSubscriptionPreviewPrice,
  calculateAppSubscriptionPreviewPrice,
} from "@/lib/subscription-preview";
import { calculateSubscriptionPrice } from "@/lib/subscription-pricing";
import { describe, expect, it } from "vitest";

describe("subscription preview parity", () => {
  it("keeps parity between /admin preview, /app preview and server calculation when referral discount is 0", () => {
    const rule = {
      discountPercent: 15,
      monthlyPrice: 450,
      months: 6,
    };
    const pricingSettings = {
      baseDeviceMonthlyPrice: 299,
      extraDeviceMonthlyPrice: 120,
    };
    const devices = 4;

    const appPreview = calculateAppSubscriptionPreviewPrice({
      devices,
      firstPurchaseDiscountPct: 0,
      pricingSettings,
      rule,
    });
    const adminPreview = calculateAdminSubscriptionPreviewPrice({
      baseDeviceMonthlyPrice: pricingSettings.baseDeviceMonthlyPrice,
      devices,
      discountPercent: rule.discountPercent,
      extraDeviceMonthlyPrice: pricingSettings.extraDeviceMonthlyPrice,
      months: rule.months,
      vpnMonthlyPrice: rule.monthlyPrice,
    });
    const serverPrice = calculateSubscriptionPrice({
      baseDeviceMonthlyPrice: pricingSettings.baseDeviceMonthlyPrice,
      devices,
      durationDiscountPercent: rule.discountPercent,
      extraDeviceMonthlyPrice: pricingSettings.extraDeviceMonthlyPrice,
      months: rule.months,
      referralDiscountPercent: 0,
      vpnMonthlyPrice: rule.monthlyPrice,
    });

    expect(appPreview).toEqual(serverPrice);
    expect(adminPreview).toEqual(serverPrice);
    expect(appPreview).toEqual(adminPreview);
  });

  it("keeps parity across multiple constructor combinations (without referral discount)", () => {
    const scenarios = [
      { base: 250, devices: 1, discount: 0, extra: 100, months: 1, vpn: 300 },
      { base: 250, devices: 2, discount: 5, extra: 100, months: 3, vpn: 350 },
      { base: 350, devices: 5, discount: 20, extra: 90, months: 12, vpn: 500 },
      { base: 0, devices: 10, discount: 33, extra: 200, months: 6, vpn: 700 },
    ];

    for (const item of scenarios) {
      const appPreview = calculateAppSubscriptionPreviewPrice({
        devices: item.devices,
        firstPurchaseDiscountPct: 0,
        pricingSettings: {
          baseDeviceMonthlyPrice: item.base,
          extraDeviceMonthlyPrice: item.extra,
        },
        rule: {
          discountPercent: item.discount,
          monthlyPrice: item.vpn,
          months: item.months,
        },
      });
      const adminPreview = calculateAdminSubscriptionPreviewPrice({
        baseDeviceMonthlyPrice: item.base,
        devices: item.devices,
        discountPercent: item.discount,
        extraDeviceMonthlyPrice: item.extra,
        months: item.months,
        vpnMonthlyPrice: item.vpn,
      });
      const serverPrice = calculateSubscriptionPrice({
        baseDeviceMonthlyPrice: item.base,
        devices: item.devices,
        durationDiscountPercent: item.discount,
        extraDeviceMonthlyPrice: item.extra,
        months: item.months,
        referralDiscountPercent: 0,
        vpnMonthlyPrice: item.vpn,
      });

      expect(appPreview).toEqual(serverPrice);
      expect(adminPreview).toEqual(serverPrice);
      expect(appPreview.finalTotalRub).toBe(adminPreview.finalTotalRub);
    }
  });
});

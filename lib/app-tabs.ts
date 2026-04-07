export type AppTab = "home" | "devices" | "referrals" | "profile"

const APP_TABS: AppTab[] = ["home", "devices", "referrals", "profile"]

export function normalizeAppTab(value: string | undefined | null): AppTab {
  if (!value) {
    return "home"
  }

  const normalized = value.trim().toLowerCase()
  return APP_TABS.includes(normalized as AppTab) ? (normalized as AppTab) : "home"
}

export function mapLegacyDialogToAppTab(
  dialog: "promo" | "referral" | null | undefined
): AppTab | null {
  if (dialog === "referral") {
    return "referrals"
  }

  if (dialog === "promo") {
    return "profile"
  }

  return null
}

export function mapLegacyAnchorToAppTab(anchor: string | undefined): AppTab {
  if (!anchor) {
    return "home"
  }

  const normalized = anchor.replace(/^#/, "").trim().toLowerCase()

  if (normalized.includes("device")) {
    return "devices"
  }

  if (normalized.includes("referral")) {
    return "referrals"
  }

  if (normalized.includes("profile") || normalized.includes("support") || normalized.includes("legal")) {
    return "profile"
  }

  return "home"
}

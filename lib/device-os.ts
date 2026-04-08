export const DEVICE_OS_VALUES = [
  "ANDROID",
  "IOS",
  "WINDOWS",
  "MACOS",
  "UNKNOWN",
] as const

export type DeviceOsValue = (typeof DEVICE_OS_VALUES)[number]
export const DEVICE_OS_SELECTABLE_VALUES = [
  "ANDROID",
  "IOS",
  "WINDOWS",
  "MACOS",
] as const
export type SelectableDeviceOsValue = (typeof DEVICE_OS_SELECTABLE_VALUES)[number]

export const DEVICE_OS_LABELS: Record<DeviceOsValue, string> = {
  ANDROID: "Android",
  IOS: "iOS",
  MACOS: "macOS",
  UNKNOWN: "Неизвестно",
  WINDOWS: "Windows",
}

export function getDeviceOsLabel(value: DeviceOsValue | null | undefined) {
  if (!value) {
    return DEVICE_OS_LABELS.UNKNOWN
  }

  return DEVICE_OS_LABELS[value] ?? DEVICE_OS_LABELS.UNKNOWN
}

export function parseDeviceOsValue(
  value: string | null | undefined,
  fallback: DeviceOsValue = "UNKNOWN"
): DeviceOsValue {
  if (!value) {
    return fallback
  }

  const normalized = value.trim().toUpperCase()
  return DEVICE_OS_VALUES.includes(normalized as DeviceOsValue)
    ? (normalized as DeviceOsValue)
    : fallback
}

export function parseSelectableDeviceOsValue(
  value: string | null | undefined,
  fallback: SelectableDeviceOsValue | null = null
) {
  if (!value) {
    return fallback
  }

  const normalized = value.trim().toUpperCase()
  return DEVICE_OS_SELECTABLE_VALUES.includes(normalized as SelectableDeviceOsValue)
    ? (normalized as SelectableDeviceOsValue)
    : fallback
}

export function mapSetupPlatformToDeviceOs(value: string): DeviceOsValue {
  const normalized = value.trim().toUpperCase()

  if (normalized === "ANDROID") {
    return "ANDROID"
  }

  if (normalized === "IOS") {
    return "IOS"
  }

  if (normalized === "MACOS") {
    return "MACOS"
  }

  if (normalized === "WINDOWS") {
    return "WINDOWS"
  }

  return "UNKNOWN"
}

export function detectDeviceOsFromUserAgent(userAgent: string | null | undefined): DeviceOsValue {
  const normalized = userAgent?.toLowerCase() ?? ""

  if (!normalized) {
    return "UNKNOWN"
  }

  if (normalized.includes("android")) {
    return "ANDROID"
  }

  if (
    normalized.includes("iphone") ||
    normalized.includes("ipad") ||
    normalized.includes("ipod")
  ) {
    return "IOS"
  }

  if (normalized.includes("mac os")) {
    return "MACOS"
  }

  if (normalized.includes("windows")) {
    return "WINDOWS"
  }

  return "UNKNOWN"
}

export function detectDeviceOsFromNavigator(): DeviceOsValue {
  if (typeof navigator === "undefined") {
    return "UNKNOWN"
  }

  return detectDeviceOsFromUserAgent(navigator.userAgent)
}

export function detectSelectableDeviceOsFromNavigator(
  fallback: SelectableDeviceOsValue = "WINDOWS"
) {
  const detected = detectDeviceOsFromNavigator()
  return parseSelectableDeviceOsValue(detected, fallback) ?? fallback
}

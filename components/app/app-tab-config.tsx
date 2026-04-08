import { HomeIcon, SmartphoneIcon, UserCircle2Icon, UsersIcon } from "lucide-react"

import type { AppTab } from "@/lib/app-tabs"

export const APP_TAB_ITEMS: Array<{
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  id: AppTab
  label: string
}> = [
  {
    description: "Главная",
    href: "/app?tab=home",
    icon: HomeIcon,
    id: "home",
    label: "Главная",
  },
  {
    description: "Устройства",
    href: "/app?tab=devices",
    icon: SmartphoneIcon,
    id: "devices",
    label: "Устройства",
  },
  {
    description: "Рефералы",
    href: "/app?tab=referrals",
    icon: UsersIcon,
    id: "referrals",
    label: "Рефералы",
  },
  {
    description: "Профиль",
    href: "/app?tab=profile",
    icon: UserCircle2Icon,
    id: "profile",
    label: "Профиль",
  },
]

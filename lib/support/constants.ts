export const SUPPORT_TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "closed",
] as const

export const SUPPORT_TICKET_CATEGORIES = [
  "payment",
  "subscription",
  "connection",
  "app",
  "technical",
  "other",
] as const

export const SUPPORT_SENDER_TYPES = ["user", "admin"] as const

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number]
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number]
export type SupportSenderType = (typeof SUPPORT_SENDER_TYPES)[number]

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "Открыт",
  in_progress: "В работе",
  waiting_user: "Ожидает вас",
  closed: "Закрыт",
}

export const SUPPORT_TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  payment: "Оплата",
  subscription: "Подписка",
  connection: "Подключение",
  app: "Приложение",
  technical: "Техническая проблема",
  other: "Другое",
}

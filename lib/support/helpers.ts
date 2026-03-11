import {
  SUPPORT_TICKET_CATEGORY_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from "@/lib/support/constants"

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.getTime()
}

export function getSupportStatusLabel(status: SupportTicketStatus) {
  return SUPPORT_TICKET_STATUS_LABELS[status]
}

export function getSupportCategoryLabel(category: SupportTicketCategory) {
  return SUPPORT_TICKET_CATEGORY_LABELS[category]
}

export function canUserReplyToTicket(status: SupportTicketStatus) {
  return status !== "closed"
}

export function isTicketUnreadForUser(input: {
  lastAdminMessageAt: Date | string | null
  userLastReadAt: Date | string | null
}) {
  const adminMessageTime = toTimestamp(input.lastAdminMessageAt)
  if (!adminMessageTime) {
    return false
  }

  const userReadTime = toTimestamp(input.userLastReadAt)
  if (!userReadTime) {
    return true
  }

  return adminMessageTime > userReadTime
}

export function isTicketUnreadForAdmin(input: {
  adminLastReadAt: Date | string | null
  lastUserMessageAt: Date | string | null
}) {
  const userMessageTime = toTimestamp(input.lastUserMessageAt)
  if (!userMessageTime) {
    return false
  }

  const adminReadTime = toTimestamp(input.adminLastReadAt)
  if (!adminReadTime) {
    return true
  }

  return userMessageTime > adminReadTime
}

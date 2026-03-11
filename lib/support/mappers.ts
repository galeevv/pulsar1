import type {
  AdminSupportTicketListItem,
  SupportMessageDto,
  UserSupportTicketListItem,
} from "@/lib/support/queries"

export function serializeSupportMessage(message: SupportMessageDto) {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
  }
}

export function serializeUserSupportTicketListItem(item: UserSupportTicketListItem) {
  return {
    ...item,
    lastMessageAt: item.lastMessageAt ? item.lastMessageAt.toISOString() : null,
    updatedAt: item.updatedAt.toISOString(),
  }
}

export function serializeAdminSupportTicketListItem(item: AdminSupportTicketListItem) {
  return {
    ...item,
    adminLastReadAt: item.adminLastReadAt ? item.adminLastReadAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    lastMessageAt: item.lastMessageAt ? item.lastMessageAt.toISOString() : null,
    updatedAt: item.updatedAt.toISOString(),
  }
}

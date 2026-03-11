import { prisma } from "@/lib/prisma"
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_STATUSES,
  type SupportSenderType,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from "@/lib/support/constants"
import {
  isTicketUnreadForAdmin,
  isTicketUnreadForUser,
} from "@/lib/support/helpers"

function normalizeStatus(value: string): SupportTicketStatus {
  if ((SUPPORT_TICKET_STATUSES as readonly string[]).includes(value)) {
    return value as SupportTicketStatus
  }

  return "open"
}

function normalizeCategory(value: string): SupportTicketCategory {
  if ((SUPPORT_TICKET_CATEGORIES as readonly string[]).includes(value)) {
    return value as SupportTicketCategory
  }

  return "other"
}

function normalizeSenderType(value: string): SupportSenderType {
  if (value === "admin") {
    return "admin"
  }

  return "user"
}

export type SupportMessageDto = {
  createdAt: Date
  id: number
  message: string
  senderId: string | null
  senderType: SupportSenderType
}

export type UserSupportTicketListItem = {
  category: SupportTicketCategory
  id: number
  lastMessageAt: Date | null
  status: SupportTicketStatus
  subject: string
  unreadForUser: boolean
  updatedAt: Date
}

export type AdminSupportTicketListItem = {
  adminLastReadAt: Date | null
  category: SupportTicketCategory
  createdAt: Date
  id: number
  lastMessageAt: Date | null
  status: SupportTicketStatus
  subject: string
  unreadForAdmin: boolean
  updatedAt: Date
  user: {
    id: string
    username: string
  }
}

export async function getUserSupportTicketList(userId: string) {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    select: {
      category: true,
      id: true,
      lastMessageAt: true,
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
          senderType: true,
        },
        take: 1,
      },
      status: true,
      subject: true,
      updatedAt: true,
      userLastReadAt: true,
    },
    where: { userId },
  })

  return tickets.map<UserSupportTicketListItem>((item) => {
    const latest = item.messages[0] ?? null
    const lastAdminMessageAt =
      latest && normalizeSenderType(latest.senderType) === "admin" ? latest.createdAt : null

    return {
      category: normalizeCategory(item.category),
      id: item.id,
      lastMessageAt: item.lastMessageAt,
      status: normalizeStatus(item.status),
      subject: item.subject,
      unreadForUser: isTicketUnreadForUser({
        lastAdminMessageAt,
        userLastReadAt: item.userLastReadAt,
      }),
      updatedAt: item.updatedAt,
    }
  })
}

export async function getSupportTicketDetailForUser(input: {
  ticketId: number
  userId: string
}) {
  const ticket = await prisma.supportTicket.findFirst({
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
          id: true,
          message: true,
          senderId: true,
          senderType: true,
        },
      },
    },
    where: {
      id: input.ticketId,
      userId: input.userId,
    },
  })

  if (!ticket) {
    return null
  }

  return {
    adminLastReadAt: ticket.adminLastReadAt,
    category: normalizeCategory(ticket.category),
    closedAt: ticket.closedAt,
    createdAt: ticket.createdAt,
    id: ticket.id,
    lastMessageAt: ticket.lastMessageAt,
    messages: ticket.messages.map<SupportMessageDto>((message) => ({
      createdAt: message.createdAt,
      id: message.id,
      message: message.message,
      senderId: message.senderId,
      senderType: normalizeSenderType(message.senderType),
    })),
    status: normalizeStatus(ticket.status),
    subject: ticket.subject,
    updatedAt: ticket.updatedAt,
    userLastReadAt: ticket.userLastReadAt,
  }
}

export async function getAdminSupportTicketList(input: {
  category?: SupportTicketCategory
  sortBy: "created_at" | "updated_at"
  sortDirection: "asc" | "desc"
  status?: SupportTicketStatus
}) {
  const tickets = await prisma.supportTicket.findMany({
    orderBy:
      input.sortBy === "created_at"
        ? [{ createdAt: input.sortDirection }, { id: "desc" }]
        : [{ lastMessageAt: input.sortDirection }, { updatedAt: input.sortDirection }],
    select: {
      adminLastReadAt: true,
      category: true,
      createdAt: true,
      id: true,
      lastMessageAt: true,
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
          senderType: true,
        },
        take: 1,
      },
      status: true,
      subject: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    where: {
      category: input.category,
      status: input.status,
    },
  })

  return tickets.map<AdminSupportTicketListItem>((item) => {
    const latest = item.messages[0] ?? null
    const lastUserMessageAt =
      latest && normalizeSenderType(latest.senderType) === "user" ? latest.createdAt : null

    return {
      adminLastReadAt: item.adminLastReadAt,
      category: normalizeCategory(item.category),
      createdAt: item.createdAt,
      id: item.id,
      lastMessageAt: item.lastMessageAt,
      status: normalizeStatus(item.status),
      subject: item.subject,
      unreadForAdmin: isTicketUnreadForAdmin({
        adminLastReadAt: item.adminLastReadAt,
        lastUserMessageAt,
      }),
      updatedAt: item.updatedAt,
      user: {
        id: item.user.id,
        username: item.user.username,
      },
    }
  })
}

export async function getSupportTicketDetailForAdmin(ticketId: number) {
  const ticket = await prisma.supportTicket.findUnique({
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
          id: true,
          message: true,
          senderId: true,
          senderType: true,
        },
      },
      user: {
        select: {
          id: true,
          subscriptions: {
            orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
            select: {
              deviceLimit: true,
              devices: true,
              endsAt: true,
              expiresAt: true,
              status: true,
              tariffName: true,
            },
            take: 1,
            where: {
              status: "ACTIVE",
            },
          },
          username: true,
        },
      },
    },
    where: { id: ticketId },
  })

  if (!ticket) {
    return null
  }

  const activeSubscription = ticket.user.subscriptions[0] ?? null

  return {
    adminLastReadAt: ticket.adminLastReadAt,
    category: normalizeCategory(ticket.category),
    closedAt: ticket.closedAt,
    createdAt: ticket.createdAt,
    id: ticket.id,
    lastMessageAt: ticket.lastMessageAt,
    messages: ticket.messages.map<SupportMessageDto>((message) => ({
      createdAt: message.createdAt,
      id: message.id,
      message: message.message,
      senderId: message.senderId,
      senderType: normalizeSenderType(message.senderType),
    })),
    status: normalizeStatus(ticket.status),
    subject: ticket.subject,
    updatedAt: ticket.updatedAt,
    user: {
      activeSubscription: activeSubscription
        ? {
            deviceLimit: activeSubscription.deviceLimit,
            devices: activeSubscription.devices,
            endsAt: activeSubscription.expiresAt ?? activeSubscription.endsAt,
            status: activeSubscription.status,
            tariffName: activeSubscription.tariffName,
          }
        : null,
      id: ticket.user.id,
      username: ticket.user.username,
    },
    userLastReadAt: ticket.userLastReadAt,
  }
}

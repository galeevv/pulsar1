import { prisma } from "@/lib/prisma"
import { SUPPORT_TICKET_STATUSES, type SupportTicketStatus } from "@/lib/support/constants"
import { canUserReplyToTicket } from "@/lib/support/helpers"

export class SupportMutationError extends Error {
  code: "FORBIDDEN" | "NOT_FOUND" | "TICKET_CLOSED"

  constructor(code: "FORBIDDEN" | "NOT_FOUND" | "TICKET_CLOSED", message: string) {
    super(message)
    this.code = code
  }
}

function normalizeStatus(value: string): SupportTicketStatus {
  if ((SUPPORT_TICKET_STATUSES as readonly string[]).includes(value)) {
    return value as SupportTicketStatus
  }

  return "open"
}

export async function createSupportTicketForUser(input: {
  category: string
  message: string
  subject: string
  userId: string
}) {
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        category: input.category,
        lastMessageAt: now,
        status: "open",
        subject: input.subject,
        userId: input.userId,
        userLastReadAt: now,
      },
    })

    await tx.supportMessage.create({
      data: {
        message: input.message,
        senderId: input.userId,
        senderType: "user",
        ticketId: ticket.id,
      },
    })

    return ticket.id
  })
}

export async function createSupportMessageByUser(input: {
  message: string
  ticketId: number
  userId: string
}) {
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findFirst({
      where: {
        id: input.ticketId,
        userId: input.userId,
      },
    })

    if (!ticket) {
      throw new SupportMutationError("NOT_FOUND", "Тикет не найден.")
    }

    const status = normalizeStatus(ticket.status)
    if (!canUserReplyToTicket(status)) {
      throw new SupportMutationError("TICKET_CLOSED", "Тикет закрыт.")
    }

    await tx.supportMessage.create({
      data: {
        message: input.message,
        senderId: input.userId,
        senderType: "user",
        ticketId: ticket.id,
      },
    })

    await tx.supportTicket.update({
      data: {
        lastMessageAt: now,
        status: "open",
        userLastReadAt: now,
      },
      where: { id: ticket.id },
    })
  })
}

export async function closeSupportTicketByUser(input: {
  ticketId: number
  userId: string
}) {
  const now = new Date()
  const updated = await prisma.supportTicket.updateMany({
    data: {
      closedAt: now,
      status: "closed",
    },
    where: {
      id: input.ticketId,
      userId: input.userId,
    },
  })

  if (updated.count !== 1) {
    throw new SupportMutationError("NOT_FOUND", "Тикет не найден.")
  }
}

export async function markSupportTicketReadByUser(input: {
  ticketId: number
  userId: string
}) {
  const updated = await prisma.supportTicket.updateMany({
    data: {
      userLastReadAt: new Date(),
    },
    where: {
      id: input.ticketId,
      userId: input.userId,
    },
  })

  if (updated.count !== 1) {
    throw new SupportMutationError("NOT_FOUND", "Тикет не найден.")
  }
}

export async function createSupportMessageByAdmin(input: {
  adminId: string
  message: string
  ticketId: number
}) {
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findUnique({
      where: { id: input.ticketId },
    })

    if (!ticket) {
      throw new SupportMutationError("NOT_FOUND", "Тикет не найден.")
    }

    await tx.supportMessage.create({
      data: {
        message: input.message,
        senderId: input.adminId,
        senderType: "admin",
        ticketId: ticket.id,
      },
    })

    const currentStatus = normalizeStatus(ticket.status)

    await tx.supportTicket.update({
      data: {
        adminLastReadAt: now,
        closedAt: currentStatus === "closed" ? ticket.closedAt : null,
        lastMessageAt: now,
        status: currentStatus === "closed" ? "closed" : "waiting_user",
      },
      where: { id: ticket.id },
    })
  })
}

export async function updateSupportTicketStatusByAdmin(input: {
  status: SupportTicketStatus
  ticketId: number
}) {
  const now = new Date()
  const updated = await prisma.supportTicket.updateMany({
    data: {
      closedAt: input.status === "closed" ? now : null,
      status: input.status,
    },
    where: {
      id: input.ticketId,
    },
  })

  if (updated.count !== 1) {
    throw new SupportMutationError("NOT_FOUND", "Тикет не найден.")
  }
}

export async function markSupportTicketReadByAdmin(ticketId: number) {
  const updated = await prisma.supportTicket.updateMany({
    data: {
      adminLastReadAt: new Date(),
    },
    where: {
      id: ticketId,
    },
  })

  if (updated.count !== 1) {
    throw new SupportMutationError("NOT_FOUND", "Тикет не найден.")
  }
}

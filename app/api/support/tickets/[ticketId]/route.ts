import { NextResponse } from "next/server"

import { getSupportUserActor } from "@/lib/support/auth"
import { canUserReplyToTicket } from "@/lib/support/helpers"
import { serializeSupportMessage } from "@/lib/support/mappers"
import {
  markSupportTicketReadByUser,
  SupportMutationError,
} from "@/lib/support/mutations"
import { getSupportTicketDetailForUser } from "@/lib/support/queries"
import {
  supportBadRequestResponse,
  supportForbiddenResponse,
  supportNotFoundResponse,
  supportServerErrorResponse,
} from "@/lib/support/http"
import { supportTicketIdSchema } from "@/lib/support/validators"

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ ticketId: string }>
  }
) {
  const actor = await getSupportUserActor()
  if (!actor) {
    return supportForbiddenResponse()
  }

  const params = await context.params
  const parsedId = supportTicketIdSchema.safeParse(params.ticketId)
  if (!parsedId.success) {
    return supportBadRequestResponse("Некорректный идентификатор тикета.")
  }

  try {
    await markSupportTicketReadByUser({
      ticketId: parsedId.data,
      userId: actor.id,
    })
  } catch (error) {
    if (error instanceof SupportMutationError && error.code === "NOT_FOUND") {
      return supportNotFoundResponse("Тикет не найден.")
    }

    return supportServerErrorResponse()
  }

  try {
    const ticket = await getSupportTicketDetailForUser({
      ticketId: parsedId.data,
      userId: actor.id,
    })

    if (!ticket) {
      return supportNotFoundResponse("Тикет не найден.")
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        adminLastReadAt: ticket.adminLastReadAt ? ticket.adminLastReadAt.toISOString() : null,
        closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
        createdAt: ticket.createdAt.toISOString(),
        lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : null,
        messages: ticket.messages.map(serializeSupportMessage),
        userCanReply: canUserReplyToTicket(ticket.status),
        userLastReadAt: ticket.userLastReadAt ? ticket.userLastReadAt.toISOString() : null,
      },
    })
  } catch {
    return supportServerErrorResponse()
  }
}

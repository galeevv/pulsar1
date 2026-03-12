import { NextResponse } from "next/server"

import { getSupportAdminActor } from "@/lib/support/auth"
import { serializeSupportMessage } from "@/lib/support/mappers"
import { markSupportTicketReadByAdmin, SupportMutationError } from "@/lib/support/mutations"
import { getSupportTicketDetailForAdmin } from "@/lib/support/queries"
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
  const actor = await getSupportAdminActor()
  if (!actor) {
    return supportForbiddenResponse()
  }

  const params = await context.params
  const parsedId = supportTicketIdSchema.safeParse(params.ticketId)
  if (!parsedId.success) {
    return supportBadRequestResponse("Некорректный идентификатор тикета.")
  }

  try {
    await markSupportTicketReadByAdmin(parsedId.data)
    const ticket = await getSupportTicketDetailForAdmin(parsedId.data)

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
        updatedAt: ticket.updatedAt.toISOString(),
        user: {
          ...ticket.user,
          activeSubscription: ticket.user.activeSubscription
            ? {
                ...ticket.user.activeSubscription,
                endsAt: ticket.user.activeSubscription.endsAt.toISOString(),
              }
            : null,
        },
        userLastReadAt: ticket.userLastReadAt ? ticket.userLastReadAt.toISOString() : null,
      },
    })
  } catch (error) {
    if (error instanceof SupportMutationError && error.code === "NOT_FOUND") {
      return supportNotFoundResponse("Тикет не найден.")
    }

    return supportServerErrorResponse()
  }
}

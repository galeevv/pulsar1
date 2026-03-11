import { NextResponse } from "next/server"

import { getSupportUserActor } from "@/lib/support/auth"
import {
  closeSupportTicketByUser,
  SupportMutationError,
} from "@/lib/support/mutations"
import {
  supportBadRequestResponse,
  supportForbiddenResponse,
  supportNotFoundResponse,
  supportServerErrorResponse,
} from "@/lib/support/http"
import { supportTicketIdSchema } from "@/lib/support/validators"

export async function POST(
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
    await closeSupportTicketByUser({
      ticketId: parsedId.data,
      userId: actor.id,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SupportMutationError && error.code === "NOT_FOUND") {
      return supportNotFoundResponse("Тикет не найден.")
    }

    return supportServerErrorResponse()
  }
}

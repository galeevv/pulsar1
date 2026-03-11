import { NextResponse } from "next/server"

import { getSupportUserActor } from "@/lib/support/auth"
import {
  createSupportMessageByUser,
  SupportMutationError,
} from "@/lib/support/mutations"
import {
  supportBadRequestResponse,
  supportForbiddenResponse,
  supportNotFoundResponse,
  supportServerErrorResponse,
} from "@/lib/support/http"
import { createTicketMessageSchema, supportTicketIdSchema } from "@/lib/support/validators"

export async function POST(
  request: Request,
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

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return supportBadRequestResponse("Некорректное тело запроса.")
  }

  const parsedBody = createTicketMessageSchema.safeParse(payload)
  if (!parsedBody.success) {
    return supportBadRequestResponse("Сообщение должно содержать от 10 до 5000 символов.")
  }

  try {
    await createSupportMessageByUser({
      message: parsedBody.data.message,
      ticketId: parsedId.data,
      userId: actor.id,
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    if (error instanceof SupportMutationError) {
      if (error.code === "NOT_FOUND") {
        return supportNotFoundResponse("Тикет не найден.")
      }

      if (error.code === "TICKET_CLOSED") {
        return supportBadRequestResponse("Тикет закрыт. Отправка сообщения недоступна.")
      }
    }

    return supportServerErrorResponse()
  }
}

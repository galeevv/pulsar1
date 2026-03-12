import { NextResponse } from "next/server"

import { getSupportAdminActor } from "@/lib/support/auth"
import {
  createSupportMessageByAdmin,
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
  const actor = await getSupportAdminActor()
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
    return supportBadRequestResponse("Сообщение должно содержать от 1 до 2000 символов.")
  }

  try {
    await createSupportMessageByAdmin({
      adminId: actor.id,
      message: parsedBody.data.message,
      ticketId: parsedId.data,
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    if (error instanceof SupportMutationError && error.code === "NOT_FOUND") {
      return supportNotFoundResponse("Тикет не найден.")
    }

    return supportServerErrorResponse()
  }
}

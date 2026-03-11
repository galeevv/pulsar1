import { NextResponse } from "next/server"

import { getSupportAdminActor } from "@/lib/support/auth"
import {
  updateSupportTicketStatusByAdmin,
  SupportMutationError,
} from "@/lib/support/mutations"
import {
  supportBadRequestResponse,
  supportForbiddenResponse,
  supportNotFoundResponse,
  supportServerErrorResponse,
} from "@/lib/support/http"
import {
  supportTicketIdSchema,
  updateTicketStatusSchema,
} from "@/lib/support/validators"

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

  const parsedBody = updateTicketStatusSchema.safeParse(payload)
  if (!parsedBody.success) {
    return supportBadRequestResponse("Некорректный статус тикета.")
  }

  try {
    await updateSupportTicketStatusByAdmin({
      status: parsedBody.data.status,
      ticketId: parsedId.data,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SupportMutationError && error.code === "NOT_FOUND") {
      return supportNotFoundResponse("Тикет не найден.")
    }

    return supportServerErrorResponse()
  }
}

import { NextResponse } from "next/server"

import { getSupportAdminActor } from "@/lib/support/auth"
import {
  markSupportTicketReadByAdmin,
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
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SupportMutationError && error.code === "NOT_FOUND") {
      return supportNotFoundResponse("Тикет не найден.")
    }

    return supportServerErrorResponse()
  }
}

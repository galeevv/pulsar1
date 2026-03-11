import { NextResponse } from "next/server"

import { getSupportUserActor } from "@/lib/support/auth"
import { serializeUserSupportTicketListItem } from "@/lib/support/mappers"
import { createSupportTicketForUser } from "@/lib/support/mutations"
import { getUserSupportTicketList } from "@/lib/support/queries"
import {
  supportBadRequestResponse,
  supportForbiddenResponse,
  supportServerErrorResponse,
} from "@/lib/support/http"
import { createTicketSchema } from "@/lib/support/validators"

export async function GET() {
  const actor = await getSupportUserActor()
  if (!actor) {
    return supportForbiddenResponse()
  }

  try {
    const tickets = await getUserSupportTicketList(actor.id)
    return NextResponse.json({
      tickets: tickets.map(serializeUserSupportTicketListItem),
    })
  } catch {
    return supportServerErrorResponse()
  }
}

export async function POST(request: Request) {
  const actor = await getSupportUserActor()
  if (!actor) {
    return supportForbiddenResponse()
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return supportBadRequestResponse("Некорректное тело запроса.")
  }

  const parsed = createTicketSchema.safeParse(payload)
  if (!parsed.success) {
    return supportBadRequestResponse("Проверьте заполнение полей тикета.")
  }

  try {
    const ticketId = await createSupportTicketForUser({
      category: parsed.data.category,
      message: parsed.data.message,
      subject: parsed.data.subject,
      userId: actor.id,
    })

    return NextResponse.json({ ticketId }, { status: 201 })
  } catch {
    return supportServerErrorResponse()
  }
}

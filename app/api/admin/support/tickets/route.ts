import { NextResponse } from "next/server"

import { getSupportAdminActor } from "@/lib/support/auth"
import { serializeAdminSupportTicketListItem } from "@/lib/support/mappers"
import { getAdminSupportTicketList } from "@/lib/support/queries"
import {
  supportBadRequestResponse,
  supportForbiddenResponse,
  supportServerErrorResponse,
} from "@/lib/support/http"
import { adminTicketListFiltersSchema } from "@/lib/support/validators"

export async function GET(request: Request) {
  const actor = await getSupportAdminActor()
  if (!actor) {
    return supportForbiddenResponse()
  }

  const { searchParams } = new URL(request.url)
  const rawFilters = {
    category: searchParams.get("category") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortDirection: searchParams.get("sortDirection") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  }

  const parsedFilters = adminTicketListFiltersSchema.safeParse(rawFilters)
  if (!parsedFilters.success) {
    return supportBadRequestResponse("Некорректные параметры фильтрации тикетов.")
  }

  try {
    const tickets = await getAdminSupportTicketList(parsedFilters.data)
    return NextResponse.json({
      tickets: tickets.map(serializeAdminSupportTicketListItem),
    })
  } catch {
    return supportServerErrorResponse()
  }
}

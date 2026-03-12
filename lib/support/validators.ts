import { z } from "zod"

import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_STATUSES,
} from "@/lib/support/constants"

export const createTicketSchema = z.object({
  category: z.enum(SUPPORT_TICKET_CATEGORIES),
  message: z.string().trim().min(10).max(5000),
  subject: z.string().trim().min(5).max(120),
})

export const createTicketMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
})

export const updateTicketStatusSchema = z.object({
  status: z.enum(SUPPORT_TICKET_STATUSES),
})

export const supportTicketIdSchema = z.coerce.number().int().positive()

export const adminTicketListFiltersSchema = z.object({
  category: z.enum(SUPPORT_TICKET_CATEGORIES).optional(),
  sortBy: z.enum(["updated_at", "created_at"]).default("updated_at"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(SUPPORT_TICKET_STATUSES).optional(),
})

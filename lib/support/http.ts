import { NextResponse } from "next/server"

export function supportUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function supportForbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export function supportNotFoundResponse(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function supportBadRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function supportServerErrorResponse(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 })
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type Role = "USER" | "ADMIN";
const COOKIE_NAME = "pulsar_session";
const SESSION_TTL_DAYS = 180;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * SESSION_TTL_DAYS;

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    return atob(padded);
  } catch {
    return null;
  }
}

function readSessionSnapshot(cookieValue: string | undefined) {
  if (!cookieValue) {
    return null;
  }

  const [body] = cookieValue.split(".");

  if (!body) {
    return null;
  }

  const decoded = decodeBase64Url(body);

  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as {
      sessionId?: string;
      role?: Role;
    };

    if (
      typeof parsed.sessionId !== "string" ||
      !parsed.sessionId ||
      (parsed.role !== "ADMIN" && parsed.role !== "USER")
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  const session = readSessionSnapshot(cookieValue);

  if (pathname.startsWith("/app") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  if (session && cookieValue) {
    response.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: ["/login", "/app/:path*", "/admin/:path*"],
};

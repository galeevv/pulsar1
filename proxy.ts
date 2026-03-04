import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type Role = "USER" | "ADMIN";

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
      exp?: number;
      sessionId?: string;
      role?: Role;
    };

    if (
      !parsed.exp ||
      parsed.exp <= Date.now() ||
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
  const session = readSessionSnapshot(request.cookies.get("pulsar_session")?.value);

  if (pathname.startsWith("/app") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?mode=login&error=%D0%A1%D0%BD%D0%B0%D1%87%D0%B0%D0%BB%D0%B0%20%D0%B2%D0%BE%D0%B9%D0%B4%D0%B8%D1%82%D0%B5%20%D0%B2%20%D0%B0%D0%BA%D0%BA%D0%B0%D1%83%D0%BD%D1%82.";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?mode=login&error=%D0%A1%D0%BD%D0%B0%D1%87%D0%B0%D0%BB%D0%B0%20%D0%B2%D0%BE%D0%B9%D0%B4%D0%B8%D1%82%D0%B5%20%D0%B2%20%D0%B0%D0%BA%D0%BA%D0%B0%D1%83%D0%BD%D1%82.";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && session) {
    const url = request.nextUrl.clone();
    url.pathname = session.role === "ADMIN" ? "/admin" : "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/app/:path*", "/admin/:path*"],
};

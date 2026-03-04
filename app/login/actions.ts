"use server";

import { redirect } from "next/navigation";

import {
  attemptLogin,
  attemptRegistration,
  clearSession,
  getSessionDestination,
  setSession,
} from "@/lib/auth";

function encodeError(message: string) {
  return encodeURIComponent(message);
}

export async function loginAction(formData: FormData) {
  const result = await attemptLogin(
    String(formData.get("username") ?? ""),
    String(formData.get("password") ?? "")
  );

  if (!result.ok) {
    redirect(`/login?mode=login&error=${encodeError(result.message)}`);
  }

  await setSession(result.user.username, result.user.role);
  redirect(getSessionDestination(result.user.role));
}

export async function registerAction(formData: FormData) {
  const result = await attemptRegistration({
    code: String(formData.get("code") ?? ""),
    password: String(formData.get("password") ?? ""),
    passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
    username: String(formData.get("username") ?? ""),
  });

  if (!result.ok) {
    redirect(`/login?mode=register&error=${encodeError(result.message)}`);
  }

  await setSession(result.user.username, result.user.role);
  redirect("/app");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

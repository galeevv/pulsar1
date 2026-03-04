import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentSession, getSessionDestination } from "@/lib/auth";

import { loginAction, registerAction } from "./actions";
import { LoginFeedbackToast } from "./login-feedback-toast";
import { LoginModeTabs } from "./login-mode-tabs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();

  if (session) {
    redirect(getSessionDestination(session.role));
  }

  const resolvedSearchParams = await searchParams;
  const mode = getValue(resolvedSearchParams, "mode") === "register" ? "register" : "login";
  const error = getValue(resolvedSearchParams, "error");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <LoginFeedbackToast error={error ? decodeURIComponent(error) : undefined} />

      <section className="w-full max-w-[560px] rounded-hero border border-border/70 bg-card/70 p-6 backdrop-blur md:p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Pulsar</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {mode === "login" ? "Авторизация" : "Регистрация"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <LoginModeTabs mode={mode} />

        <div className="mt-6 space-y-1">
          <h1 className="text-[16px] font-semibold">
            {mode === "login" ? "Вход в личный кабинет" : "Создание аккаунта"}
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {mode === "login"
              ? "Введите username и пароль."
              : "Регистрация доступна только по одноразовому invite или referral коду."}
          </p>
        </div>

        {mode === "login" ? (
          <form action={loginAction} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="login-username">
                Username
              </label>
              <Input id="login-username" name="username" placeholder="Введите username" required />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="login-password">
                Password
              </label>
              <Input
                id="login-password"
                name="password"
                placeholder="Введите пароль"
                required
                type="password"
              />
            </div>

            <div className="pt-2">
              <Button className="h-button w-full px-button-x" radius="card" type="submit">
                Войти
              </Button>
            </div>
          </form>
        ) : (
          <form action={registerAction} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="register-username">
                Username
              </label>
              <Input
                id="register-username"
                name="username"
                placeholder="Придумайте username"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="register-password">
                Password
              </label>
              <Input
                id="register-password"
                name="password"
                placeholder="Введите пароль"
                required
                type="password"
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="register-password-confirmation"
              >
                Password Confirmation
              </label>
              <Input
                id="register-password-confirmation"
                name="passwordConfirmation"
                placeholder="Повторите пароль"
                required
                type="password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="register-code">
                Invite Code
              </label>
              <Input
                id="register-code"
                name="code"
                placeholder="Введите invite или referral код"
                required
              />
            </div>

            <div className="pt-2">
              <Button className="h-button w-full px-button-x" radius="card" type="submit">
                Зарегистрироваться
              </Button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

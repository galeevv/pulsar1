"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginModeTabs({
  mode,
}: {
  mode: "login" | "register";
}) {
  const router = useRouter();

  return (
    <Tabs
      className="mt-6"
      onValueChange={(value) => {
        const nextMode = value === "register" ? "register" : "login";
        router.push(`/login?mode=${nextMode}`);
      }}
      value={mode}
    >
      <TabsList
        className="grid h-11 w-full grid-cols-2 rounded-card border border-border bg-background/40 p-1"
        variant="default"
      >
        <TabsTrigger value="login">Авторизация</TabsTrigger>
        <TabsTrigger value="register">Регистрация</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

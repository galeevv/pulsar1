"use client";

import { useMemo, useState, type ComponentType } from "react";

import {
  Apple,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Laptop,
  Link2,
  Monitor,
  Settings2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SetupStep = "start" | "choose-device" | "install-app" | "subscription" | "done";
type DevicePlatform = "Android" | "iOS" | "Windows" | "MacOS";
type InstallReturnStep = "start" | "choose-device";

const APP_LINKS: Record<DevicePlatform, string> = {
  Android: "https://play.google.com/store/apps/details?id=com.happproxy",
  iOS: "https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973",
  MacOS: "https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973",
  Windows:
    "https://github.com/Happ-proxy/happ-desktop/releases/latest/download/setup-Happ.x64.exe",
};

const DEVICE_OPTIONS: Array<{
  icon: ComponentType<{ className?: string }>;
  platform: DevicePlatform;
}> = [
  { icon: Smartphone, platform: "Android" },
  { icon: Apple, platform: "iOS" },
  { icon: Monitor, platform: "Windows" },
  { icon: Laptop, platform: "MacOS" },
];

function detectCurrentPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") {
    return "Windows";
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("android")) {
    return "Android";
  }

  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "iOS";
  }

  if (ua.includes("mac os")) {
    return "MacOS";
  }

  return "Windows";
}

function formatSubscriptionUrlForDisplay(url: string | null, tokenLength: number) {
  if (!url) {
    return "Ссылка пока недоступна";
  }

  const marker = "/sub/";
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return url.length > 44 ? `${url.slice(0, 44)}...` : url;
  }

  const tokenStart = markerIndex + marker.length;
  const token = url.slice(tokenStart);

  if (token.length <= tokenLength) {
    return url;
  }

  return `${url.slice(0, tokenStart)}${token.slice(0, tokenLength)}...`;
}

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto inline-flex size-20 items-center justify-center rounded-card border border-border bg-background/60">
      {children}
    </div>
  );
}

export function AppSetupDialog({
  subscriptionUrl,
}: {
  subscriptionUrl: string | null;
}) {
  const currentPlatform = useMemo(() => detectCurrentPlatform(), []);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SetupStep>("start");
  const [selectedPlatform, setSelectedPlatform] = useState<DevicePlatform>(currentPlatform);
  const [installReturnStep, setInstallReturnStep] = useState<InstallReturnStep>("start");

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setStep("start");
      setSelectedPlatform(currentPlatform);
      setInstallReturnStep("start");
    }
  }

  function handleBack() {
    if (step === "choose-device") {
      setStep("start");
      return;
    }

    if (step === "install-app") {
      setStep(installReturnStep);
      return;
    }

    if (step === "subscription") {
      setStep("install-app");
      return;
    }

    if (step === "done") {
      setStep("subscription");
    }
  }

  async function copySubscriptionUrl() {
    if (!subscriptionUrl) {
      toast.error("Ссылка подписки пока недоступна.", { position: "bottom-right" });
      return;
    }

    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      toast.success("Ссылка подписки скопирована.", { position: "bottom-right" });
    } catch {
      toast.error("Не удалось скопировать ссылку.", { position: "bottom-right" });
    }
  }

  const showBackButton = step !== "start";
  const displaySubscriptionUrlMobile = formatSubscriptionUrlForDisplay(subscriptionUrl, 8);
  const displaySubscriptionUrlDesktop = formatSubscriptionUrlForDisplay(subscriptionUrl, 20);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button 
          className="h-button w-full px-button-x"
          disabled={!subscriptionUrl}
          radius="card"
          type="button"
        >
          <Settings2 className="size-4" />
          Установка и настройка
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100svh-1rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <div className="space-y-4 text-center sm:space-y-5">
          {showBackButton ? (
            <div className="flex justify-start">
              <Button
                onClick={handleBack}
                radius="card"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
                <span className="sr-only">Вернуться на предыдущий этап</span>
              </Button>
            </div>
          ) : null}

          {step === "start" ? (
            <>
              <StepIcon>
                <Settings2 className="size-9 text-foreground sm:size-11" />
              </StepIcon>

              <DialogHeader className="items-center text-center sm:text-center">
                <DialogTitle>Настройка на {currentPlatform}</DialogTitle>
                <DialogDescription className="w-full max-w-none sm:max-w-md">
                  Выберите сценарий установки Happ для текущего или другого устройства.
                </DialogDescription>
              </DialogHeader>

              <div className="flex w-full flex-col gap-3">           
                <Button
                  className="h-button w-full px-button-x"
                  onClick={() => {
                    setSelectedPlatform(currentPlatform);
                    setInstallReturnStep("start");
                    setStep("install-app");
                  }}
                  radius="card"
                  type="button"
                >
                  Настроить на этом устройстве
                </Button>
                <Button className="h-button w-full px-button-x" onClick={() => setStep("choose-device")} radius="card" type="button" variant="outline">
                  Настроить на другом устройстве
                </Button>
              </div>
            </>
          ) : null}

          {step === "choose-device" ? (
            <>
              <StepIcon>
                <Smartphone className="size-9 text-foreground sm:size-11" />
              </StepIcon>

              <DialogHeader className="items-center text-center sm:text-center">
                <DialogTitle>Выберите устройство</DialogTitle>
                <DialogDescription className="w-full max-w-none sm:max-w-md">
                  Выберите операционную систему вашего устройства.
                </DialogDescription>
              </DialogHeader>

              <div className="flex w-full flex-col gap-3">
                {DEVICE_OPTIONS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Button
                      key={item.platform}
                      className="h-button w-full px-button-x"
                      onClick={() => {
                        setSelectedPlatform(item.platform);
                        setInstallReturnStep("choose-device");
                        setStep("install-app");
                      }}
                      radius="card"
                      type="button"
                      variant="outline"
                    >
                      <Icon className="size-4" />
                      {item.platform}
                    </Button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "install-app" ? (
            <>
              <StepIcon>
                <Download className="size-9 text-foreground sm:size-11" />
              </StepIcon>

              <DialogHeader className="items-center text-center sm:text-center">
                <DialogTitle>Приложение</DialogTitle>
                <DialogDescription className="w-full max-w-none sm:max-w-md">
                  Установите приложение Happ и вернитесь к этому экрану.
                </DialogDescription>
              </DialogHeader>

              <div className="flex w-full flex-col gap-3">
                <Button asChild className="h-button w-full px-button-x" radius="card" type="button">
                  <a href={APP_LINKS[selectedPlatform]} rel="noreferrer" target="_blank">
                    <Download className="size-4" />
                    Установить
                  </a>
                </Button>
                <Button
                  className="h-button w-full px-button-x"
                  onClick={() => setStep("subscription")}
                  radius="card"
                  type="button"
                  variant="outline"
                >
                  Далее
                </Button>
              </div>
            </>
          ) : null}

          {step === "subscription" ? (
            <>
              <StepIcon>
                <Link2 className="size-9 text-foreground sm:size-11" />
              </StepIcon>

              <DialogHeader className="items-center text-center sm:text-center">
                <DialogTitle>Подписка</DialogTitle>
                <DialogDescription className="w-full max-w-none">
                  Добавьте подписку в Happ с помощью кнопки ниже или вставьте ссылку вручную.
                </DialogDescription>
              </DialogHeader>

              <Button
                className="mb-3 h-button w-full min-w-0 justify-between overflow-hidden px-button-x"
                onClick={copySubscriptionUrl}
                radius="card"
                type="button"
                variant="outline"
              >
                <span className="min-w-0 flex-1 truncate text-left sm:hidden">
                  {displaySubscriptionUrlMobile}
                </span>
                <span className="hidden min-w-0 flex-1 truncate text-left sm:block">
                  {displaySubscriptionUrlDesktop}
                </span>
                <Copy className="size-4 shrink-0" />
              </Button>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  className="h-button w-full px-button-x"
                  onClick={() =>
                    toast.info("Функция автоматического добавления будет добавлена позже.", {
                      position: "bottom-right",
                    })
                  }
                  radius="card"
                  type="button"
                >
                  Добавить
                </Button>

                <Button
                  className="h-button w-full px-button-x"
                  onClick={() => setStep("done")}
                  radius="card"
                  type="button"
                  variant="outline"
                >
                  Далее
                </Button>
              </div>
            </>
          ) : null}

          {step === "done" ? (
            <>
              <StepIcon>
                <CheckCircle2 className="size-9 text-foreground sm:size-11" />
              </StepIcon>

              <DialogHeader className="items-center text-center sm:text-center">
                <DialogTitle>Готово</DialogTitle>
                <DialogDescription className="w-full max-w-none sm:max-w-md">
                  Нажмите на кнопку включения в приложении Happ.
                </DialogDescription>
              </DialogHeader>

              <div className="flex w-full flex-col gap-3">
                <Button className="h-button w-full px-button-x" onClick={() => setOpen(false)} radius="card" type="button">
                  Завершить настройку
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client"

import { useMemo, useState, useTransition, type ComponentType } from "react"
import { useRouter } from "next/navigation"

import {
  Apple,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Laptop,
  Link2,
  Loader2Icon,
  Monitor,
  Settings2,
  Smartphone,
} from "lucide-react"
import { toast } from "sonner"

import {
  assignSetupSlotAction,
  getSetupPreviewSlotAction,
} from "@/app/app/actions"
import {
  detectDeviceOsFromNavigator,
  mapSetupPlatformToDeviceOs,
} from "@/lib/device-os"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type SetupStep = "start" | "choose-device" | "install-app" | "subscription" | "done"
type DevicePlatform = "Android" | "iOS" | "Windows" | "MacOS"
type InstallReturnStep = "start" | "choose-device"

const APP_LINKS: Record<DevicePlatform, string> = {
  Android: "https://play.google.com/store/apps/details?id=com.happproxy",
  iOS: "https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973",
  MacOS: "https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973",
  Windows:
    "https://github.com/Happ-proxy/happ-desktop/releases/latest/download/setup-Happ.x64.exe",
}

const DEVICE_OPTIONS: Array<{
  icon: ComponentType<{ className?: string }>
  platform: DevicePlatform
}> = [
  { icon: Smartphone, platform: "Android" },
  { icon: Apple, platform: "iOS" },
  { icon: Monitor, platform: "Windows" },
  { icon: Laptop, platform: "MacOS" },
]

function detectCurrentPlatform(): DevicePlatform {
  const os = detectDeviceOsFromNavigator()

  if (os === "ANDROID") {
    return "Android"
  }

  if (os === "IOS") {
    return "iOS"
  }

  if (os === "MACOS") {
    return "MacOS"
  }

  return "Windows"
}

function formatCompactSubscriptionUrl(url: string | null) {
  if (!url) {
    return "Ссылка пока недоступна"
  }

  try {
    const parsedUrl = new URL(url)
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean)
    const token = pathSegments[pathSegments.length - 1] ?? ""

    if (!token) {
      return parsedUrl.host
    }

    const tokenTail = token.slice(-4)
    return `${parsedUrl.host}/…${tokenTail}`
  } catch {
    const hostMatch = url.match(/^https?:\/\/([^/]+)/i)
    const host = hostMatch?.[1] ?? url
    const pathSegments = url.split("/").filter(Boolean)
    const token = pathSegments[pathSegments.length - 1] ?? ""
    const tokenTail = token.slice(-4)

    if (!tokenTail) {
      return host
    }

    return `${host}/…${tokenTail}`
  }
}

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto inline-flex size-18 items-center justify-center rounded-card border border-border bg-background/60 sm:size-20">
      {children}
    </div>
  )
}

export function AppSetupDialog({
  canStartSetup,
  defaultOpen = false,
  previewSlot = null,
  showTrigger = true,
  subscriptionUrl = null,
  triggerLabel = "Настроить VPN",
  triggerVariant = "outline",
}: {
  canStartSetup?: boolean
  defaultOpen?: boolean
  previewSlot?: {
    configUrl: string
    id: string
    slotIndex: number
  } | null
  showTrigger?: boolean
  subscriptionUrl?: string | null
  triggerLabel?: string
  triggerVariant?: "default" | "destructive" | "ghost" | "link" | "outline" | "secondary"
}) {
  const router = useRouter()
  const currentPlatform = useMemo(() => detectCurrentPlatform(), [])
  const [open, setOpen] = useState(defaultOpen)
  const [step, setStep] = useState<SetupStep>("start")
  const [selectedPlatform, setSelectedPlatform] = useState<DevicePlatform>(currentPlatform)
  const [installReturnStep, setInstallReturnStep] = useState<InstallReturnStep>("start")
  const [selectedPreviewSlot, setSelectedPreviewSlot] = useState(previewSlot)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupErrorCode, setSetupErrorCode] = useState<
    "NO_ACTIVE_SUBSCRIPTION" | "NO_FREE_SLOTS" | null
  >(null)
  const [, startRefreshPreviewTransition] = useTransition()
  const [isAssigning, startAssignTransition] = useTransition()

  const isSetupAvailable = canStartSetup ?? Boolean(previewSlot || subscriptionUrl)
  const effectiveSubscriptionUrl = selectedPreviewSlot?.configUrl ?? subscriptionUrl
  const displaySubscriptionUrl = formatCompactSubscriptionUrl(effectiveSubscriptionUrl)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      setStep("start")
      setSelectedPlatform(currentPlatform)
      setInstallReturnStep("start")
      setSelectedPreviewSlot(previewSlot)
      setSetupError(null)
      setSetupErrorCode(null)

      startRefreshPreviewTransition(async () => {
        try {
          const result = await getSetupPreviewSlotAction()
          if (result.ok) {
            setSelectedPreviewSlot(result.slot)
          }
        } catch {
          // Keep optimistic value from props if fetch fails.
        }
      })
    }
  }

  function handleBack() {
    if (step === "choose-device") {
      setStep("start")
      return
    }

    if (step === "install-app") {
      setStep(installReturnStep)
      return
    }

    if (step === "subscription") {
      setStep("install-app")
      return
    }

    if (step === "done") {
      setStep("subscription")
    }
  }

  async function copySubscriptionUrl() {
    if (!effectiveSubscriptionUrl) {
      toast.error("Ссылка подписки пока недоступна.", { position: "top-right" })
      return
    }

    try {
      await navigator.clipboard.writeText(effectiveSubscriptionUrl)
      toast.success("Ссылка подписки скопирована.", { position: "top-right" })
    } catch {
      toast.error("Не удалось скопировать ссылку.", { position: "top-right" })
    }
  }

  function handleFinishSetup() {
    if (isAssigning) {
      return
    }

    if (!selectedPreviewSlot) {
      setSetupError("Все устройства заняты. Замените один из слотов в разделе \"Устройства\".")
      setSetupErrorCode("NO_FREE_SLOTS")
      return
    }

    setSetupError(null)
    setSetupErrorCode(null)

    startAssignTransition(async () => {
      try {
        const result = await assignSetupSlotAction({
          deviceOs: mapSetupPlatformToDeviceOs(selectedPlatform),
          slotId: selectedPreviewSlot.id,
        })

        if (!result.ok) {
          setSetupError(result.message)
          setSetupErrorCode(result.code === "ASSIGNED" ? null : result.code)

          toast.error(result.message, { position: "top-right" })
          return
        }

        setSetupError(null)
        setSetupErrorCode(null)
        toast.success(result.message, { position: "top-right" })
        setOpen(false)
        router.refresh()
      } catch {
        const message = "Не удалось завершить настройку устройства. Повторите попытку."
        setSetupError(message)
        setSetupErrorCode(null)
        toast.error(message, { position: "top-right" })
      }
    })
  }

  function handleGoToDevices() {
    setOpen(false)
    router.push("/app?tab=devices")
  }

  const showBackButton = step !== "start"

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button
            className="h-button w-full px-button-x"
            disabled={!isSetupAvailable}
            radius="card"
            type="button"
            variant={triggerVariant}
          >
            <Settings2 className="size-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="w-[calc(100%-12px)] max-h-[calc(100svh-1rem)] overflow-y-auto p-4 sm:w-full sm:max-w-md sm:p-5">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4 text-center sm:gap-5">
          {showBackButton ? (
            <div className="flex justify-start">
              <Button
                className="bg-secondary"
                onClick={handleBack}
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
                <Settings2 className="size-8 text-foreground sm:size-10" />
              </StepIcon>

              <DialogHeader className="items-center text-center">
                <DialogTitle>Настройка на {currentPlatform}</DialogTitle>
                <DialogDescription className="w-full max-w-none">
                  Выберите сценарий установки Happ для текущего или другого устройства.
                </DialogDescription>
              </DialogHeader>

              <div className="flex w-full flex-col gap-3">
                <Button
                  className="h-button w-full px-button-x"
                  onClick={() => {
                    setSelectedPlatform(currentPlatform)
                    setInstallReturnStep("start")
                    setStep("install-app")
                  }}
                  radius="card"
                  type="button"
                >
                  Настроить на этом устройстве
                </Button>
                <Button
                  className="h-button w-full px-button-x"
                  onClick={() => setStep("choose-device")}
                  radius="card"
                  type="button"
                  variant="outline"
                >
                  Настроить на другом устройстве
                </Button>
              </div>
            </>
          ) : null}

          {step === "choose-device" ? (
            <>
              <StepIcon>
                <Smartphone className="size-8 text-foreground sm:size-10" />
              </StepIcon>

              <DialogHeader className="items-center text-center">
                <DialogTitle>Выберите устройство</DialogTitle>
                <DialogDescription className="w-full max-w-none">
                  Выберите операционную систему вашего устройства.
                </DialogDescription>
              </DialogHeader>

              <div className="flex w-full flex-col gap-3">
                {DEVICE_OPTIONS.map((item) => {
                  const Icon = item.icon

                  return (
                    <Button
                      key={item.platform}
                      className="h-button w-full px-button-x"
                      onClick={() => {
                        setSelectedPlatform(item.platform)
                        setInstallReturnStep("choose-device")
                        setStep("install-app")
                      }}
                      radius="card"
                      type="button"
                      variant="outline"
                    >
                      <Icon className="size-4" />
                      {item.platform}
                    </Button>
                  )
                })}
              </div>
            </>
          ) : null}

          {step === "install-app" ? (
            <>
              <StepIcon>
                <Download className="size-8 text-foreground sm:size-10" />
              </StepIcon>

              <DialogHeader className="items-center text-center">
                <DialogTitle>Приложение</DialogTitle>
                <DialogDescription className="w-full max-w-none">
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
                <Link2 className="size-8 text-foreground sm:size-10" />
              </StepIcon>

              <DialogHeader className="items-center text-center">
                <DialogTitle>Подписка</DialogTitle>
                <DialogDescription className="w-full max-w-none">
                  Скопируйте ссылку и добавьте подписку в Happ вручную.
                </DialogDescription>
              </DialogHeader>

              {selectedPreviewSlot ? (
                <>
                  <Button
                    className="h-button w-full min-w-0 justify-between overflow-hidden px-3"
                    onClick={copySubscriptionUrl}
                    radius="card"
                    type="button"
                    variant="outline"
                  >
                    <span className="min-w-0 flex-1 truncate text-left font-mono text-xs sm:text-sm">
                      {displaySubscriptionUrl}
                    </span>
                    <Copy className="size-4 shrink-0" />
                  </Button>

                  <Button
                    className="h-button w-full px-button-x"
                    onClick={() => setStep("done")}
                    radius="card"
                    type="button"
                  >
                    Далее
                  </Button>
                </>
              ) : (
                <>
                  <Alert className="text-left">
                    <AlertTitle>Все устройства заняты</AlertTitle>
                    <AlertDescription>
                      Все устройства заняты. Замените один из слотов в разделе «Устройства».
                    </AlertDescription>
                  </Alert>
                  <Button
                    className="h-button w-full px-button-x"
                    onClick={handleGoToDevices}
                    radius="card"
                    type="button"
                  >
                    Перейти в устройства
                  </Button>
                </>
              )}
            </>
          ) : null}

          {step === "done" ? (
            <>
              <StepIcon>
                <CheckCircle2 className="size-8 text-foreground sm:size-10" />
              </StepIcon>

              <DialogHeader className="items-center text-center">
                <DialogTitle>Готово</DialogTitle>
                <DialogDescription className="w-full max-w-none">
                  Нажмите кнопку включения в приложении Happ.
                </DialogDescription>
              </DialogHeader>

              {setupError ? <p className="text-xs text-destructive">{setupError}</p> : null}

              <div className="flex w-full flex-col gap-2">
                {!selectedPreviewSlot ? (
                  <Button
                    className="h-button w-full px-button-x"
                    onClick={handleGoToDevices}
                    radius="card"
                    type="button"
                  >
                    Перейти в устройства
                  </Button>
                ) : (
                  <Button
                    className="h-button w-full px-button-x"
                    disabled={isAssigning}
                    onClick={handleFinishSetup}
                    radius="card"
                    type="button"
                  >
                    {isAssigning ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2Icon className="size-4 animate-spin" />
                        Назначаем слот...
                      </span>
                    ) : (
                      "Завершить настройку"
                    )}
                  </Button>
                )}

                {setupError && !isAssigning ? (
                  <>
                    {setupErrorCode === "NO_FREE_SLOTS" ? (
                      <Button
                        className="h-button w-full px-button-x"
                        onClick={handleGoToDevices}
                        radius="card"
                        type="button"
                      >
                        Перейти в устройства
                      </Button>
                    ) : (
                      <Button
                        className="h-button w-full px-button-x"
                        onClick={handleFinishSetup}
                        radius="card"
                        type="button"
                        variant="outline"
                      >
                        Повторить попытку
                      </Button>
                    )}
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

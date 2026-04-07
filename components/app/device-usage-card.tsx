import Link from "next/link"

import { ActivityIcon, SmartphoneIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function DeviceUsageCard({
  activeDevices,
  blockedDevices,
  deviceLimit,
  freeDevices,
}: {
  activeDevices: number
  blockedDevices: number
  deviceLimit: number
  freeDevices: number
}) {
  const progressValue = deviceLimit > 0 ? Math.round((activeDevices / deviceLimit) * 100) : 0

  return (
    <Card className="border-border/70 bg-card/40">
      <CardHeader className="p-4">
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <SmartphoneIcon className="size-4 text-muted-foreground" />
          Устройства
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="rounded-card border border-border/70 bg-background/40 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Использовано</span>
            <span className="font-medium text-foreground">
              {activeDevices}/{deviceLimit}
            </span>
          </div>
          <Progress value={progressValue} />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-card border border-border/70 bg-background/40 p-2">
            <p className="text-xs text-muted-foreground">Активно</p>
            <p className="mt-1 text-sm font-semibold">{activeDevices}</p>
          </div>
          <div className="rounded-card border border-border/70 bg-background/40 p-2">
            <p className="text-xs text-muted-foreground">Свободно</p>
            <p className="mt-1 text-sm font-semibold">{freeDevices}</p>
          </div>
          <div className="rounded-card border border-border/70 bg-background/40 p-2">
            <p className="text-xs text-muted-foreground">Блок</p>
            <p className="mt-1 text-sm font-semibold">{blockedDevices}</p>
          </div>
        </div>

        <Button asChild className="w-full" radius="card" variant="outline">
          <Link href="/app?tab=devices">
            <ActivityIcon data-icon="inline-start" />
            Управлять устройствами
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

"use client";

import { useMemo, useState } from "react";

import {
  saveSubscriptionDurationRulesAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyPercentDiscount } from "@/lib/subscription-pricing";
import { calculateAdminSubscriptionPreviewPrice } from "@/lib/subscription-preview";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

type DurationRuleItem = {
  discountPercent: number;
  id: string;
  monthlyPrice: number;
  months: number;
};

type PricingSettings = {
  baseDeviceMonthlyPrice: number;
  extraDeviceMonthlyPrice: number;
  maxDevices: number;
  minDevices: number;
};

type DurationRuleDraft = {
  discountPercent: number;
  id?: string;
  months: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMonthsLabel(months: number) {
  if (months === 1) {
    return "1 месяц";
  }

  if (months >= 2 && months <= 4) {
    return `${months} месяца`;
  }

  return `${months} месяцев`;
}

export function AdminTariffsSection({
  durationRules,
  pricingSettings,
}: {
  durationRules: DurationRuleItem[];
  pricingSettings: PricingSettings;
}) {
  const sortedRules = useMemo(
    () => [...durationRules].sort((a, b) => a.months - b.months),
    [durationRules]
  );

  const [rows, setRows] = useState<DurationRuleDraft[]>(
    sortedRules.map((rule) => ({
      discountPercent: rule.discountPercent,
      id: rule.id,
      months: rule.months,
    }))
  );
  const [baseDeviceMonthlyPrice, setBaseDeviceMonthlyPrice] = useState(
    pricingSettings.baseDeviceMonthlyPrice
  );
  const [extraDeviceMonthlyPrice, setExtraDeviceMonthlyPrice] = useState(
    pricingSettings.extraDeviceMonthlyPrice
  );
  const [durationMonthlyPrice, setDurationMonthlyPrice] = useState(
    sortedRules[0]?.monthlyPrice ?? pricingSettings.baseDeviceMonthlyPrice
  );
  const [deviceRange, setDeviceRange] = useState<[number, number]>([
    clamp(pricingSettings.minDevices, 1, 10),
    clamp(Math.max(pricingSettings.maxDevices, pricingSettings.minDevices), 1, 10),
  ]);
  const [previewMonths, setPreviewMonths] = useState(sortedRules[0]?.months ?? 1);
  const [previewDevices, setPreviewDevices] = useState(2);

  const minDevices = deviceRange[0];
  const maxDevices = deviceRange[1];
  const sliderMax = 10;
  const effectivePreviewDevices = clamp(previewDevices, minDevices, maxDevices);

  const previewRows = useMemo(
    () =>
      rows
        .filter((row) => Number.isFinite(row.months) && row.months > 0)
        .sort((a, b) => a.months - b.months),
    [rows]
  );

  const activePreviewRow =
    previewRows.find((row) => row.months === previewMonths) ?? previewRows[0] ?? null;
  const activePreviewPrice = activePreviewRow
    ? calculateAdminSubscriptionPreviewPrice({
        baseDeviceMonthlyPrice,
        devices: effectivePreviewDevices,
        discountPercent: activePreviewRow.discountPercent,
        extraDeviceMonthlyPrice,
        months: activePreviewRow.months,
        vpnMonthlyPrice: durationMonthlyPrice,
      })
    : null;
  const previewTotal = activePreviewPrice?.finalTotalRub ?? 0;
  const previewVpnMonthlyWithDiscount = activePreviewRow
    ? applyPercentDiscount(durationMonthlyPrice, activePreviewRow.discountPercent)
    : durationMonthlyPrice;

  return (
    <AdminSectionShell
      description="Глобальные правила конструктора подписки: сроки, цены и параметры устройств."
      eyebrow="SUBSCRIPTION RULES"
      id="tariffs"
      title="Тарифные правила"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)_minmax(0,360px)]">
        <AdminSurface>
          <form
            action={saveSubscriptionDurationRulesAction}
            className="space-y-4"
            id="tariff-rules-form"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold">Сроки подписки</p>
              <p className="text-sm text-muted-foreground">
                Таблица сроков с редактируемыми параметрами: срок и скидка.
              </p>
            </div>

            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3 text-left">Срок (мес)</TableHead>
                  <TableHead className="w-1/3 text-left">Скидка (%)</TableHead>
                  <TableHead className="w-1/3 text-left">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id ?? `new-${index}`}>
                    <TableCell className="w-1/3">
                      <Input
                        min={1}
                        onChange={(event) => {
                          const next = [...rows];
                          next[index] = {
                            ...next[index],
                            months: Number.parseInt(event.target.value || "0", 10),
                          };
                          setRows(next);
                        }}
                        type="number"
                        value={row.months}
                      />
                    </TableCell>
                    <TableCell className="w-1/3">
                      <Input
                        max={100}
                        min={0}
                        onChange={(event) => {
                          const next = [...rows];
                          next[index] = {
                            ...next[index],
                            discountPercent: Number.parseInt(event.target.value || "0", 10),
                          };
                          setRows(next);
                        }}
                        type="number"
                        value={row.discountPercent}
                      />
                    </TableCell>
                    <TableCell className="w-1/3 text-left">
                      <div className="flex justify-start">
                        <Button
                          className="h-9 px-3"
                          disabled={rows.length <= 1}
                          onClick={() => {
                            setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
                          }}
                          radius="card"
                          type="button"
                          variant="outline"
                        >
                          Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="flex justify-center">
                      <Button
                        className="h-9 px-3"
                        onClick={() => {
                          const lastMonths = rows.length ? rows[rows.length - 1]?.months ?? 0 : 0;
                          setRows((prev) => [
                            ...prev,
                            {
                              discountPercent: 0,
                              months: Math.max(1, lastMonths + 1),
                            },
                          ]);
                        }}
                        radius="card"
                        type="button"
                        variant="outline"
                      >
                        Добавить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <input name="rulesJson" type="hidden" value={JSON.stringify(rows)} />
          </form>
        </AdminSurface>

        <AdminSurface>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Устройства и стоимость</p>
              <p className="text-sm text-muted-foreground">
                Минимум и максимум устройств настраиваются слайдером диапазона.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Диапазон устройств</span>
                <span className="text-muted-foreground">
                  {minDevices} - {maxDevices}
                </span>
              </div>
              <Slider
                max={sliderMax}
                min={1}
                onValueChange={(value) => {
                  const nextMin = clamp(value[0] ?? 1, 1, sliderMax);
                  const nextMax = clamp(value[1] ?? nextMin, nextMin, sliderMax);
                  setDeviceRange([nextMin, nextMax]);
                }}
                step={1}
                value={[minDevices, maxDevices]}
              />
            </div>

            <input form="tariff-rules-form" name="minDevices" type="hidden" value={minDevices} />
            <input form="tariff-rules-form" name="maxDevices" type="hidden" value={maxDevices} />

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="base-monthly-price">
                Базовая цена в месяц (1 устройство)
              </label>
              <Input
                form="tariff-rules-form"
                id="base-monthly-price"
                min="0"
                name="baseDeviceMonthlyPrice"
                onChange={(event) => {
                  setBaseDeviceMonthlyPrice(Number.parseInt(event.target.value || "0", 10));
                }}
                required
                type="number"
                value={baseDeviceMonthlyPrice}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="extra-monthly-price">
                Цена доп. устройства в месяц
              </label>
              <Input
                form="tariff-rules-form"
                id="extra-monthly-price"
                min="0"
                name="extraDeviceMonthlyPrice"
                onChange={(event) => {
                  setExtraDeviceMonthlyPrice(Number.parseInt(event.target.value || "0", 10));
                }}
                required
                type="number"
                value={extraDeviceMonthlyPrice}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="duration-monthly-price">
                Цена/мес (₽)
              </label>
              <Input
                form="tariff-rules-form"
                id="duration-monthly-price"
                min={0}
                name="durationMonthlyPrice"
                onChange={(event) => {
                  setDurationMonthlyPrice(Number.parseInt(event.target.value || "0", 10));
                }}
                required
                type="number"
                value={durationMonthlyPrice}
              />
            </div>

            <Button
              className="h-button w-full px-button-x"
              form="tariff-rules-form"
              radius="card"
              type="submit"
            >
              Сохранить
            </Button>
          </div>
        </AdminSurface>

        <AdminSurface>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Предпросмотр тарифа</p>
              <p className="text-sm text-muted-foreground">
                Превью рассчитывается в реальном времени от текущих настроек.
              </p>
            </div>

            {previewRows.length ? (
              <>
                <RadioGroup
                  className="grid gap-2"
                  onValueChange={(value) => {
                    setPreviewMonths(Number.parseInt(value, 10) || previewRows[0].months);
                  }}
                  value={String(activePreviewRow?.months ?? previewRows[0].months)}
                >
                  {previewRows.map((row) => {
                    const rowPrice = calculateAdminSubscriptionPreviewPrice({
                      baseDeviceMonthlyPrice,
                      devices: effectivePreviewDevices,
                      discountPercent: row.discountPercent,
                      extraDeviceMonthlyPrice,
                      months: row.months,
                      vpnMonthlyPrice: durationMonthlyPrice,
                    });
                    const checked = (activePreviewRow?.months ?? previewRows[0].months) === row.months;

                    return (
                      <label
                        className={`cursor-pointer rounded-card border p-3 transition-colors ${
                          checked
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background/50 hover:bg-background/70"
                        }`}
                        key={row.id ?? `preview-${row.months}`}
                      >
                        <RadioGroupItem className="sr-only" value={String(row.months)} />
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{getMonthsLabel(row.months)}</p>
                          <p className="text-sm font-semibold">{rowPrice.finalTotalRub} ₽</p>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>

                <div className="space-y-2 rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <p className="text-sm text-muted-foreground">
                    Количество устройств: <span className="font-medium text-foreground">{effectivePreviewDevices}</span>
                  </p>
                  <Slider
                    max={maxDevices}
                    min={minDevices}
                    onValueChange={(value) => {
                      setPreviewDevices(clamp(value[0] ?? minDevices, minDevices, maxDevices));
                    }}
                    step={1}
                    value={[effectivePreviewDevices]}
                  />
                </div>

                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <p className="text-sm text-muted-foreground">
                    VPN цена/мес: <span className="font-medium text-foreground">{previewVpnMonthlyWithDiscount} ₽</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Устройства/мес: <span className="font-medium text-foreground">{activePreviewPrice?.devicesMonthlyPrice ?? 0} ₽</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Итого за {getMonthsLabel(activePreviewRow?.months ?? previewRows[0].months)}: {" "}
                    <span className="font-semibold text-foreground">{previewTotal} ₽</span>
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Добавьте хотя бы один срок, чтобы увидеть предпросмотр.</p>
            )}
          </div>
        </AdminSurface>
      </div>
    </AdminSectionShell>
  );
}

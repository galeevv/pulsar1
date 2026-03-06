import { createTariffAction, updateTariffAction } from "@/app/admin/actions";
import { archiveTariffAction } from "@/app/admin/tariff-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type TariffItem = {
  createdAt: Date;
  deviceLimit: number;
  devicePriceRub: number;
  id: string;
  isEnabled: boolean;
  name: string;
  periodMonths: number;
  priceRub: number;
};

function getTariffTotalPrice(tariff: TariffItem) {
  return tariff.priceRub * tariff.periodMonths + tariff.devicePriceRub * tariff.deviceLimit;
}

export function AdminTariffsSection({
  tariffs,
}: {
  tariffs: TariffItem[];
}) {
  return (
    <AdminSectionShell
      description="Реальные тарифы для MVP: админ может создавать, обновлять и архивировать их. Клиентский `/app` показывает только включенные тарифы."
      eyebrow="TARIFFS"
      id="tariffs"
      title="Тарифы"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <AdminSurface>
          <form action={createTariffAction} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="tariff-name">
                Название тарифа
              </label>
              <Input id="tariff-name" name="name" placeholder="Например, Pro 3" required />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="tariff-period">
                Период (в месяцах)
              </label>
              <Input id="tariff-period" min="1" name="periodMonths" required type="number" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="tariff-price">
                Цена одного месяца (рубли)
              </label>
              <Input id="tariff-price" min="1" name="priceRub" required type="number" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="tariff-device-price">
                Цена одного устройства (рубли)
              </label>
              <Input
                defaultValue={0}
                id="tariff-device-price"
                min="0"
                name="devicePriceRub"
                required
                type="number"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="tariff-devices">
                Количество устройств
              </label>
              <Input id="tariff-devices" min="1" name="deviceLimit" required type="number" />
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input defaultChecked name="isEnabled" type="checkbox" />
              Тариф включен
            </label>

            <Button className="h-button w-full px-button-x" radius="card" type="submit">
              Создать тариф
            </Button>
          </form>
        </AdminSurface>

        <div className="space-y-4">
          {tariffs.length ? (
            tariffs.map((tariff) => (
              <AdminSurface key={tariff.id}>
                <form action={updateTariffAction} className="space-y-4">
                  <input name="id" type="hidden" value={tariff.id} />

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{tariff.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tariff.periodMonths} мес. • {tariff.priceRub} ₽/мес. •{" "}
                        {tariff.devicePriceRub} ₽/устройство • {tariff.deviceLimit} устройств
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Итого: {getTariffTotalPrice(tariff)} ₽
                      </p>
                    </div>
                    <AdminStatusPill
                      label={tariff.isEnabled ? "Включен" : "Архив"}
                      tone={tariff.isEnabled ? "success" : "default"}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Название</label>
                      <Input defaultValue={tariff.name} name="name" required />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Период (мес.)</label>
                      <Input
                        defaultValue={tariff.periodMonths}
                        min="1"
                        name="periodMonths"
                        required
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Цена одного месяца (рубли)
                      </label>
                      <Input
                        defaultValue={tariff.priceRub}
                        min="1"
                        name="priceRub"
                        required
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Цена одного устройства (рубли)
                      </label>
                      <Input
                        defaultValue={tariff.devicePriceRub}
                        min="0"
                        name="devicePriceRub"
                        required
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Устройства</label>
                      <Input
                        defaultValue={tariff.deviceLimit}
                        min="1"
                        name="deviceLimit"
                        required
                        type="number"
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input defaultChecked={tariff.isEnabled} name="isEnabled" type="checkbox" />
                    Тариф включен
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button className="h-button px-button-x" radius="card" type="submit">
                      Сохранить тариф
                    </Button>
                    <Button
                      className="h-button px-button-x"
                      formAction={archiveTariffAction}
                      radius="card"
                      type="submit"
                      variant="outline"
                    >
                      Архивировать
                    </Button>
                  </div>
                </form>
              </AdminSurface>
            ))
          ) : (
            <AdminSurface>
              <p className="text-sm text-muted-foreground">
                Тарифов пока нет. Создайте первый тариф, и он сразу появится в `/app`.
              </p>
            </AdminSurface>
          )}
        </div>
      </div>
    </AdminSectionShell>
  );
}

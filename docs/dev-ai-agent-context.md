# Pulsar Dev AI Agent Context

Last updated: 2026-03-10

## 1) Цель документа

Этот документ нужен как быстрый `source of truth` для AI-агента и разработчика, чтобы:

- не ломать прод-схему при изменениях,
- понимать текущую модель контроля устройств,
- правильно интегрировать сайт с 3x-ui API только на сервере,
- быстрее вносить фичи без регрессий в биллинге и VPN-выдаче.

Основной продуктовый handbook: `docs/system-handbook.md`.
Этот файл дополняет его инженерными деталями по устройствам, серверу и API.

## 2) Прод-архитектура (single VPS)

Текущий целевой стек на одном сервере:

- `Ubuntu 24.04 LTS` (single VPS).
- `Nginx` как reverse proxy.
- `Next.js` приложение (`1pulsar.space`) как control-plane:
  - auth,
  - billing,
  - dashboard,
  - admin,
  - server-side интеграция с 3x-ui API.
- `3x-ui + Xray` как VPN-plane:
  - панель: `panel.1pulsar.space`,
  - subscription endpoint: `sub.1pulsar.space`,
  - inbounds: primary + backup (например Reality/TLS) через общую подписку.

Разделение ролей доменов:

- `1pulsar.space`: веб-продукт и API сайта.
- `panel.1pulsar.space`: только админ-панель 3x-ui.
- `sub.1pulsar.space`: только subscription links.

Ключевая идея:

- Бизнес-логика в Next.js.
- 3x-ui хранит только VPN-уровень.
- Никаких чувствительных browser->3x-ui вызовов.

## 3) Технологический стек проекта

- `Next.js 16` (App Router, Server Components, Server Actions, Route Handlers).
- `TypeScript`.
- `Prisma + SQLite` (`@prisma/adapter-better-sqlite3`).
- UI: `shadcn/ui`, `Tailwind`.
- Сессии: DB-backed `Session` + `httpOnly` cookie.

Главные точки в коде:

- Бизнес-действия пользователя: `app/app/actions.ts`.
- Админ-подтверждение/отклонение платежей: `app/admin/payment-actions.ts`.
- Данные подписок и слотов: `lib/subscription-management.ts`.
- 3x-ui интеграция: `lib/xui-integration.ts` + `server/services/xui/*`.

## 4) Новая модель контроля устройств (STRICT)

## 4.1 Что было раньше (legacy)

- Один x-ui клиент на подписку.
- Ограничение устройcтв через `limitIp = N`.

## 4.2 Что сейчас (актуально)

- `1 slot = 1 отдельный x-ui client (UUID) = limitIp=2`.
- Количество устройств пользователя = количество **активных** `DeviceSlot`.
- Каждому активному слоту выдается собственная sub-link (`DeviceSlot.configUrl`).
- `Subscription.subscriptionUrl` хранит ссылку первого активного слота (быстрый onboarding в UI).
- Важно: в x-ui `limitIp` применяется к client entry в конкретном inbound. При двух inbounds (primary+backup) один slot имеет две записи клиента, поэтому эффективный суммарный предел может быть выше при одновременном использовании обеих нод.

## 4.3 Таблица и поля (Prisma)

Модель `DeviceSlot`:

- `status`: `FREE | ACTIVE | BLOCKED`
- `slotIndex`
- `marzbanUsername` (историческое имя поля; фактически username в x-ui)
- `configUrl`
- `lastSyncAt`
- `lastSyncError`

Модель `Subscription`:

- `deviceLimit`, `devices`
- `subscriptionUrl` (первый активный слот)
- `marzbanStatus`, `marzbanDataJson`, `lastSyncAt`, `lastSyncError`

## 4.4 Lifecycle слота

- `FREE`: слот доступен, но VPN-клиент не выдан.
- `ACTIVE`: слот синхронизирован в x-ui, доступен sub-link.
- `BLOCKED`: слот отключен (например после revoke подписки).

## 4.5 Как синхронизация работает сейчас

Файл: `lib/xui-integration.ts`.

- `issueSubscriptionInXui(subscriptionId)`:
  - переводит все `FREE` слоты подписки в `ACTIVE`,
  - для каждого `ACTIVE` создает/обновляет x-ui клиента с `limitIp=2`,
  - для `FREE/BLOCKED` отзывает клиента и очищает link/username.
- `syncSubscriptionInXui(subscriptionId)`:
  - приводит x-ui к состоянию слотов в БД.
- `revokeSubscriptionInXui(subscriptionId)`:
  - отзывает всех slot-клиентов,
  - очищает ссылки,
  - ставит слоты в `BLOCKED`.

## 4.6 Важные последствия STRICT-модели

- Компрометация одного UUID не дает автоматически доступ ко всем устройствам.
- Гибкое управление устройствами в dashboard (activate/deactivate slot).
- Если у пользователя 3 слота, это 3 независимых VPN-identity.
- Для primary+backup inbound один слот получает multi-node конфиг внутри одной sub-link.

## 5) Интеграция сайта с 3x-ui API

## 5.1 Базовые правила безопасности

- Только server-side.
- Секреты 3x-ui только в env.
- Не отдавать токены/пароли 3x-ui в клиент и `NEXT_PUBLIC_*`.
- Логи не должны содержать credentials.
- `fail2ban` относится к hardening хоста (SSH/Nginx brute-force) и не заменяет slot-based device control.

## 5.2 Где находится API-клиент

- `server/services/xui/http-client.ts`:
  - логин в panel,
  - cookie session,
  - `apiGet/apiPost/panelPost`.
- `server/services/xui/adapter.ts`:
  - доменная логика create/update/revoke/sync пользователя,
  - работа с primary/backup inbound,
  - получение sub-link.
- `lib/xui-integration.ts`:
  - orchestration на уровне Subscription/DeviceSlot и запись в Prisma.

## 5.3 Здоровье интеграции

Админские route handlers:

- `GET /api/integrations/xui/health`
- alias: `GET /api/integrations/marzban/health`

Оба доступны только ADMIN-сессии.

## 6) API поверхности проекта

## 6.1 HTTP Route Handlers (сейчас)

- `/api/auth/session-destination`
- `/api/integrations/xui/health`
- `/api/integrations/marzban/health`

## 6.2 Server Actions (критичные)

Пользовательские:

- `confirmTariffPaymentAction`
- `payTariffWithCreditsAction`
- `activateDeviceSlotAction`
- `deactivateDeviceSlotAction`

Админские:

- `approvePaymentRequestAction`
- `rejectPaymentRequestAction`

## 6.3 Контракт фронта для устройств

Dashboard должен считать истиной:

- `activeSubscription.deviceSlots[]`
- `slot.status`
- `slot.configUrl`
- `slot.lastSyncError`

UI не должен пытаться генерировать/редактировать VPN-конфиги локально.
UI только вызывает server actions и показывает результат.

## 7) Переменные окружения (минимум)

База:

- `DATABASE_URL`
- `SESSION_SECRET`

3x-ui:

- `XUI_BASE_URL`
- `XUI_WEB_BASE_PATH`
- `XUI_PRIMARY_INBOUND_ID`
- `XUI_BACKUP_INBOUND_ID` (optional)
- `XUI_USERNAME`
- `XUI_PASSWORD`
- `XUI_PANEL_BASIC_AUTH_USERNAME` (если panel защищена basic auth)
- `XUI_PANEL_BASIC_AUTH_PASSWORD`
- `XUI_SUBSCRIPTION_BASE_URL`
- `XUI_CLIENT_FLOW`
- `XUI_EMAIL_PREFIX`
- `XUI_TIMEOUT_MS`
- `XUI_VERIFY_TLS`
- `XUI_ENABLE_MOCK_FALLBACK`

## 8) Инварианты, которые нельзя ломать

- Control-plane = `1pulsar.space` (Next.js), а не 3x-ui panel.
- Device limit enforce через количество активных слотов, а не через общий `limitIp=N`.
- Все критические операции с 3x-ui только с backend.
- Статусы оплаты и подписки не обходятся:
  - `MARKED_PAID -> APPROVED/REJECTED`
  - `ACTIVE/REVOKED/EXPIRED`
- При отказе интеграции UI показывает уведомление, а ошибка фиксируется в БД (`lastSyncError`, `IntegrationSyncLog`).

## 9) Практический workflow для AI-агента

При задаче на изменение VPN/устройств:

1. Проверить `prisma/schema.prisma` и действующие статусы.
2. Проверить `lib/xui-integration.ts` (основная оркестрация).
3. Проверить `app/app/actions.ts` и `app/admin/payment-actions.ts`.
4. Обновить UI (`components/app/*`) только после backend-инвариантов.
5. Прогнать:
   - `npm run lint`
   - `npm run build`
6. Обновить `docs/system-handbook.md` decision log, если меняется поведение.

## 10) Типовые проблемы и диагностика

Проблема: sub-link есть, но клиент не подключается.

- Проверить `DeviceSlot.lastSyncError`.
- Проверить `IntegrationSyncLog` по `targetType=DEVICE_SLOT`.
- Проверить доступность inbound в 3x-ui и корректность `XUI_*` env.

Проблема: лимит устройств обходится.

- Проверить что используются **разные** slot-клиенты.
- Проверить что каждый slot-client имеет `limitIp=2`.
- Проверить что UI не раздает одну и ту же sub-link всем слотам.

Проблема: после продления старые конфиги продолжают работать.

- Проверить выполнение revoke для предыдущей подписки.
- Проверить статусы старых слотов (`BLOCKED`) и факт удаления клиентов в 3x-ui.

## 11) Что улучшать дальше (последовательно)

- Добавить E2E тесты для slot lifecycle:
  - purchase -> issue slots,
  - activate/deactivate slot,
  - renewal with revoke previous slots,
  - reject payment -> full revoke.
- Добавить админ-страницу по device slots и ошибкам синка.
- Добавить soft-retry job для временных сбоев 3x-ui API.

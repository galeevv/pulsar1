# Pulsar Dev AI Agent Context

Last updated: 2026-03-19

## 1) Назначение

Краткий инженерный контекст для AI-агента и разработчика. Документ должен помогать вносить изменения без нарушения прод-инвариантов.

Основной продуктовый документ: `docs/system-handbook.md`.

## 2) Текущая архитектура

- Single VPS: `Ubuntu + Nginx + Next.js + SQLite + 3x-ui`.
- Next.js (`1pulsar.space`) = control-plane (auth, billing, app/admin UI).
- 3x-ui (`panel.1pulsar.space`, `sub.1pulsar.space`) = VPN-plane.
- Любые операции с 3x-ui выполняются только server-side.

## 3) Стек

- Next.js 16 (App Router, Server Actions, Route Handlers)
- TypeScript
- Prisma + SQLite
- shadcn/ui + Tailwind
- Сессия: DB-backed `Session` + `httpOnly` cookie `pulsar_session`

## 4) Бизнес-инварианты (не ломать)

1. Нет browser-вызовов в Platega/3x-ui.
2. Нет секретов в `NEXT_PUBLIC_*`.
3. Webhook Platega идемпотентен: одна оплата -> одна активация.
4. Referral/price логика консистентна между `/app`, `/admin`, server calc.
5. Invite-code используется строго один раз (atomic updateMany + guard).
6. Пользователь видит только свои тикеты; admin видит все.
7. Cookie мутации только в Server Actions/Route Handlers, не в Server Components.

## 5) Платежная модель (актуально)

Поддерживаются только методы:

- `PLATEGA`
- `CREDITS`

Legacy ручной перевод удален из runtime-модели.

### Статусы `PaymentRequest`

- `CREATED`
- `APPROVED`
- `REJECTED`

### Ключевые точки

- `POST /api/payments/platega/create`
- `GET /api/payments/platega/status`
- `POST /api/payments/platega/webhook`
- `app/app/actions.ts` (`payTariffWithCreditsAction`)

### Env для Platega

- `PLATEGA_BASE_URL`
- `PLATEGA_MERCHANT_ID`
- `PLATEGA_SECRET` (основной)
- `PLATEGA_API_KEY` (обратная совместимость)
- `PLATEGA_RETURN_URL` (опционально)
- `PLATEGA_FAILED_URL` (опционально)

### Unified post-approval handler

Общий idempotent обработчик:

- `lib/payment-post-approval-handler.ts`
  - `handleApprovedPaymentPostProcessing`
  - `handleRejectedPaymentPostProcessing`

Используется и в credits-flow, и в Platega webhook.

Что делает:

- создает/продлевает подписку,
- начисляет referral reward для первой `APPROVED` покупки (с защитой от повторов),
- при `CHARGEBACK/FAILED/CANCEL*` после `APPROVED` делает revoke подписки.

## 6) Хеширование паролей

- Текущий алгоритм: Argon2id (`@node-rs/argon2`).
- Формат хранения: Argon2 PHC string (встроенный per-user salt).
- Мягкая миграция:
  - login проверяет Argon2 или legacy scrypt,
  - при успешном login legacy-хеш автоматически перезаписывается в Argon2id.

Файлы:

- `lib/auth.ts`
- `scripts/bootstrap-admin.mjs`

## 7) Ограничение емкости

- `ServiceCapacitySettings.maxActiveSubscriptions`
- `0` = без лимита.
- Новые покупки без активной подписки блокируются при достижении лимита.
- Продления активных подписок разрешены.

## 8) Support tickets

- User UI: `/app` dialog.
- Admin UI: `/admin` support section.
- Доступ контролируется на backend (`app/api/support/*`, `app/api/admin/support/*`, `lib/support/*`).

## 9) Миграции и baseline

Прод-политика:

- только `prisma migrate deploy`.
- `db push` только локально.

Если БД исторически создана через `db push` и нет `_prisma_migrations`:

- `npm run db:migrate:baseline`

Скрипт baseline:

- `scripts/prisma-baseline-migrations.mjs`

Runbook:

- `docs/migrate-deploy-runbook.md`

## 10) Минимальный workflow для изменений

1. Проверить `prisma/schema.prisma` и ключевые server-paths.
2. Внести минимальные изменения без большого рефактора.
3. Прогнать:
   - `npm run lint`
   - `npm run test`
   - `npm run build`
   - `npx prisma migrate status`
4. Обновить docs при изменении поведения.

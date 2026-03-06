# Pulsar System Handbook

Last updated: 2026-03-06

## 1) Product Scope (MVP)

Pulsar is a private access service with:

- Landing: `/`
- Login/Register: `/login`
- User dashboard: `/app`
- Admin dashboard: `/admin`
- Marzban integration: `panel.1pulsar.space` (server-side only)

Registration is closed and works only by `invite` or `referral` code.

## 2) Tech Stack

- Next.js 16 (App Router) + TypeScript
- Prisma + SQLite (`@prisma/adapter-better-sqlite3`)
- shadcn/ui + Tailwind + lucide-react
- Server Actions + Route Handlers + Server Components + Proxy middleware
- Session model in DB + `httpOnly` cookie `pulsar_session`

## 3) Main Business Flows

### 3.1 Auth

- Login checks credentials and creates DB session + signed cookie.
- Registration validates:
  - username: `a-z0-9_`, length `3..32`
  - passwords match
  - invite/referral code validity
- Invite code consumption is atomic: one invite can be used only once.

### 3.2 Tariff Pricing and Payment / Subscription

Tariff pricing model:

- `priceRub` = price for one month.
- `devicePriceRub` = price for one device.
- Final checkout amount = `priceRub * periodMonths + devicePriceRub * deviceLimit`.

Primary flow:

1. User chooses an active tariff in `/app`.
2. User opens checkout dialog with bank/card details.
3. After transfer, user clicks `Оплачено`.
4. System creates payment request in `MARKED_PAID` state and immediately activates subscription locally.
5. System tries to issue access in Marzban.
6. Admin verifies transfer later:
   - `APPROVED`: confirms payment
   - `REJECTED`: revokes access

Important state rules:

- `APPROVE` is allowed only from `MARKED_PAID`.
- `REJECT` is used for non-approved request verification path.
- On `MARKED_PAID`, previous active subscription is revoked before new one is created.

### 3.3 Dashboard and Setup UX

- `/app` layout is dashboard-first: `Tariffs -> Dashboard -> Referral/Promo`.
- Dashboard balance card contains:
  - `username`
  - internal balance (`credits`)
  - total invited users (by own referral code)
  - active invited users (invited users with at least one `APPROVED` payment)
- Dashboard subscription card contains:
  - status, tariff, start/end dates
  - subscription URL
  - copy URL action
  - `Установка и настройка` multi-step dialog for Happ

Happ setup dialog flow:

1. Start screen with current device detection.
2. Optional device selection (`Android`, `iOS`, `Windows`, `MacOS`).
3. App install step with platform-specific download link.
4. Subscription step:
   - copy URL button
   - temporary `Добавить` placeholder action (toast; deep-link API integration is planned)
5. Done step (`Завершить настройку` closes dialog).

### 3.4 Referral Program

- User can generate personal referral code only after first `APPROVED` payment.
- Referral reward is granted to code owner on first approved payment of referred user.

### 3.5 Promo Codes and Credits

- Promo code redemption adds credits to user balance.
- Credits payment for tariff is planned but currently not implemented in payment action flow.

## 4) Data Model Overview

Core entities:

- `User` (`role`, `credits`)
- `Session` (server session store)
- `InviteCode`, `ReferralCode`, `ReferralCodeUse`
- `PromoCode`, `PromoCodeRedemption`
- `Tariff` (`priceRub`, `periodMonths`, `devicePriceRub`, `deviceLimit`)
- `PaymentRequest` (`CREATED`, `MARKED_PAID`, `APPROVED`, `REJECTED`)
- `Subscription` (`ACTIVE`, `REVOKED`, `EXPIRED`)
- `DeviceSlot`
- `IntegrationSyncLog` (Marzban integration audit trail)

Schema source: `prisma/schema.prisma`.

## 5) Marzban Integration Rules

- Never call Marzban from browser/client. Server-side only.
- Trigger points:
  - issue on `MARKED_PAID`
  - sync on `APPROVED`
  - revoke on `REJECTED`
- Health endpoint: `GET /api/integrations/marzban/health` (admin only).
- Integration logs are persisted in `IntegrationSyncLog`.

Username policy:

- Preferred: app username if it matches `a-z0-9_`, `3..32`.
- Fallback: generated username with configured prefix.

## 6) Environment Variables

Base:

- `DATABASE_URL` (local default: `file:./prisma/dev.db`)
- `SESSION_SECRET` (required in production)

Marzban:

- `MARZBAN_BASE_URL`
- `MARZBAN_AUTH_MODE=password|token`
- `MARZBAN_USERNAME`
- `MARZBAN_PASSWORD`
- `MARZBAN_TOKEN`
- `MARZBAN_USERNAME_PREFIX`
- `MARZBAN_TIMEOUT_MS`
- `MARZBAN_VERIFY_TLS`
- `MARZBAN_ENABLE_MOCK_FALLBACK`

Admin bootstrap:

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`

See `.env.example` for current template.

## 7) Admin Bootstrap (Production)

Production does not auto-create admin at runtime.

### Linux (bash)

```bash
export BOOTSTRAP_ADMIN_USERNAME=your_admin
export BOOTSTRAP_ADMIN_PASSWORD='strong_password_here'
npm run admin:bootstrap
```

### Windows (PowerShell)

```powershell
$env:BOOTSTRAP_ADMIN_USERNAME="your_admin"
$env:BOOTSTRAP_ADMIN_PASSWORD="strong_password_here"
npm run admin:bootstrap
```

What command does:

- Creates admin if user does not exist.
- Updates password and role (`ADMIN`) if user exists.

Script: `scripts/bootstrap-admin.mjs`.

## 8) Deployment Runbook (Ubuntu, short)

1. Configure `.env` with production values.
2. Install dependencies and build:
   - `npm ci`
   - `npm run build`
3. Bootstrap admin:
   - `npm run admin:bootstrap`
4. Start app behind Nginx:
   - `npm run start`

Recommended: run app as systemd service and keep `.env` outside git.

## 9) Security and Engineering Constraints

- No secrets in `NEXT_PUBLIC_*`.
- Do not log Marzban token/password.
- Keep Marzban calls server-side only.
- Keep changes incremental and testable.
- Preserve existing MVP UX when changing backend internals.

## 10) Documentation Maintenance Policy

This file is the living source of truth for MVP behavior.

Update this file when any of these change:

- Payment state machine / transitions
- Tariff pricing model
- Registration/invite/referral logic
- Dashboard onboarding UX
- Admin access/bootstrap process
- Marzban integration triggers/config
- Environment variables
- Deployment or operational procedures

When updating, do both:

1. Update the relevant section text.
2. Add a line to Decision Log below.

## 11) Decision Log

| Date       | Decision | Why |
|------------|----------|-----|
| 2026-03-06 | Tariff pricing model updated: monthly + per-device price, explicit total formula | Make checkout amount transparent and deterministic in both `/app` and `/admin` |
| 2026-03-06 | Added multi-step Happ setup dialog in Dashboard subscription block | Replace single connect button with clearer onboarding path across platforms |
| 2026-03-06 | Dashboard balance block now shows referral funnel counters (`total invited`, `active invited`) | Give users direct visibility into referral performance |
| 2026-03-06 | User `/app` restructured to Dashboard-first layout (Profile/Payment/Subscription sections removed from UI) | Reduce UX complexity and keep core data (balance + subscription state) in one place |
| 2026-03-06 | Tariff selection switched to dialog checkout with direct `Оплачено` action | Make payment flow shorter and remove dead-end `Выбрать` button |
| 2026-03-05 | Production admin bootstrap moved to explicit command `npm run admin:bootstrap` | Avoid insecure runtime default credentials |
| 2026-03-05 | Invite code consumption made atomic in registration transaction | Guarantee one-time invite usage under race conditions |
| 2026-03-05 | Admin approve restricted to `MARKED_PAID` only | Enforce payment verification state machine |

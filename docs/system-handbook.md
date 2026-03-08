# Pulsar System Handbook

Last updated: 2026-03-07

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

### 3.2 Subscription Constructor (replaces fixed tariffs)

User no longer chooses predefined tariff cards. In `/app` user configures subscription by:

- duration: `1 / 3 / 6 / 12` months
- device count in admin-defined range `minDevices..maxDevices`

Price model (server-side authoritative):

- `devicesMonthlyPrice = baseDeviceMonthlyPrice + (devices - 1) * extraDeviceMonthlyPrice`
- `totalBeforeDiscount = (vpnMonthlyPrice + devicesMonthlyPrice) * months`
- `vpnTotalAfterDurationDiscount = (vpnMonthlyPrice * months) * (1 - durationDiscount)`
- `devicesTotal = devicesMonthlyPrice * months`
- `totalAfterDurationDiscount = vpnTotalAfterDurationDiscount + devicesTotal`
- `firstMonthVpnAfterDurationDiscount = vpnMonthlyPrice * (1 - durationDiscount)`
- `referralDiscountAmount = firstMonthVpnAfterDurationDiscount * referralDiscount`
- `finalTotal = totalAfterDurationDiscount - referralDiscountAmount` (first-purchase referral, only on first VPN month)
- final result is rounded to RUB integer

`/app` and `/admin` preview use the same shared helper as server-side checkout (`calculateSubscriptionPrice`), but final amount is still always validated/recalculated on server.

### 3.3 Payment + Provisioning Flow

Payment methods:

- bank transfer (`MARKED_PAID` then admin review)
- internal credits (immediate `APPROVED`)

Bank transfer flow:

1. User configures constructor and clicks final-price CTA.
2. User sends transfer and clicks `Оплачено`.
3. System creates `PaymentRequest` in `MARKED_PAID` and immediately issues local subscription.
4. System attempts Marzban provisioning.
5. Admin later verifies transfer:
   - `APPROVED`: confirmation + Marzban sync
   - `REJECTED`: local revoke + Marzban revoke attempt

Credits flow:

1. User configures constructor and clicks `Оплатить кредитами`.
2. Credits are debited atomically.
3. `PaymentRequest` is created as `APPROVED`.
4. Subscription is issued immediately + Marzban provisioning attempt.

### 3.4 Extension Rules

If active subscription exists, extension is allowed only when current active subscription payment is already `APPROVED`.

Extension behavior:

- New active subscription record is created from constructor purchase.
- Previous active subscription is revoked.
- New subscription keeps original start date and extends expiry by selected months.
- Device count for new active subscription is set from constructor and can be changed both up and down within current admin range (`minDevices..maxDevices`).

Practical effect: user can stack time (extend expiry) while keeping a clear immutable snapshot per purchase.

### 3.5 Dashboard and Setup UX

`/app` layout:

1. `Конструктор подписки`
2. `Dashboard`
3. `Реферальная программа и промокоды`

Dashboard includes:

- account/balance/referral counters
- subscription state + dates + URL copy + setup dialog
- `Устройства` block (prepared UI layer):
  - shows slots list
  - `Удалить` and `Добавить устройство` are safe placeholders for future device-slot backend actions

### 3.6 Referral Program

- User can generate personal referral code only after first `APPROVED` payment.
- First-purchase discount for referred user is applied in constructor checkout.
- Referral reward credits are granted to code owner when referred user gets first approved payment.

### 3.7 Promo Codes and Credits

- Promo code redemption adds credits to user balance.
- Credits can be used directly in constructor checkout (`Оплатить кредитами`).

## 4) Data Model Overview

Core entities:

- `User` (`role`, `credits`)
- `Session` (server session store)
- `InviteCode`, `ReferralCode`, `ReferralCodeUse`
- `PromoCode`, `PromoCodeRedemption`
- `ReferralProgramSettings`
- `SubscriptionDurationRule` (`months`, `discountPercent`, `isActive`)
- `SubscriptionPricingSettings` (`minDevices`, `maxDevices`, `baseDeviceMonthlyPrice`, `extraDeviceMonthlyPrice`)
- `PaymentRequest` (status + method + constructor snapshots)
- `Subscription` (active/revoked/expired + devices + starts/expires + payment snapshots)
- `DeviceSlot`
- `IntegrationSyncLog` (Marzban integration audit trail)

Schema source: `prisma/schema.prisma`.

## 5) Marzban Integration Rules

- Never call Marzban from browser/client. Server-side only.
- Trigger points:
  - issue/update on user payment action (`MARKED_PAID` and credits `APPROVED`)
  - sync on admin `APPROVED`
  - revoke on admin `REJECTED`
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

## 8) DB and Deployment Notes

Production schema changes are applied via Prisma migrations only.

Recommended deploy sequence:

1. Configure production `.env`.
2. Install dependencies and build:
   - `npm ci`
   - `npm run build`
3. Apply DB migrations:
   - `npx prisma migrate deploy`
   - `npx prisma generate`
4. Bootstrap admin:
   - `npm run admin:bootstrap`
5. Start app behind Nginx:
   - `npm run start`

Recommended: run app as systemd service and keep `.env` outside git.

Detailed production-safe runbook:

- `docs/migrate-deploy-runbook.md`

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
- Constructor pricing model
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
| 2026-03-07 | Removed legacy `Tariff` model and old tariff admin actions | Finalize transition to constructor-only pricing and eliminate dual-model maintenance risk |
| 2026-03-07 | Added migration `0008_subscription_constructor_cleanup` and switched production policy to `migrate deploy` | Ensure deterministic schema rollout and avoid `db push` drift in production |
| 2026-03-07 | Replaced fixed tariff UI/logic with server-side subscription constructor (duration + devices + snapshots) | Make pricing flexible, transparent, and admin-configurable without hardcoded plan catalog |
| 2026-03-07 | Added admin-managed constructor rules (`SubscriptionDurationRule`, `SubscriptionPricingSettings`) | Separate pricing policy from purchase execution and simplify operations |
| 2026-03-07 | Unified `/app` and `/admin` price preview calculations through shared helper (`calculateSubscriptionPrice`) | Eliminate formula drift between UI preview and server-side checkout |
| 2026-03-07 | Added automated tests for subscription pricing boundaries/rounding and parity between `/app`, `/admin`, and server calculation | Catch pricing regressions early and guarantee consistent checkout math |
| 2026-03-07 | Localized `/app` server action notices/errors to Russian | Keep dashboard UX language consistent for end users |
| 2026-03-08 | Extension flow now allows decreasing device count within admin-configured range | Align constructor UX with requested business behavior for renewals |
| 2026-03-08 | On extension, revoked previous subscription now clears `marzbanUsername` before provisioning next one | Prevent unique-constraint crash on `Subscription.marzbanUsername` during renewal |
| 2026-03-08 | Updated `/app` constructor UX: duration card layout, device slider defaults to 3, and summary card shows start/end/savings | Improve pricing clarity and keep checkout-focused information in a compact format |
| 2026-03-08 | Unified constructor pricing formula set to `monthlyPrice -> duration discount -> referral discount` using device pricing components | Match latest pricing rule across `/app`, `/admin`, and server checkout |
| 2026-03-08 | Restored constructor pricing where duration discount applies only to VPN component and device component is discounted only by referral | Reverted to previous commercial calculation model |
| 2026-03-08 | Referral discount now applies only to first VPN month (after duration discount), not to all months/devices | Match updated referral discount business rule |
| 2026-03-07 | Added dashboard `Устройства` block as prepared UI placeholder for future slot actions | Keep MVP UX ready for next device lifecycle iteration without risky backend overreach |
| 2026-03-06 | Added multi-step Happ setup dialog in Dashboard subscription block | Replace single connect button with clearer onboarding path across platforms |
| 2026-03-05 | Production admin bootstrap moved to explicit command `npm run admin:bootstrap` | Avoid insecure runtime default credentials |
| 2026-03-05 | Invite code consumption made atomic in registration transaction | Guarantee one-time invite usage under race conditions |
| 2026-03-05 | Admin approve restricted to `MARKED_PAID` only | Enforce payment verification state machine |

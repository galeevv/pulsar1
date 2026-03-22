# Pulsar System Handbook

Last updated: 2026-03-21

## 1) Product Scope (MVP)

Pulsar is a private access service with:

- Landing: `/`
- Login/Register: `/login`
- Rules: `/rules`
- User dashboard: `/app`
- Admin dashboard: `/admin`
- 3x-ui integration: `panel.1pulsar.space` (server-side only)

Registration is closed and works only by `invite` or `referral` code.

Agent onboarding companion:

- `docs/dev-ai-agent-context.md`

## 2) Tech Stack

- Next.js 16 (App Router) + TypeScript
- Prisma + SQLite (`@prisma/adapter-better-sqlite3`)
- shadcn/ui + Tailwind + lucide-react
- Server Actions + Route Handlers + Server Components + Proxy middleware
- Session model in DB + `httpOnly` cookie `pulsar_session`

## 3) Main Business Flows

### 3.1 Auth

- Login checks credentials and creates DB session + signed cookie.
- Password hashing: Argon2id with per-user salt (PHC string in `User.passwordHash`).
- Soft migration is enabled: legacy scrypt hashes are transparently rehashed to Argon2id on successful login.
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
- `appliedReferralDiscount = months === 1 ? referralDiscount : 0`
- `finalTotal = totalAfterDurationDiscount * (1 - appliedReferralDiscount)` (first-purchase referral, only for 1-month purchase)
- final result is rounded to RUB integer

`/app` and `/admin` preview use the same shared helper as server-side checkout (`calculateSubscriptionPrice`), but final amount is still always validated/recalculated on server.

### 3.3 Payment + Provisioning Flow

Payment methods:

- Platega (external payment gateway + webhook confirmation)
- internal credits (immediate `APPROVED`)

Platega flow:

1. User configures constructor and clicks final-price CTA.
2. User selects `Platega`, backend creates `PaymentRequest` in `CREATED` and requests payment link from Platega API.
3. User is redirected to hosted payment page.
4. Platega webhook calls `/api/payments/platega/webhook`.
5. On `CONFIRMED`, backend atomically moves request to `APPROVED`, issues local subscription, then syncs 3x-ui side effects.
6. Repeated webhook notifications are idempotent and do not re-activate the same order.
7. On `CHARGEBACK/FAILED/CANCEL*`, backend moves request to `REJECTED`; if order was already approved, linked subscription is revoked.
8. Required endpoints:
   - `POST /api/payments/platega/create`
   - `POST /api/payments/platega/webhook`
   - `GET /api/payments/platega/status`

Payment state transitions:

- allowed:
  - `CREATED -> APPROVED` (provider `CONFIRMED`)
  - `CREATED -> REJECTED` (provider rejected/failed statuses)
  - `APPROVED -> REJECTED` only for chargeback/failure statuses from provider
- ignored (logged as processed/ignored webhook event):
  - `REJECTED -> APPROVED`
  - repeated terminal notifications (`APPROVED -> APPROVED`, `REJECTED -> REJECTED`)
  - non-terminal/out-of-order provider statuses that do not require transition

Credits flow:

1. User configures constructor and clicks `Оплатить кредитами`.
2. Credits are debited atomically.
3. `PaymentRequest` is created as `APPROVED`.
4. Subscription is issued immediately + 3x-ui provisioning attempt.

Global active-subscription capacity:

- Admin can set `MAX_ACTIVE_SUBSCRIPTIONS` in `/admin` (Operations block).
- `0` means no limit.
- If limit is reached, new purchases for users without active subscription are blocked with notice `Свободных мест сейчас нет`.
- Extension for users with current active subscription remains allowed.

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
- `Устройства` block (strict slot control):
  - each slot has independent x-ui client (`UUID`) and own subscription link
  - user can activate/deactivate individual slots from dashboard
  - active dashboard link points to the first active slot (for quick onboarding)

### 3.6 Referral Program

- User can generate personal referral code only after first `APPROVED` payment.
- First-purchase discount for referred user is applied in constructor checkout.
- Referral reward credits are granted to code owner when referred user gets first approved payment.

### 3.7 Promo Codes and Credits

- Promo code redemption adds credits to user balance.
- Credits can be used directly in constructor checkout (`Оплатить кредитами`).

### 3.8 Referral Payout Workflow

- Withdrawals are a dedicated referral domain, separate from incoming service payments.
- User withdraw flow is inside referral dialog in `/app`.
- Admin queue is `/admin/payouts` (not `/admin/payments`, not support tickets).
- Balance model:
  - `User.credits` = total credits
  - `User.reservedCredits` = credits reserved for active payout requests
  - `availableCredits = max(0, credits - reservedCredits)`
- Payout request lifecycle:
  - `PENDING -> APPROVED -> PAID`
  - `PENDING -> REJECTED`
  - `APPROVED -> REJECTED`
  - `PENDING -> CANCELED` (user cancel)
- Financial transitions:
  - create payout request: reserve only (`reservedCredits += amount`)
  - reject/cancel: unreserve (`reservedCredits -= amount`)
  - paid: finalize (`credits -= amount`, `reservedCredits -= amount`)
- Guards:
  - minimum payout from `ReferralProgramSettings.minimumPayoutCredits`
  - only users with first approved payment are eligible
  - amount must be within available credits
  - at most one active payout request (`PENDING`/`APPROVED`) per user

### 3.9 Support Tickets (Embedded)

Support is embedded into dashboard `/app` via a single `SupportDialog` (not a separate page).
- Dialog states:
  - `list`: current user ticket list
  - `create`: create ticket form
  - `detail`: ticket thread with replies and close action
- User can access only own tickets.
- Opening a ticket marks admin messages as read for user (`user_last_read_at` update).
- Admin has a dedicated support section in `/admin`:
  - ticket list with status/category filters and sorting
  - unread indicator for new user messages
  - ticket detail with status update and reply form
- Opening a ticket in admin marks user messages as read for admin (`admin_last_read_at` update).

## 4) Data Model Overview

Core entities:

- `User` (`role`, `credits`, `reservedCredits`)
- `Session` (server session store)
- `InviteCode`, `ReferralCode`, `ReferralCodeUse`
- `PromoCode`, `PromoCodeRedemption`
- `ReferralProgramSettings`
- `PayoutRequest` (`PENDING|APPROVED|REJECTED|PAID|CANCELED`)
- `ServiceCapacitySettings` (`maxActiveSubscriptions`, singleton)
- `SubscriptionDurationRule` (`months`, `discountPercent`, `isActive`)
- `SubscriptionPricingSettings` (`minDevices`, `maxDevices`, `baseDeviceMonthlyPrice`, `extraDeviceMonthlyPrice`)
- `SupportTicket` + `SupportMessage` (ticket threads + unread timestamps)
- `PaymentRequest` (status + method + constructor snapshots)
- `Subscription` (active/revoked/expired + devices + starts/expires + payment snapshots)
- `DeviceSlot`
- `IntegrationSyncLog` (VPN integration audit trail)

Schema source: `prisma/schema.prisma`.

## 5) 3x-ui Integration Rules

- Never call 3x-ui from browser/client. Server-side only.
- Trigger points:
  - issue/update on Platega webhook `CONFIRMED` and credits `APPROVED`
  - revoke on explicit failed/rejected payment statuses from payment provider
- Strict model: one x-ui client per `DeviceSlot`, each with `limitIp=2`.
  Device limit is enforced by number of active slots, not by one shared client with `limitIp>1`.
- Practical note: in x-ui, `limitIp` is enforced per client entry in each inbound. If backup inbound is enabled, one slot is represented in both inbounds, so effective concurrent IP count may increase if user actively uses both nodes at the same time.
- `fail2ban` is optional server hardening (SSH/Nginx brute-force protection) and is not used to enforce per-device slot limits.
- When backup inbound is enabled, each slot-client is provisioned on primary + backup inbound with shared `subId`.
- Health endpoints: `GET /api/integrations/xui/health` and compatibility alias `GET /api/integrations/marzban/health` (admin only).
- Integration logs are persisted in `IntegrationSyncLog`.

Username policy:

- Preferred: app username if it matches `a-z0-9_`, `3..32`.
- Fallback: generated username with configured prefix.

## 6) Environment Variables

Base:

- `DATABASE_URL` (local default: `file:./prisma/dev.db`)
- `SESSION_SECRET` (required in production)

3x-ui:

- `XUI_BASE_URL`
- `XUI_WEB_BASE_PATH`
- `XUI_PRIMARY_INBOUND_ID` (fallback to `XUI_INBOUND_ID` for backward compatibility)
- `XUI_BACKUP_INBOUND_ID` (optional; if set, provisioning creates backup node in same subscription)
- `XUI_USERNAME`
- `XUI_PASSWORD`
- `XUI_PANEL_BASIC_AUTH_USERNAME`
- `XUI_PANEL_BASIC_AUTH_PASSWORD`
- `XUI_SUBSCRIPTION_BASE_URL`
- `XUI_CLIENT_FLOW`
- `XUI_EMAIL_PREFIX`
- `XUI_TIMEOUT_MS`
- `XUI_VERIFY_TLS`
- `XUI_ENABLE_MOCK_FALLBACK`

Platega:

- `PLATEGA_BASE_URL` (default `https://app.platega.io`)
- `PLATEGA_MERCHANT_ID`
- `PLATEGA_SECRET` (primary secret for API/webhook auth)
- `PLATEGA_API_KEY` (optional backward compatibility alias)
- `PLATEGA_RETURN_URL` (optional; appends `plategaPaymentRequestId`)
- `PLATEGA_FAILED_URL` (optional; appends `plategaPaymentRequestId`)

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
- Do not log x-ui credentials.
- Keep 3x-ui calls server-side only.
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
- 3x-ui integration triggers/config
- Environment variables
- Deployment or operational procedures

When updating, do both:

1. Update the relevant section text.
2. Add a line to Decision Log below.

## 11) Decision Log

| Date       | Decision | Why |
|------------|----------|-----|
| 2026-03-21 | Added referral payout workflow (`reservedCredits`, `PayoutRequest`, `/admin/payouts`, user withdraw in referral dialog) | Separate outgoing withdrawals from incoming payments and make balance transitions atomic/predictable |
| 2026-03-20 | Hardened Platega runtime config (`PLATEGA_SECRET` primary, callback URLs configurable via `PLATEGA_RETURN_URL` / `PLATEGA_FAILED_URL`) and removed legacy payment server actions from `/app` | Align env model with production integration and reduce legacy runtime surface |
| 2026-03-20 | Expanded webhook regression tests for unauthorized/invalid/not-found/out-of-order/partial-failure retry scenarios | Increase confidence in idempotency and terminal-state behavior under real webhook retry patterns |
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
| 2026-03-08 | Migrated server-side VPN integration layer from Marzban adapter to 3x-ui API adapter (`create/update/revoke/sync/sub links`) | Align control plane with deployed x-ui infrastructure and remove panel-browser dependency |
| 2026-03-07 | Added dashboard `Устройства` block as prepared UI placeholder for future slot actions | Keep MVP UX ready for next device lifecycle iteration without risky backend overreach |
| 2026-03-09 | Switched from shared-client `limitIp=N` to strict per-slot provisioning (`1 slot = 1 UUID = limitIp=1`) with dashboard slot activation/deactivation | Enforce real device limits, isolate compromises per device, and support per-device subscription links |
| 2026-03-10 | Increased strict slot profile policy to `1 slot = 1 UUID = limitIp=2` | Reduce false positives for legitimate network switching (Wi-Fi/mobile) while keeping per-slot isolation |
| 2026-03-10 | Added public `/rules` page and admin-managed legal text editor | Keep user agreement centrally managed in control-plane UI without code deploys |
| 2026-03-10 | Referral discount now applies only when selected duration is exactly 1 month, and is calculated from full post-duration total | Match updated commercial rule for referral scope |
| 2026-03-11 | Added admin-configurable `MAX_ACTIVE_SUBSCRIPTIONS` limit with checkout blocking for new users and extension exception for active users | Protect service capacity from overload while preserving renewals for current subscribers |
| 2026-03-12 | Added `PlategaWebhookLog` with dedup key + raw payload/header snapshot and idempotent webhook processing | Provide auditable payment event trail and guarantee one payment activation even on webhook retries |
| 2026-03-12 | Removed manual admin payment review flow from runtime (`MARKED_PAID`/`BANK_TRANSFER` removed from active model) | Finalize migration to two payment methods only: Platega and credits |
| 2026-03-19 | Introduced unified idempotent post-approval handler for payments (credits + Platega webhook) | Remove flow drift, ensure referral reward consistency, and centralize post-payment side effects |
| 2026-03-19 | Added revoke-on-chargeback/reject for already approved Platega payments | Keep subscription state aligned with provider final status and reduce abuse window |
| 2026-03-19 | Migrated password hashing to Argon2id with per-user salt and soft legacy rehash on login | Eliminate static-salt risk without forcing hard password reset |
| 2026-03-19 | Added `_prisma_migrations` baseline utility and updated deploy runbook | Recover migration history safely for legacy `db push` databases |
| 2026-03-09 | Added `docs/dev-ai-agent-context.md` with practical architecture/device-control/API onboarding for AI agents | Reduce onboarding time and prevent regressions in VPN/device-limit logic during autonomous development |
| 2026-03-06 | Added multi-step Happ setup dialog in Dashboard subscription block | Replace single connect button with clearer onboarding path across platforms |
| 2026-03-05 | Production admin bootstrap moved to explicit command `npm run admin:bootstrap` | Avoid insecure runtime default credentials |
| 2026-03-05 | Invite code consumption made atomic in registration transaction | Guarantee one-time invite usage under race conditions |
| 2026-03-05 | Admin approve restricted to `MARKED_PAID` only | Enforce payment verification state machine |

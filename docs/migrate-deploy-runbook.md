# Migrate Deploy Runbook (Production)

Last updated: 2026-03-07

## Goal

Deploy schema changes through Prisma migrations only (`migrate deploy`), without `db push`.

This release introduces migrations:

- `0008_subscription_constructor_cleanup`
- `0009_duration_price_and_pricing_settings_cleanup`

They do:

- removes legacy `Tariff` table
- removes `PaymentRequest.tariffId`
- creates constructor tables:
  - `SubscriptionDurationRule`
  - `SubscriptionPricingSettings`
- rebuilds `PaymentRequest` and `Subscription` with constructor snapshots
- preserves existing user/payment/subscription data with safe backfill defaults
- adds `SubscriptionDurationRule.monthlyPrice`
- removes `SubscriptionPricingSettings.currency`

## Before You Start

- Stop background jobs that can write to DB during migration.
- Ensure app is on maintenance/restart window.
- Make a DB backup first.

## 1) Backup (SQLite)

```bash
cd /opt/pulsar/current
cp prisma/dev.db prisma/dev.db.backup-$(date +%F-%H%M%S)
```

Optional checksum:

```bash
sha256sum prisma/dev.db prisma/dev.db.backup-*
```

## 2) Check Migration History Mode

```bash
npx prisma migrate status
```

### Case A: DB already has `_prisma_migrations`

Continue to step 3.

### Case B: DB was managed with `db push` and has no migration history

Run one-time baseline marking for old migrations, then continue to step 3:

```bash
npx prisma migrate resolve --applied 0001_init
npx prisma migrate resolve --applied 0002_code_management
npx prisma migrate resolve --applied 0003_referral_program_settings
npx prisma migrate resolve --applied 0004_tariff
npx prisma migrate resolve --applied 0005_payment_request
npx prisma migrate resolve --applied 0006_subscription_device_slots
npx prisma migrate resolve --applied 0007_marzban_integration_fields
```

Important:

- Do not mark `0008_subscription_constructor_cleanup` as applied manually.
- Do not mark `0009_duration_price_and_pricing_settings_cleanup` as applied manually.
- Both `0008` and `0009` must be executed by `migrate deploy`.

## 3) Apply Migration

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected result: migrations `0008` and `0009` are applied.

## 4) Build and Restart

```bash
npm ci
npm run build
sudo systemctl restart pulsar
sudo systemctl status pulsar --no-pager
```

## 5) Post-Deploy Checks

- `/login` works
- `/app` constructor section works (duration/devices/price)
- `/admin` тарифные правила section works (durations/settings)
- create payment request flow:
  - `Оплачено` -> `MARKED_PAID`
  - admin `APPROVED/REJECTED` path works

Quick DB sanity checks (optional):

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name='Tariff';
SELECT COUNT(*) FROM SubscriptionDurationRule;
SELECT * FROM SubscriptionPricingSettings WHERE id=1;
```

Expected:

- `Tariff` table is absent.
- `SubscriptionDurationRule` contains 1/3/6/12 rows.
- `SubscriptionPricingSettings` has row `id=1`.

## Rollback

If app health checks fail right after migration:

1. Stop app.
2. Restore DB backup.
3. Roll back app version.
4. Start app.

Example:

```bash
sudo systemctl stop pulsar
cp prisma/dev.db.backup-YYYY-MM-DD-HHMMSS prisma/dev.db
# deploy previous app release here
sudo systemctl start pulsar
```

## Policy

- Production schema changes: `migrate deploy` only.
- `db push` is allowed only in local development.

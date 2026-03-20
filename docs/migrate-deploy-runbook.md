# Migrate Deploy Runbook (Production)

Last updated: 2026-03-19

## Goal

Безопасно выкатывать схему только через Prisma migrations (`migrate deploy`) и не использовать `db push` в проде.

## Pre-check

1. Остановите запись в БД (maintenance/restart window).
2. Сделайте backup SQLite.
3. Проверьте статус миграций.
4. Проверьте платежные env:
   - `PLATEGA_MERCHANT_ID`
   - `PLATEGA_SECRET` (или `PLATEGA_API_KEY` для обратной совместимости)
   - при необходимости `PLATEGA_RETURN_URL` и `PLATEGA_FAILED_URL`

```bash
cd /opt/pulsar/current
cp prisma/dev.db prisma/dev.db.backup-$(date +%F-%H%M%S)
npx prisma migrate status
```

## Case A: `_prisma_migrations` уже есть

Если `migrate status` показывает валидную историю миграций, переходите к deploy.

## Case B: база создана через `db push` и `_prisma_migrations` отсутствует

Выполните baseline (один раз на эту базу):

```bash
npm run db:migrate:baseline
npx prisma migrate status
```

Что делает baseline:

- создает таблицу `_prisma_migrations` (если ее нет),
- регистрирует все миграции из `prisma/migrations` как уже примененные,
- проверяет checksum существующих записей,
- не меняет бизнес-данные.

Скрипт: `scripts/prisma-baseline-migrations.mjs`.

## Deploy

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
sudo systemctl restart pulsar
sudo systemctl status pulsar --no-pager
```

## Post-deploy checks

1. `npx prisma migrate status` -> `Database schema is up to date`.
2. `/login` работает.
3. `/app`:
   - Platega checkout создается,
   - credits checkout проходит,
   - тексты ошибок/уведомлений читаемы (без mojibake).
4. `/admin`:
   - блоки codes/tariffs/operations/rules работают,
   - сообщения в server actions читаемы.
5. Webhook Platega:
   - `CONFIRMED` -> `PaymentRequest.APPROVED` + активация подписки,
   - `CHARGEBACK/FAILED/CANCELED` после `APPROVED` -> `PaymentRequest.REJECTED` + revoke подписки.

## Rollback

Если после релиза есть деградация:

1. Остановите приложение.
2. Восстановите backup DB.
3. Верните предыдущий релиз приложения.
4. Запустите сервис.

```bash
sudo systemctl stop pulsar
cp prisma/dev.db.backup-YYYY-MM-DD-HHMMSS prisma/dev.db
# deploy previous app release here
sudo systemctl start pulsar
```

## Policy

- Прод: только `migrate deploy`.
- `db push` допускается только локально.
- При появлении drift сначала baseline, затем обычный deploy-пайплайн.

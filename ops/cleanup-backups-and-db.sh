#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/1pulsar/app}"
ENV_FILE="${ENV_FILE:-/etc/pulsar/1pulsar.env}"
DB_PATH="${DB_PATH:-${APP_DIR}/prisma/prod.db}"
BACKUP_DIRS="${BACKUP_DIRS:-/var/backups/pulsar,/var/backups/pulsar-db}"
PULSAR_SERVICE="${PULSAR_SERVICE:-pulsar}"
APP_OWNER="${APP_OWNER:-www-data:www-data}"

PURGE_BACKUPS=true
PURGE_DB=true
RECREATE_DB=true
ASSUME_YES=false
SERVICE_WAS_ACTIVE=false
SERVICE_STOPPED=false

usage() {
  cat <<'USAGE'
Usage:
  cleanup-backups-and-db.sh --yes [--backups-only|--db-only] [--no-recreate-db]

What it does:
  - Deletes files from backup directories (default: /var/backups/pulsar,/var/backups/pulsar-db)
  - Deletes SQLite DB file (default: /var/www/1pulsar/app/prisma/prod.db)
  - Recreates DB schema via `npx prisma migrate deploy` (enabled by default)
  - Stops/starts pulsar service safely when available

Flags:
  --yes             Required. Confirms destructive action.
  --backups-only    Delete only backup files.
  --db-only         Delete only DB file (+recreate unless --no-recreate-db set).
  --no-recreate-db  Do not recreate schema after DB deletion.
  --help            Show this help.

Env overrides:
  APP_DIR, ENV_FILE, DB_PATH, BACKUP_DIRS, PULSAR_SERVICE
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      ASSUME_YES=true
      ;;
    --backups-only)
      PURGE_DB=false
      ;;
    --db-only)
      PURGE_BACKUPS=false
      ;;
    --no-recreate-db)
      RECREATE_DB=false
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ "${ASSUME_YES}" != "true" ]]; then
  echo "Refusing to run without --yes." >&2
  usage
  exit 1
fi

if [[ "${PURGE_BACKUPS}" != "true" && "${PURGE_DB}" != "true" ]]; then
  echo "Nothing selected: choose default, --backups-only, or --db-only." >&2
  exit 1
fi

start_service_if_needed() {
  if [[ "${SERVICE_WAS_ACTIVE}" == "true" && "${SERVICE_STOPPED}" == "true" ]]; then
    systemctl start "${PULSAR_SERVICE}" >/dev/null 2>&1 || true
  fi
}

fix_db_permissions() {
  local db_dir
  db_dir="$(dirname "${DB_PATH}")"

  if [[ -d "${db_dir}" ]]; then
    chown "${APP_OWNER}" "${db_dir}" >/dev/null 2>&1 || true
  fi

  if [[ -f "${DB_PATH}" ]]; then
    chown "${APP_OWNER}" "${DB_PATH}" >/dev/null 2>&1 || true
    chmod 664 "${DB_PATH}" >/dev/null 2>&1 || true
  fi
}

if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-unit-files "${PULSAR_SERVICE}.service" >/dev/null 2>&1; then
    if systemctl is-active --quiet "${PULSAR_SERVICE}"; then
      systemctl stop "${PULSAR_SERVICE}"
      SERVICE_WAS_ACTIVE=true
      SERVICE_STOPPED=true
      trap start_service_if_needed EXIT
    fi
  fi
fi

if [[ "${PURGE_BACKUPS}" == "true" ]]; then
  IFS=',' read -r -a backup_dirs <<< "${BACKUP_DIRS}"
  for dir in "${backup_dirs[@]}"; do
    if [[ ! -d "${dir}" ]]; then
      echo "Skip missing backup directory: ${dir}"
      continue
    fi

    mapfile -t files < <(find "${dir}" -mindepth 1 -maxdepth 1 -type f 2>/dev/null || true)
    if [[ "${#files[@]}" -eq 0 ]]; then
      echo "No backup files in: ${dir}"
      continue
    fi

    echo "Deleting backup files in: ${dir}"
    printf ' - %s\n' "${files[@]}"
    rm -f -- "${files[@]}"
  done
fi

if [[ "${PURGE_DB}" == "true" ]]; then
  echo "Deleting DB file: ${DB_PATH}"
  rm -f "${DB_PATH}" "${DB_PATH}-wal" "${DB_PATH}-shm"

  if [[ "${RECREATE_DB}" == "true" ]]; then
    if [[ ! -d "${APP_DIR}" ]]; then
      echo "APP_DIR not found: ${APP_DIR}" >&2
      exit 1
    fi

    cd "${APP_DIR}"

    if [[ -f "${ENV_FILE}" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "${ENV_FILE}"
      set +a
    fi

    npx prisma migrate deploy
    npx prisma generate
  fi

  fix_db_permissions
fi

trap - EXIT
start_service_if_needed

echo "Cleanup completed."

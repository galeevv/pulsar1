#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DB_PATH=/opt/pulsar/app/prisma/prod.db BACKUP_DIR=/opt/pulsar/backups /opt/pulsar/app/ops/backup-sqlite.sh

DB_PATH="${DB_PATH:-/opt/pulsar/app/prisma/prod.db}"
BACKUP_DIR="${BACKUP_DIR:-/opt/pulsar/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${DB_PATH}" ]]; then
  echo "Database file not found: ${DB_PATH}" >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 is required. Install it: sudo apt-get install -y sqlite3" >&2
  exit 1
fi

TMP_DB="${BACKUP_DIR}/pulsar_${TIMESTAMP}.db"
ARCHIVE="${BACKUP_DIR}/pulsar_${TIMESTAMP}.tar.gz"

# Consistent hot backup.
sqlite3 "${DB_PATH}" ".timeout 5000" ".backup '${TMP_DB}'"

tar -czf "${ARCHIVE}" -C "${BACKUP_DIR}" "$(basename "${TMP_DB}")"
rm -f "${TMP_DB}"

# Cleanup old backups.
find "${BACKUP_DIR}" -type f -name "pulsar_*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created: ${ARCHIVE}"

#!/usr/bin/env bash
# ─── D-Trips — PostgreSQL restore (§22) ───────────────────────────
#
# Restores the database from a compressed backup created by backup.sh.
#
# Usage:
#   ./restore.sh /opt/d-trips/backups/dtrips_20260903_020000.sql.gz
#
# WARNING: This drops and recreates the target database.
# Make a fresh backup before restoring in production.
# ────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration (override via environment) ─────────────────────
POSTGRES_USER="${POSTGRES_USER:-dtrips}"
POSTGRES_DB="${POSTGRES_DB:-dtrips}"
DB_CONTAINER="${DB_CONTAINER:-d-trips-db-1}"

# ─── Args ─────────────────────────────────────────────────────────
BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  echo "" >&2
  echo "Available backups:" >&2
  ls -lh /opt/d-trips/backups/${POSTGRES_DB}_*.sql.gz 2>/dev/null || echo "  (none)" >&2
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: File not found: ${BACKUP_FILE}" >&2
  exit 1
fi

FILESIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
echo "[$(date -Iseconds)] Restoring from: ${BACKUP_FILE} (${FILESIZE})"
echo "[$(date -Iseconds)] WARNING: This will drop and recreate database '${POSTGRES_DB}'"

read -rp "Type 'RESTORE' to confirm: " CONFIRM
if [ "${CONFIRM}" != "RESTORE" ]; then
  echo "Aborted."
  exit 1
fi

# ─── Stop backend to prevent writes during restore ────────────────
echo "[$(date -Iseconds)] Stopping backend container..."
docker compose stop backend 2>/dev/null || true

# ─── Drop + recreate database ─────────────────────────────────────
echo "[$(date -Iseconds)] Dropping database..."
docker exec "${DB_CONTAINER}" \
  psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker exec "${DB_CONTAINER}" \
  psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"

# ─── Restore ──────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Restoring data..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${DB_CONTAINER}" \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --single-transaction --quiet

# ─── Restart backend ──────────────────────────────────────────────
echo "[$(date -Iseconds)] Starting backend container..."
docker compose start backend 2>/dev/null || true

echo "[$(date -Iseconds)] Restore complete. Verify with: docker compose logs backend --tail=50"

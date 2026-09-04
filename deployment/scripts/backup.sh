#!/usr/bin/env bash
# ─── D-Trips — PostgreSQL backup (§22) ─────────────────────────────
#
# Creates a compressed pg_dump of the production database.
# Designed to run via cron on the VPS:
#   0 2 * * * /opt/d-trips/deployment/scripts/backup.sh >> /var/log/dtrips-backup.log 2>&1
#
# Retention: keeps the last BACKUP_RETAIN_DAYS days of backups.
# ────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration (override via environment) ─────────────────────
BACKUP_DIR="${BACKUP_DIR:-/opt/d-trips/backups}"
BACKUP_RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"
POSTGRES_USER="${POSTGRES_USER:-dtrips}"
POSTGRES_DB="${POSTGRES_DB:-dtrips}"
DB_CONTAINER="${DB_CONTAINER:-d-trips-db-1}"

# ─── Derived ──────────────────────────────────────────────────────
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
HOSTNAME="$(hostname -s)"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] Starting backup: ${POSTGRES_DB} → ${BACKUP_FILE}"

# ─── Dump + compress ──────────────────────────────────────────────
docker exec "${DB_CONTAINER}" \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-acl \
  | gzip > "${BACKUP_FILE}"

FILESIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
echo "[$(date -Iseconds)] Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# ─── Prune old backups ───────────────────────────────────────────
DELETED=$(find "${BACKUP_DIR}" -name "${POSTGRES_DB}_*.sql.gz" -mtime +"${BACKUP_RETAIN_DAYS}" -delete -print | wc -l)
echo "[$(date -Iseconds)] Pruned ${DELETED} backups older than ${BACKUP_RETAIN_DAYS} days"

# ─── Verify at least one backup exists ───────────────────────────
LATEST=$(ls -t "${BACKUP_DIR}"/${POSTGRES_DB}_*.sql.gz 2>/dev/null | head -1)
if [ -z "${LATEST}" ]; then
  echo "[$(date -Iseconds)] ERROR: No backups found after pruning!" >&2
  exit 1
fi

echo "[$(date -Iseconds)] Latest backup: $(basename "${LATEST}")"
echo "[$(date -Iseconds)] Backup job finished."

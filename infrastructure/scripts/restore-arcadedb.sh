#!/usr/bin/env bash
# ==============================================================================
# ArcadeDB Enterprise Automated Restore Script
# ==============================================================================
set -euo pipefail

HOST="${ARCADEDB_HOST:-http://localhost:2480}"
USER="${ARCADEDB_USER:-root}"
PASS="${ARCADEDB_PASSWORD:-arcadepassword}"
DB="${ARCADEDB_DATABASE:-EnterpriseTopology_Restored}"
BACKUP_ARCHIVE="${1:-}"

if [ -z "${BACKUP_ARCHIVE}" ]; then
  echo "Usage: $0 <path-to-backup-zip>"
  exit 1
fi

if [ ! -f "${BACKUP_ARCHIVE}" ]; then
  echo "[ERROR] Backup archive '${BACKUP_ARCHIVE}' does not exist."
  exit 1
fi

echo "[INFO] Restoring database '${DB}' from archive '${BACKUP_ARCHIVE}'..."
echo "[INFO] Target Host: ${HOST}"

# Create/Import database via Server Command
RESPONSE=$(curl -s -w "\n%{http_code}" -u "${USER}:${PASS}" \
  -X POST "${HOST}/api/v1/server" \
  -H "Content-Type: application/json" \
  -d "{\"command\": \"RESTORE DATABASE ${DB} FROM file://${BACKUP_ARCHIVE}\"}")

HTTP_STATUS=$(echo "${RESPONSE}" | tail -n1)
BODY=$(echo "${RESPONSE}" | sed '$d')

if [ "${HTTP_STATUS}" -eq 200 ]; then
  echo "[SUCCESS] Database '${DB}' restored successfully from '${BACKUP_ARCHIVE}'!"
  echo "[INFO] Server response: ${BODY}"
else
  echo "[ERROR] Restore failed with HTTP status ${HTTP_STATUS}"
  echo "[ERROR] Response: ${BODY}"
  exit 1
fi

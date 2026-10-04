#!/usr/bin/env bash
# ==============================================================================
# ArcadeDB Enterprise Automated Hot Backup Script
# ==============================================================================
set -euo pipefail

HOST="${ARCADEDB_HOST:-http://localhost:2480}"
USER="${ARCADEDB_USER:-root}"
PASS="${ARCADEDB_PASSWORD:-arcadepassword}"
DB="${ARCADEDB_DATABASE:-EnterpriseTopology}"
BACKUP_DIR="${1:-./data/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB}_backup_${TIMESTAMP}.zip"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Initiating ArcadeDB online hot backup for database '${DB}'..."
echo "[INFO] Connecting to ${HOST}..."

RESPONSE=$(curl -s -w "\n%{http_code}" -u "${USER}:${PASS}" \
  -X POST "${HOST}/api/v1/command/${DB}" \
  -H "Content-Type: application/json" \
  -d "{\"language\": \"sql\", \"command\": \"BACKUP DATABASE file://${BACKUP_FILE}\"}")

HTTP_STATUS=$(echo "${RESPONSE}" | tail -n1)
BODY=$(echo "${RESPONSE}" | sed '$d')

if [ "${HTTP_STATUS}" -eq 200 ]; then
  echo "[SUCCESS] Hot backup completed successfully!"
  echo "[INFO] Output: ${BODY}"
  echo "[INFO] Backup Archive: ${BACKUP_FILE}"
else
  echo "[ERROR] Backup failed with HTTP status ${HTTP_STATUS}"
  echo "[ERROR] Response: ${BODY}"
  exit 1
fi

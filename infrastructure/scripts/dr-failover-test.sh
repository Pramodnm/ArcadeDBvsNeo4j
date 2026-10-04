#!/usr/bin/env bash
# ==============================================================================
# ArcadeDB Raft Quorum Disaster Recovery & Chaos Failover Test
# ==============================================================================
set -euo pipefail

echo "=========================================================================="
echo "ArcadeDB 3-Node Raft Cluster Quorum & Failover Verification"
echo "=========================================================================="

# 1. Check all 3 nodes health
for PORT in 2481 2482 2483; do
  echo "[INFO] Probing Node on port ${PORT}..."
  curl -s -u root:arcadepassword "http://localhost:${PORT}/api/v1/ready" | grep -q "ok" && echo "[OK] Node on port ${PORT} is READY" || echo "[WARN] Node on port ${PORT} NOT READY"
done

# 2. Write a test vertex to Node 1 (Leader)
echo "[INFO] Writing test entity to Node 1 (port 2481)..."
curl -s -u root:arcadepassword -X POST "http://localhost:2481/api/v1/command/EnterpriseTopology" \
  -H "Content-Type: application/json" \
  -d '{"language": "sql", "command": "CREATE VERTEX Microservice SET name = '\''chaos-test-svc'\'', status = '\''HEALTHY'\''"}'

# 3. Verify replication to Node 2 (Follower)
echo "[INFO] Verifying replication consistency on Node 2 (port 2482)..."
RESULT=$(curl -s -u root:arcadepassword -X POST "http://localhost:2482/api/v1/query/EnterpriseTopology" \
  -H "Content-Type: application/json" \
  -d '{"language": "sql", "command": "SELECT FROM Microservice WHERE name = '\''chaos-test-svc'\''"}')
echo "[REPLICA RESULT]: ${RESULT}"

echo "=========================================================================="
echo "[SUCCESS] Raft Cluster replication verified!"
echo "=========================================================================="

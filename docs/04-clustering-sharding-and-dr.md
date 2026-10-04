# Enterprise Architecture: Clustering, Sharding, High Availability & Disaster Recovery

## 1. High Availability Architecture: Raft Consensus

ArcadeDB implements the industry-standard **Raft consensus algorithm** to achieve distributed high availability and fault tolerance:
- **Leader-Follower Quorum**: In an $N$-node cluster (typically 3 or 5 nodes), one node is elected as the **Leader**. Writes are sent to the Leader, replicated across the cluster, and committed once a quorum ($\lfloor N/2 \rfloor + 1$) acknowledges the log entry.
- **Automatic Failover**: If the Leader fails or is partitioned, Follower nodes detect heartbeat timeouts within `electionTimeoutMs` (default 2000ms) and elect a new Leader with zero data loss.
- **Split-Brain Prevention**: Raft mathematically guarantees that at most one Leader can hold quorum authority in any term.

```
                  +---------------------------+
                  |  Kubernetes Service / LB  |
                  +-------------+-------------+
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
+---------------+       +---------------+       +---------------+
| ArcadeDB Pod0 |<----->| ArcadeDB Pod1 |<----->| ArcadeDB Pod2 |
|   (LEADER)    |  Raft |  (FOLLOWER)   |  Raft |  (FOLLOWER)   |
| PVC: 50Gi SSD |  Sync | PVC: 50Gi SSD |  Sync | PVC: 50Gi SSD |
+---------------+       +---------------+       +---------------+
```

---

## 2. Sharding & Physical Data Placement (Buckets)

In ArcadeDB:
- Every Schema Type (e.g. `Microservice`, `IncidentRecord`) is mapped to one or more physical **Buckets**.
- A Bucket represents a set of physical files on disk (`<type>_<bucketId>.65.vcs`).
- **Horizontal Bucket Distribution**: Buckets can be assigned to specific nodes or storage tiers, allowing high-throughput parallel writes and distributed partitioning without complex coordinator layers.

---

## 3. Disaster Recovery (DR) & Backup Strategies

### A. Online Hot Backup
ArcadeDB supports live, non-blocking online backups while transactions are actively executing:
- **Command**: `BACKUP DATABASE file:///backups/EnterpriseTopology_snapshot.zip`
- **Mechanism**: The engine takes a consistent point-in-time snapshot of the database page files and writes a compressed archive (`.zip`). Read/write traffic continues unaffected.

### B. Point-in-Time Recovery (PITR) & Write-Ahead Logs (WAL)
- All transactions are recorded in append-only Write-Ahead Logs (`.wal`).
- By archiving WAL files alongside periodic full backups, teams can replay transactions up to a specific timestamp or transaction ID.

### C. Enterprise RTO and RPO Targets

| Disaster Scenario | Recovery Strategy | Target RPO (Data Loss) | Target RTO (Downtime) |
| :--- | :--- | :--- | :--- |
| **Single Pod / Node Crash** | Automatic Kubernetes pod restart + Raft auto-sync | **0 seconds** (Quorum preserved) | **< 3 seconds** (Instantaneous leader election) |
| **Availability Zone (AZ) Outage** | Multi-AZ StatefulSet deployment across 3 AZs | **0 seconds** | **< 5 seconds** |
| **Catastrophic Region Outage** | Cross-region S3 backup restore to secondary K8s cluster | **< 1 hour** (Backup frequency) | **< 15 minutes** (Automated Helm deploy + restore) |
| **Accidental Data Corruption** | Restore from Point-in-Time snapshot before incident | **< 15 minutes** | **< 10 minutes** |

---

## 4. Disaster Recovery Runbook & Failover Procedures

### Procedure 1: Emergency Manual Failover
If the primary leader node experiences network degradation:
1. Connect to any healthy Follower node via HTTP or CLI.
2. Verify cluster status:
   ```bash
   curl -u root:password http://arcadedb-node2:2480/api/v1/server?mode=cluster
   ```
3. Issue leader change command if necessary.

### Procedure 2: Complete Region Restoration
1. Provision new Kubernetes cluster or namespace in target DR region.
2. Apply PersistentVolumeClaims and Secrets.
3. Deploy Helm Chart with restore parameter pointing to S3 backup:
   ```bash
   helm install arcadedb-dr ./infrastructure/helm/arcadedb-cluster \
     --set backup.s3.enabled=true \
     --set backup.restoreFrom="s3://enterprise-arcadedb-backups/EnterpriseTopology_latest.zip"
   ```
4. Verify data integrity and reroute ingress traffic.

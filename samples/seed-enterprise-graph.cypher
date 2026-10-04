// ==============================================================================
// ArcadeDB & Neo4j Enterprise IT Topology & Incident Graph Schema and Seed Data (Cypher)
// Compatible with both ArcadeDB (via Bolt/HTTP) and Neo4j
// ==============================================================================

// 1. Create Hosts
CREATE (h1:HostNode {id: 'host-k8s-worker-01', hostname: 'k8s-node-01.prod.internal', zone: 'us-east-1a', region: 'us-east-1', cpuCores: 64})
CREATE (h2:HostNode {id: 'host-k8s-worker-02', hostname: 'k8s-node-02.prod.internal', zone: 'us-east-1b', region: 'us-east-1', cpuCores: 64})
CREATE (h3:HostNode {id: 'host-db-01', hostname: 'db-primary.prod.internal', zone: 'us-east-1a', region: 'us-east-1', cpuCores: 32})

// 2. Create Databases
CREATE (db1:DatabaseCluster {id: 'db-postgres-orders', name: 'Orders-PG-Cluster', engine: 'PostgreSQL-16', isLeader: true})
CREATE (db2:DatabaseCluster {id: 'db-redis-session', name: 'Auth-Redis-Cache', engine: 'Redis-7.2', isLeader: true})

// 3. Create Microservices
CREATE (s_gw:Microservice {id: 'svc-api-gateway', name: 'ApiGateway', tier: 'Edge', language: 'Go', status: 'HEALTHY'})
CREATE (s_auth:Microservice {id: 'svc-auth', name: 'AuthService', tier: 'Core', language: 'C# .NET 10', status: 'HEALTHY'})
CREATE (s_order:Microservice {id: 'svc-order', name: 'OrderService', tier: 'Core', language: 'C# .NET 10', status: 'DEGRADED'})
CREATE (s_pay:Microservice {id: 'svc-payment', name: 'PaymentGateway', tier: 'Core', language: 'TypeScript', status: 'HEALTHY'})
CREATE (s_inv:Microservice {id: 'svc-inventory', name: 'InventoryService', tier: 'Internal', language: 'C# .NET 10', status: 'HEALTHY'})
CREATE (s_notif:Microservice {id: 'svc-notification', name: 'NotificationWorker', tier: 'Background', language: 'TypeScript', status: 'HEALTHY'})

// 4. Create Incident & Runbook
CREATE (inc:IncidentRecord {id: 'inc-2026-1001', title: 'Payment Webhook Timeout Cascading Failure', severity: 'P1-CRITICAL', summary: 'High latency on payment provider caused thread pool starvation in OrderService.', rootCause: 'Downstream gateway timeout misconfiguration and connection pool exhaustion.', createdAt: '2026-10-01 14:30:00'})
CREATE (rb1:RunbookDoc {id: 'rb-001', title: 'OrderService Connection Pool Tuning and Circuit Breaker Reset', content: 'When OrderService encounters connection timeouts to PaymentGateway, reset the Polly circuit breaker and double connection pool max size to 250.', tags: 'orders, payments, circuit-breaker, polly'})
CREATE (rb2:RunbookDoc {id: 'rb-002', title: 'Redis Cache Eviction Storm Recovery', content: 'If AuthService reports 500 errors during peak token issuance, scale Redis replicas and flush stale session keys.', tags: 'auth, redis, sessions, scale'})

// 5. Create Relationships
CREATE (s_gw)-[:DEPENDS_ON]->(s_auth)
CREATE (s_gw)-[:DEPENDS_ON]->(s_order)
CREATE (s_order)-[:DEPENDS_ON]->(s_pay)
CREATE (s_order)-[:DEPENDS_ON]->(s_inv)
CREATE (s_order)-[:DEPENDS_ON]->(s_notif)

CREATE (s_order)-[:CONNECTS_TO]->(db1)
CREATE (s_auth)-[:CONNECTS_TO]->(db2)

CREATE (s_gw)-[:RUNS_ON]->(h1)
CREATE (s_order)-[:RUNS_ON]->(h1)
CREATE (s_auth)-[:RUNS_ON]->(h2)
CREATE (s_pay)-[:RUNS_ON]->(h2)
CREATE (db1)-[:RUNS_ON]->(h3)

CREATE (inc)-[:AFFECTS]->(s_order)
CREATE (inc)-[:TRIGGERED_BY]->(s_pay);

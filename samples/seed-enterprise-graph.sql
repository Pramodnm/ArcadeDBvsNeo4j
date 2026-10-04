-- ==============================================================================
-- ArcadeDB Enterprise IT Topology & Incident Graph Schema and Seed Data (SQL)
-- ==============================================================================

-- 1. Create Vertex Types
CREATE VERTEX TYPE Microservice IF NOT EXISTS;
CREATE PROPERTY Microservice.id STRING;
CREATE PROPERTY Microservice.name STRING;
CREATE PROPERTY Microservice.tier STRING;
CREATE PROPERTY Microservice.language STRING;
CREATE PROPERTY Microservice.status STRING;
CREATE INDEX IF NOT EXISTS ON Microservice (id) UNIQUE;
CREATE INDEX IF NOT EXISTS ON Microservice (name) NOTUNIQUE;

CREATE VERTEX TYPE HostNode IF NOT EXISTS;
CREATE PROPERTY HostNode.id STRING;
CREATE PROPERTY HostNode.hostname STRING;
CREATE PROPERTY HostNode.zone STRING;
CREATE PROPERTY HostNode.region STRING;
CREATE PROPERTY HostNode.cpuCores INTEGER;
CREATE INDEX IF NOT EXISTS ON HostNode (id) UNIQUE;

CREATE VERTEX TYPE DatabaseCluster IF NOT EXISTS;
CREATE PROPERTY DatabaseCluster.id STRING;
CREATE PROPERTY DatabaseCluster.name STRING;
CREATE PROPERTY DatabaseCluster.engine STRING;
CREATE PROPERTY DatabaseCluster.isLeader BOOLEAN;
CREATE INDEX IF NOT EXISTS ON DatabaseCluster (id) UNIQUE;

CREATE VERTEX TYPE IncidentRecord IF NOT EXISTS;
CREATE PROPERTY IncidentRecord.id STRING;
CREATE PROPERTY IncidentRecord.title STRING;
CREATE PROPERTY IncidentRecord.severity STRING;
CREATE PROPERTY IncidentRecord.summary STRING;
CREATE PROPERTY IncidentRecord.rootCause STRING;
CREATE PROPERTY IncidentRecord.createdAt DATETIME;
CREATE INDEX IF NOT EXISTS ON IncidentRecord (id) UNIQUE;

CREATE VERTEX TYPE RunbookDoc IF NOT EXISTS;
CREATE PROPERTY RunbookDoc.id STRING;
CREATE PROPERTY RunbookDoc.title STRING;
CREATE PROPERTY RunbookDoc.content STRING;
CREATE PROPERTY RunbookDoc.tags STRING;
CREATE PROPERTY RunbookDoc.embedding LIST OF FLOAT;
CREATE INDEX IF NOT EXISTS ON RunbookDoc (id) UNIQUE;

-- 2. Create Edge Types
CREATE EDGE TYPE DEPENDS_ON IF NOT EXISTS;
CREATE EDGE TYPE RUNS_ON IF NOT EXISTS;
CREATE EDGE TYPE CONNECTS_TO IF NOT EXISTS;
CREATE EDGE TYPE AFFECTS IF NOT EXISTS;
CREATE EDGE TYPE TRIGGERED_BY IF NOT EXISTS;

-- 3. Populate Vertices
-- Hosts
CREATE VERTEX HostNode SET id = 'host-k8s-worker-01', hostname = 'k8s-node-01.prod.internal', zone = 'us-east-1a', region = 'us-east-1', cpuCores = 64;
CREATE VERTEX HostNode SET id = 'host-k8s-worker-02', hostname = 'k8s-node-02.prod.internal', zone = 'us-east-1b', region = 'us-east-1', cpuCores = 64;
CREATE VERTEX HostNode SET id = 'host-db-01', hostname = 'db-primary.prod.internal', zone = 'us-east-1a', region = 'us-east-1', cpuCores = 32;

-- Databases
CREATE VERTEX DatabaseCluster SET id = 'db-postgres-orders', name = 'Orders-PG-Cluster', engine = 'PostgreSQL-16', isLeader = true;
CREATE VERTEX DatabaseCluster SET id = 'db-redis-session', name = 'Auth-Redis-Cache', engine = 'Redis-7.2', isLeader = true;

-- Microservices
CREATE VERTEX Microservice SET id = 'svc-api-gateway', name = 'ApiGateway', tier = 'Edge', language = 'Go', status = 'HEALTHY';
CREATE VERTEX Microservice SET id = 'svc-auth', name = 'AuthService', tier = 'Core', language = 'C# .NET 10', status = 'HEALTHY';
CREATE VERTEX Microservice SET id = 'svc-order', name = 'OrderService', tier = 'Core', language = 'C# .NET 10', status = 'DEGRADED';
CREATE VERTEX Microservice SET id = 'svc-payment', name = 'PaymentGateway', tier = 'Core', language = 'TypeScript', status = 'HEALTHY';
CREATE VERTEX Microservice SET id = 'svc-inventory', name = 'InventoryService', tier = 'Internal', language = 'C# .NET 10', status = 'HEALTHY';
CREATE VERTEX Microservice SET id = 'svc-notification', name = 'NotificationWorker', tier = 'Background', language = 'TypeScript', status = 'HEALTHY';

-- Incidents
CREATE VERTEX IncidentRecord SET id = 'inc-2026-1001', title = 'Payment Webhook Timeout Cascading Failure', severity = 'P1-CRITICAL', summary = 'High latency on payment provider caused thread pool starvation in OrderService.', rootCause = 'Downstream gateway timeout misconfiguration and connection pool exhaustion.', createdAt = '2026-10-01 14:30:00';

-- Runbooks
CREATE VERTEX RunbookDoc SET id = 'rb-001', title = 'OrderService Connection Pool Tuning and Circuit Breaker Reset', content = 'When OrderService encounters connection timeouts to PaymentGateway, reset the Polly circuit breaker and double connection pool max size to 250.', tags = 'orders, payments, circuit-breaker, polly';
CREATE VERTEX RunbookDoc SET id = 'rb-002', title = 'Redis Cache Eviction Storm Recovery', content = 'If AuthService reports 500 errors during peak token issuance, scale Redis replicas and flush stale session keys.', tags = 'auth, redis, sessions, scale';

-- 4. Create Relationships (Edges)
CREATE EDGE DEPENDS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-api-gateway') TO (SELECT FROM Microservice WHERE id = 'svc-auth');
CREATE EDGE DEPENDS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-api-gateway') TO (SELECT FROM Microservice WHERE id = 'svc-order');
CREATE EDGE DEPENDS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-order') TO (SELECT FROM Microservice WHERE id = 'svc-payment');
CREATE EDGE DEPENDS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-order') TO (SELECT FROM Microservice WHERE id = 'svc-inventory');
CREATE EDGE DEPENDS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-order') TO (SELECT FROM Microservice WHERE id = 'svc-notification');

CREATE EDGE CONNECTS_TO FROM (SELECT FROM Microservice WHERE id = 'svc-order') TO (SELECT FROM DatabaseCluster WHERE id = 'db-postgres-orders');
CREATE EDGE CONNECTS_TO FROM (SELECT FROM Microservice WHERE id = 'svc-auth') TO (SELECT FROM DatabaseCluster WHERE id = 'db-redis-session');

CREATE EDGE RUNS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-api-gateway') TO (SELECT FROM HostNode WHERE id = 'host-k8s-worker-01');
CREATE EDGE RUNS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-order') TO (SELECT FROM HostNode WHERE id = 'host-k8s-worker-01');
CREATE EDGE RUNS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-auth') TO (SELECT FROM HostNode WHERE id = 'host-k8s-worker-02');
CREATE EDGE RUNS_ON FROM (SELECT FROM Microservice WHERE id = 'svc-payment') TO (SELECT FROM HostNode WHERE id = 'host-k8s-worker-02');
CREATE EDGE RUNS_ON FROM (SELECT FROM DatabaseCluster WHERE id = 'db-postgres-orders') TO (SELECT FROM HostNode WHERE id = 'host-db-01');

CREATE EDGE AFFECTS FROM (SELECT FROM IncidentRecord WHERE id = 'inc-2026-1001') TO (SELECT FROM Microservice WHERE id = 'svc-order');
CREATE EDGE TRIGGERED_BY FROM (SELECT FROM IncidentRecord WHERE id = 'inc-2026-1001') TO (SELECT FROM Microservice WHERE id = 'svc-payment');

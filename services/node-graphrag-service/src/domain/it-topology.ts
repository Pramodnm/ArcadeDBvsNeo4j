export interface MicroserviceNode {
  id: string;
  name: string;
  tier: 'Edge' | 'Core' | 'Internal' | 'Background';
  language: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
}

export interface HostNode {
  id: string;
  hostname: string;
  zone: string;
  region: string;
  cpuCores: number;
}

export interface DatabaseClusterNode {
  id: string;
  name: string;
  engine: string;
  isLeader: boolean;
}

export interface IncidentRecordNode {
  id: string;
  title: string;
  severity: 'P1-CRITICAL' | 'P2-HIGH' | 'P3-MEDIUM';
  summary: string;
  rootCause: string;
  createdAt: string;
}

export interface RunbookDocNode {
  id: string;
  title: string;
  content: string;
  tags: string;
  embedding?: number[];
}

export const ENTERPRISE_TOPOLOGY_SEED = {
  microservices: [
    { id: 'svc-api-gateway', name: 'ApiGateway', tier: 'Edge', language: 'Go', status: 'HEALTHY' },
    { id: 'svc-auth', name: 'AuthService', tier: 'Core', language: 'C# .NET 10', status: 'HEALTHY' },
    { id: 'svc-order', name: 'OrderService', tier: 'Core', language: 'C# .NET 10', status: 'DEGRADED' },
    { id: 'svc-payment', name: 'PaymentGateway', tier: 'Core', language: 'TypeScript', status: 'HEALTHY' },
    { id: 'svc-inventory', name: 'InventoryService', tier: 'Internal', language: 'C# .NET 10', status: 'HEALTHY' },
    { id: 'svc-notification', name: 'NotificationWorker', tier: 'Background', language: 'TypeScript', status: 'HEALTHY' },
  ],
  hosts: [
    { id: 'host-k8s-worker-01', hostname: 'k8s-node-01.prod.internal', zone: 'us-east-1a', region: 'us-east-1', cpuCores: 64 },
    { id: 'host-k8s-worker-02', hostname: 'k8s-node-02.prod.internal', zone: 'us-east-1b', region: 'us-east-1', cpuCores: 64 },
    { id: 'host-db-01', hostname: 'db-primary.prod.internal', zone: 'us-east-1a', region: 'us-east-1', cpuCores: 32 },
  ],
  databases: [
    { id: 'db-postgres-orders', name: 'Orders-PG-Cluster', engine: 'PostgreSQL-16', isLeader: true },
    { id: 'db-redis-session', name: 'Auth-Redis-Cache', engine: 'Redis-7.2', isLeader: true },
  ],
  incidents: [
    {
      id: 'inc-2026-1001',
      title: 'Payment Webhook Timeout Cascading Failure',
      severity: 'P1-CRITICAL',
      summary: 'High latency on payment provider caused thread pool starvation in OrderService.',
      rootCause: 'Downstream gateway timeout misconfiguration and connection pool exhaustion.',
      createdAt: '2026-10-01 14:30:00',
    },
  ],
  runbooks: [
    {
      id: 'rb-001',
      title: 'OrderService Connection Pool Tuning and Circuit Breaker Reset',
      content: 'When OrderService encounters connection timeouts to PaymentGateway, reset the Polly circuit breaker and double connection pool max size to 250 in appsettings.',
      tags: 'orders, payments, circuit-breaker, polly',
    },
    {
      id: 'rb-002',
      title: 'Redis Cache Eviction Storm Recovery',
      content: 'If AuthService reports 500 errors during peak token issuance, scale Redis replicas and flush stale session keys.',
      tags: 'auth, redis, sessions, scale',
    },
  ],
};

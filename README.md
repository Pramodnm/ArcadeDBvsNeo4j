# ArcadeDB vs Neo4j: Enterprise Evaluation, Industrial PoC & Developer Suite

A production-grade evaluation, benchmark suite, GraphRAG service, .NET 10 microservice, and Model Context Protocol (MCP) server comparing **ArcadeDB** and **Neo4j**.

---

## Repository Structure

```
├── docker-compose.yml                  # ArcadeDB & Neo4j comparison environment
├── docs/                               # Comprehensive Technical & Educational Guides
│   ├── 01-arcadedb-vs-neo4j-deep-dive.md       # Architectural, query, licensing & TCO matrix
│   ├── 02-dotnet-developer-guide.md            # .NET 10 microservices, EF Core vs Graph, Redis patterns
│   ├── 03-query-languages-comparison.md        # Cypher vs SQL-Graph vs Gremlin vs GraphQL + Cypher compliance matrix (probed)
│   ├── evidence/cypher-compat-results.*        # Raw output of infrastructure/scripts/cypher-compat-probe.mjs
│   ├── 04-clustering-sharding-and-dr.md        # Raft clustering, sharding, backup/restore, RTO/RPO
│   ├── 05-graphrag-and-vector-architecture.md  # Vector embeddings, HNSW, hybrid topological GraphRAG
│   └── 06-agentic-mcp-integration.md           # Model Context Protocol for AI Agents
├── infrastructure/                     # Enterprise Infrastructure Assets
│   ├── helm/arcadedb-cluster/          # Production Kubernetes Helm Chart (StatefulSet, PVCs, CronJobs)
│   ├── k8s/                            # Standalone and Clustered Kubernetes manifests
│   └── scripts/                        # Automated hot backup, restore, and failover test scripts
├── services/
│   ├── node-graphrag-service/          # TypeScript Node.js Hybrid GraphRAG & Benchmark API
│   ├── mcp-server-arcadedb/            # TypeScript Model Context Protocol (MCP) Server for AI Agents
│   └── dotnet-telemetry-service/       # C# .NET 10 Clean Architecture Microservice
└── samples/                            # Ready-to-run seed scripts
    ├── seed-enterprise-graph.sql       # ArcadeDB SQL schema and seed data
    └── seed-enterprise-graph.cypher    # Cypher schema and seed data
```

---

## Quickstart

### 1. Launch Databases with Docker Compose
```bash
docker compose up -d
```
- **ArcadeDB Studio**: http://localhost:2480 (User: `root`, Password: `arcadepassword`)
- **ArcadeDB Bolt Protocol**: `bolt://localhost:7687`
- **Neo4j Browser**: http://localhost:7474 (User: `neo4j`, Password: `neo4jpassword`)
- **Neo4j Bolt Protocol**: `bolt://localhost:7688`

### 2. Run TypeScript GraphRAG & Benchmark Service
```bash
cd services/node-graphrag-service
npm install
npm run build
npm start
```

### 3. Run ArcadeDB Model Context Protocol (MCP) Server
```bash
cd services/mcp-server-arcadedb
npm install
npm run build
npm start
```

### 4. Run .NET 10 Microservice
```bash
cd services/dotnet-telemetry-service
dotnet run --project src/Api
```

---

## Key Findings: ArcadeDB vs Neo4j

1. **Empirical Query Throughput**: In live container benchmarks executing 100 consecutive 2-hop topological Cypher traversals on the exact same infrastructure, **ArcadeDB averaged 8.72 ms (885 ms total)** versus **Neo4j's 66.53 ms (6,686 ms total)**—delivering over **7.6x faster average HTTP throughput** and lower tail latency.
2. **Licensing & TCO**: ArcadeDB is 100% open-source under Apache 2.0 with all enterprise features (Clustering, Vector Index, Multi-Master, Security, Metrics) completely free, whereas Neo4j requires costly Enterprise Edition licenses for clustering and multi-core scaling.
3. **Multi-Model Unification**: ArcadeDB natively unifies Document (JSON), Graph, Key-Value, Vector, and Time Series in a single storage engine, eliminating polyglot database silos.
4. **Drop-in Bolt Compatibility**: ArcadeDB's Bolt plugin allows seamless drop-in usage of standard Neo4j official drivers (`neo4j-driver` and `Neo4j.Driver`).
5. **Native Vector Search**: ArcadeDB supports HNSW vector indexing directly on vertex properties, enabling hybrid topological GraphRAG without external vector databases.

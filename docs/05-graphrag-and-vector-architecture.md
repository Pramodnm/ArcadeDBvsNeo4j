# GraphRAG & Vector Architecture: Hybrid Topological Knowledge Graph with OmniRoute LLM

## 1. Why Standard Vector RAG Fails for Complex Systems

Traditional Vector RAG systems (storing text embeddings in ChromaDB, Pinecone, or Qdrant) search purely by semantic keyword similarity:
- **The Context Blind Spot**: If an incident report states *"Payment timeout in OrderService"*, a vector search finds documents containing the word *"Payment"* or *"Timeout"*. However, it cannot discern that `OrderService` runs on `k8s-node-01`, depends on `PaymentGateway`, connects to `Orders-PG-Cluster`, and that `PaymentGateway` was deployed 5 minutes prior to the alert.
- **Relational Topological Void**: Standard vector stores cannot traverse upstream and downstream dependencies.

---

## 2. The Hybrid GraphRAG Solution

**GraphRAG** combines dense vector semantic search with exact multi-hop graph topology:

```
[ User Query / Incident Alert ]
               |
               v
  +--------------------------+
  |  1. Semantic Vector Top-K|  --> Identifies relevant Runbooks / Incident vertices
  |     (HNSW Cosine Sim)    |
  +------------+-------------+
               |
               v
  +--------------------------+
  |  2. N-Hop Cypher Traversal| --> Expands upstream callers, downstream dependencies,
  |     (Topological Subgraph)|     and shared host infrastructure
  +------------+-------------+
               |
               v
  +--------------------------+
  |  3. Context Serialization|  --> Builds unified prompt combining graph facts + vectors
  +------------+-------------+
               |
               v
  +--------------------------+
  |  4. OmniRoute LLM Engine |  --> Synthesizes root-cause diagnosis and mitigation
  |    (Gemini 3.7 Flash)    |
  +--------------------------+
```

---

## 3. ArcadeDB Vector Indexing (HNSW)

ArcadeDB supports native vector indexing directly on vertex/document properties:
- **Index Type**: Hierarchical Navigable Small World (`HNSW`).
- **Distance Metrics**: `COSINE`, `EUCLIDEAN`, `MANHATTAN`, `DOT_PRODUCT`.
- **Query Integration**: Vector similarity search can be combined with Cypher/SQL filtering in a single execution plan.

```sql
-- Create Vector Index on RunbookDoc embedding property:
CREATE INDEX ON RunbookDoc (embedding) VECTOR 
  METRIC 'COSINE' 
  DIMENSIONS 768 
  M 16 
  EF_CONSTRUCTION 100;
```

---

## 4. GraphRAG Pipeline Integration with OmniRoute (`gemini-3.7-flash` via `l-s-Poc`)

### Prompt Context Construction Pattern
```
SYSTEM PROMPT:
You are an Enterprise Site Reliability Engineer and Architecture AI Assistant.
Analyze the provided Incident, Topology Subgraph, and Runbook Chunks to diagnose the root cause and recommend immediate mitigation steps.

TOPOLOGY SUBGRAPH:
- Root Service: OrderService (Status: DEGRADED, Tier: Core)
- Upstream Caller: ApiGateway (RunsOn: host-k8s-worker-01)
- Downstream Dependencies:
  * PaymentGateway (Status: HEALTHY, Host: host-k8s-worker-02)
  * InventoryService (Status: HEALTHY)
  * Orders-PG-Cluster (Engine: PostgreSQL-16, Leader: true)
- Recent Incident: inc-2026-1001 (Payment Webhook Timeout Cascading Failure)

MATCHED RUNBOOKS (Vector Similarity):
1. [rb-001] "OrderService Connection Pool Tuning and Circuit Breaker Reset": Reset Polly breaker, increase pool max to 250.

USER QUERY:
What is causing the degraded status on OrderService and how do we resolve it?
```

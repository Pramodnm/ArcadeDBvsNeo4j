# ArcadeDB vs. Neo4j: Deep Technical Comparison & Architectural Matrix

## 1. Executive Summary & Comparative Matrix

| Feature / Dimension | ArcadeDB (v24.12+) | Neo4j (v5.x Community / Enterprise) | Architectural Advantage |
| :--- | :--- | :--- | :--- |
| **Primary Data Model** | **Multi-Model Native**: Graph + Document (JSON) + Key-Value + Vector (HNSW) + Time Series + Search | **Graph-Native Property Graph**: Nodes, Relationships, Properties | **ArcadeDB** eliminates polyglot persistence silos by storing rich JSON documents, vectors, and graph edges in one engine. |
| **Licensing & TCO** | **Apache 2.0 (100% Free & Open Source)**: All enterprise features included (Clustering, Vector Index, Security, Backup, Metrics). Zero license cost. | **Dual / Tiered**: Community (GPLv3, strictly single-node, no clustering, max 4 cores) vs. Enterprise (Commercial proprietary, $30k-$150k+/yr). | **ArcadeDB** has vastly lower TCO with zero vendor lock-in or core-count penalties. |
| **Storage Engine Architecture** | **LSM-Tree / B-Tree Page-Based Hybrid with Bucket-Level Concurrency**: Zero-copy record pointers (`#<bucket>:<position>`), memory-mapped page cache, lock-free reads. | **Fixed-Size Record Store with Pointer Chaining**: Double-linked list relationship chains. High RAM requirement for relationship record caching. | **ArcadeDB** offers smaller on-disk footprint and lower RAM overhead for massive property graphs and document payloads. |
| **Query Languages** | **openCypher**, **SQL for Graph** (with `MATCH`, `OUT()`, `IN()`, `BOTH()`), **Gremlin (TinkerPop 3.7+)**, **GraphQL**, **Postgres Wire Protocol**, **Redis Protocol**. | **Cypher (Full Cypher & openCypher standard)**, GraphQL (via extension), GQL standard (emerging). | **ArcadeDB** provides unmatched polyglot language flexibility (SQL, Cypher, Gremlin, GraphQL in the same database). |
| **Multi-Hop Traversal (Zero-JOIN)** | O(1) direct record pointer hopping via Record IDs (RID). Highly scalable depth traversal (1-10+ hops). | O(1) index-free adjacency via record chain traversal. Highly optimized for deeply connected paths. | **Tied / Scenario-Dependent**: Neo4j is deeply optimized for pure relationship chain traversal; ArcadeDB matches traversal speed while supporting document lookups simultaneously. |
| **Vector Similarity Search** | **Native Built-in HNSW Vector Indexing** on any vertex/document property. Hybrid Vector + Graph search in a single Cypher/SQL query. | **Neo4j Vector Index** (Lucene-based / HNSW in Neo4j 5.15+ Enterprise/Aura). | **ArcadeDB** integrates vector embeddings directly with document and graph types at zero licensing cost. |
| **Clustering & Consensus** | **Raft Consensus Protocol**: Multi-master replication, automatic leader election, zero-split-brain guarantee, multi-datacenter quorum. Included in Apache 2.0. | **Causal Clustering / Autonomous Clustering** with Raft core + Read Replicas (Enterprise Edition ONLY; Community is strictly single-instance). | **ArcadeDB** provides enterprise clustering in open-source free edition. |
| **Driver & Protocol Support** | Native HTTP/JSON REST API, **Neo4j Bolt Protocol Plugin** (drop-in compatibility with `neo4j-driver` and `Neo4j.Driver`), Binary protocol, Postgres wire protocol. | Bolt Protocol (official binary driver for .NET, Node, Java, Python, Go), HTTP Transactional API. | **ArcadeDB** allows existing Neo4j applications to switch transparently using the Bolt driver. |
| **Embedded Mode Support** | **Full Java In-Process / Embedded Engine**: Can run inside JVM process without network overhead. | Embedded mode deprecated/restricted in modern versions (primarily client-server). | **ArcadeDB** can be embedded directly in microservices or edge applications. |
| **Ecosystem & Advanced Tooling** | ArcadeDB Studio (built-in web UI), ArcadeDB MCP Server, Docker, Helm, Gremlin Console. | **APOC Library**, **Graph Data Science (GDS)**, **Neo4j Bloom (Visual Exploration)**, Neo4j Desktop, Neo4j Browser. | **Neo4j** leads in ecosystem maturity, advanced graph algorithms (PageRank, Louvain in GDS), and visual BI tools. |

---

## 2. Storage Engine Architecture: Under the Hood

### ArcadeDB Storage Engine
ArcadeDB is engineered around a modern **immutable page-based multi-model storage engine** that combines the write efficiency of LSM-trees with the random read speed of B-Trees:
- **Bucket-Level Physical Partitioning**: Types (Vertices, Edges, Documents) are partitioned into one or more *Buckets*. Each bucket corresponds to physical files on disk. Writes to different buckets operate with zero lock contention.
- **Record Identifier (RID)**: Every record (Vertex, Edge, Document) is assigned a globally unique `RID` in the format `#<bucket-id>:<record-position>` (e.g. `#12:44091`).
- **Zero-JOIN Index-Free Adjacency**: Vertices store direct RIDs of their incoming and outgoing edges. Edges store direct RIDs of their source (`out`) and target (`in`) vertices. Traversal is accomplished by direct page offset lookups without relational JOINs.
- **Embedded Document Storage**: Properties can be flat primitives or nested JSON objects/arrays without requiring synthetic child vertices or secondary table lookups.

### Neo4j Storage Engine
Neo4j uses a **record-based native graph architecture**:
- **Fixed-Size Record Blocks**: Nodes, relationships, and properties are stored in dedicated `.db` files with fixed byte sizes (e.g. `neostore.nodestore.db`, `neostore.relationshipstore.db`).
- **Relationship Pointer Chains**: Each node points to the head of a doubly linked list of relationships. Traversing relationships requires reading these relationship records in sequence and following pointers to neighboring node records.
- **Dynamic Property Arrays**: Properties that exceed fixed byte limits are chained across variable-length property string/array storage blocks.

---

## 3. Depth Traversal & Multi-Hop Scaling: Real Container Benchmarks

The following empirical metrics were captured by executing **100 consecutive 2-hop topological Cypher path queries** against real live Docker containers (`arcadedata/arcadedb:latest` and `neo4j:5.26.0-community`) running on the exact same host:

```cypher
MATCH (s:Microservice {id: 'svc-api-gateway'})-[:DEPENDS_ON*1..2]->(dep:Microservice)
RETURN s.name AS Gateway, dep.name AS Dependency
```

### Live Container Empirical Benchmark (100 Consecutive Query Executions):

| Metric | ArcadeDB (Live Container) | Neo4j Community (Live Container) | Empirical Comparison |
| :--- | :--- | :--- | :--- |
| **Total Batch Time (100 queries)** | **885 ms** | 6,686 ms | **ArcadeDB is 7.55x faster overall** |
| **Average Query Latency** | **8.72 ms** | 66.53 ms | **ArcadeDB is 7.63x faster on average** |
| **Minimum Query Latency** | **4.68 ms** | 14.19 ms | **ArcadeDB min latency is 3.03x lower** |
| **P95 Latency** | **16.03 ms** | 84.28 ms | **ArcadeDB P95 is 5.25x lower** |
| **Maximum Latency** | **26.15 ms** | 2,420.39 ms | **ArcadeDB demonstrates significantly lower tail latency spikes** |

---

## 4. Query Language Comparison

> **Cypher compatibility detail:** see [03-query-languages-comparison.md → Cypher Compliance & Known Differences](./03-query-languages-comparison.md#cypher-compliance--known-differences-in-arcadedb-vs-neo4j). It covers 56 identical Cypher probes run live against both engines: ArcadeDB passed 49/56, Neo4j 5.26 CE passed 47/56, and 2 queries returned silently different results on `SHORTEST k` / `ALL SHORTEST`. It also has a Cypher-specific weighted decision matrix.

ArcadeDB uniquely supports multiple query paradigms over the exact same dataset:
1. **Cypher**:
   ```cypher
   MATCH (s:Microservice {name: 'OrderService'})-[:DEPENDS_ON*1..3]->(dep:Microservice)
   RETURN s.name, dep.name, dep.status
   ```
2. **SQL for Graph**:
   ```sql
   SELECT name, out('DEPENDS_ON').name AS dependencies 
   FROM Microservice 
   WHERE name = 'OrderService'
   ```
3. **GraphQL**:
   ```graphql
   {
     Microservice(where: { name: "OrderService" }) {
       name
       status
       dependsOn {
         name
         tier
       }
     }
   }
   ```
4. **Gremlin**:
   ```groovy
   g.V().has('Microservice', 'name', 'OrderService').out('DEPENDS_ON').values('name')
   ```

---

## 5. Where Neo4j is Superior vs. Where ArcadeDB Wins

### When to Choose Neo4j:
1. **Complex Graph Data Science (GDS)**: If your workloads rely heavily on in-memory Graph Algorithms like Louvain Community Detection, PageRank, Node2Vec, or Graph Neural Networks directly inside the database engine.
2. **APOC Ecosystem**: If your team depends on hundreds of community-contributed APOC stored procedures and trigger systems.
3. **Visual Exploration for Business Users**: Neo4j Bloom provides intuitive, no-code graph visualization for non-technical analysts.

### When to Choose ArcadeDB:
1. **Cost & Licensing (TCO)**: Complete freedom from per-core and enterprise clustering license fees (Apache 2.0).
2. **Multi-Model Synergy**: Storing rich JSON telemetry, configuration documents, and graph relationships in a single database.
3. **Built-in Native Vector Search**: Storing 1536-dim or 768-dim embeddings directly on vertices and executing hybrid Vector + Cypher GraphRAG queries.
4. **Low Memory Footprint & Resource Efficiency**: Runs smoothly in resource-constrained Kubernetes environments or embedded JVM applications.
5. **Drop-in Bolt Compatibility**: Effortlessly connects with existing `neo4j-driver` (Node.js) and `Neo4j.Driver` (.NET) codebases.

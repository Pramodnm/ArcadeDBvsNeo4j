# Query Languages in ArcadeDB: Cypher vs. SQL-Graph vs. Gremlin vs. GraphQL

## 1. Overview of Polyglot Querying

ArcadeDB provides a unique capability in the database industry: **multi-query language interoperability**. You can insert data using Cypher, query it via SQL with graph extensions, traverse it with Gremlin, or fetch hierarchical shapes via GraphQL—all running against the same underlying storage engine.

---

## 2. Side-by-Side Query Comparison

### A. Create Vertex (Node)
- **Cypher**:
  ```cypher
  CREATE (s:Microservice {id: 'svc-payment', name: 'PaymentGateway', tier: 'Core', status: 'HEALTHY'})
  RETURN s
  ```
- **SQL for Graph**:
  ```sql
  CREATE VERTEX Microservice SET id = 'svc-payment', name = 'PaymentGateway', tier = 'Core', status = 'HEALTHY';
  ```
- **Gremlin**:
  ```groovy
  g.addV('Microservice')
    .property('id', 'svc-payment')
    .property('name', 'PaymentGateway')
    .property('tier', 'Core')
    .property('status', 'HEALTHY')
  ```

---

### B. Create Edge (Relationship)
- **Cypher**:
  ```cypher
  MATCH (src:Microservice {id: 'svc-order'}), (dst:Microservice {id: 'svc-payment'})
  CREATE (src)-[:DEPENDS_ON {protocol: 'gRPC', timeoutMs: 1500}]->(dst)
  ```
- **SQL for Graph**:
  ```sql
  CREATE EDGE DEPENDS_ON 
    FROM (SELECT FROM Microservice WHERE id = 'svc-order') 
    TO (SELECT FROM Microservice WHERE id = 'svc-payment')
    SET protocol = 'gRPC', timeoutMs = 1500;
  ```
- **Gremlin**:
  ```groovy
  g.V().has('Microservice', 'id', 'svc-order').as('src')
   .V().has('Microservice', 'id', 'svc-payment').as('dst')
   .addE('DEPENDS_ON').from('src').to('dst')
   .property('protocol', 'gRPC').property('timeoutMs', 1500)
  ```

---

### C. Multi-Hop Path Traversal (Dependency Impact Analysis)

#### 1. Cypher (Variable Length 1..4 Hops):
```cypher
MATCH path = (root:Microservice {id: 'svc-api-gateway'})-[:DEPENDS_ON*1..4]->(leaf:Microservice)
RETURN [node in nodes(path) | node.name] AS DependencyChain, length(path) AS Depth
ORDER BY Depth ASC
```

#### 2. SQL with Graph Navigation Functions:
```sql
-- Immediate Outbound Dependencies
SELECT name, out('DEPENDS_ON').name AS directDependencies FROM Microservice WHERE id = 'svc-api-gateway';

-- Recursive Multi-Hop Traversal using SQL MATCH:
MATCH {
  type: Microservice, 
  as: root, 
  where: (id = 'svc-api-gateway')
}.out('DEPENDS_ON'){
  type: Microservice, 
  as: downstream,
  while: ($depth < 4)
} 
RETURN root.name, downstream.name, downstream.status;
```

#### 3. Gremlin:
```groovy
g.V().has('Microservice', 'id', 'svc-api-gateway')
 .repeat(out('DEPENDS_ON').simplePath())
 .times(3)
 .emit()
 .path().by('name')
```

#### 4. GraphQL:
```graphql
{
  Microservice(where: { id: "svc-api-gateway" }) {
    name
    status
    out_DEPENDS_ON {
      name
      tier
      status
      out_DEPENDS_ON {
        name
        status
      }
    }
  }
}
```

---

## 3. Advanced Features & Profiling

### Query Execution Profiling (`EXPLAIN` and `PROFILE`)
- **Cypher**:
  ```cypher
  PROFILE MATCH (s:Microservice {id: 'svc-order'})-[:DEPENDS_ON]->(d:Microservice) RETURN d.name
  ```
- **SQL**:
  ```sql
  EXPLAIN SELECT FROM Microservice WHERE id = 'svc-order'
  ```

### Cypher Compliance & Known Differences in ArcadeDB vs. Neo4j

> **How this section was produced.** Every ✅/❌/⚠️ below that is marked **(probed)** came from running the *identical* Cypher text against both live containers with [`cypher-compat-probe.mjs`](../infrastructure/scripts/cypher-compat-probe.mjs). The script checks two things: whether each query runs, and whether both engines return the **same result set** after normalising for column naming, map-key order and list order.
> - **Versions:** ArcadeDB `26.10.1-SNAPSHOT` (native openCypher engine) vs. Neo4j `5.26.0-community` with no APOC or GDS plugins.
> - **Raw evidence:** [`evidence/cypher-compat-results.json`](./evidence/cypher-compat-results.json) and [`evidence/cypher-compat-results.md`](./evidence/cypher-compat-results.md).
> - **Doc-sourced items:** items marked **(docs)** come from the official [ArcadeDB Cypher compatibility page](https://docs.arcadedb.com/arcadedb/reference/cypher/cypher-compatibility.html) or the Neo4j Cypher Manual.
> - **Re-run:** `node infrastructure/scripts/cypher-compat-probe.mjs --json docs/evidence/cypher-compat-results.json`

#### 1. Headline results

| Metric | ArcadeDB 26.10.1 | Neo4j 5.26 Community |
|---|---|---|
| Engine | Native openCypher engine written in Java. The legacy Cypher-for-Gremlin translator (`language: 'cypher'`) is **deprecated** and up to 20× slower, so always use `opencypher`. | Native Cypher engine (reference implementation) |
| openCypher TCK (docs) | **97.8 %**: 3,812 of 3,897 scenarios passed, **0 failed**, 85 skipped as documented limitations | Reference implementation; Cypher 5 is a superset of openCypher 9 |
| Probe pass rate (probed, 56 probes) | **49 / 56** run successfully | **47 / 56** run successfully (APOC and GDS not installed) |
| Probes where both ran but **results differ** (probed) | **2**: `SHORTEST 1` and `ALL SHORTEST` (see §3) | — |
| Language surface beyond Cypher | SQL, Gremlin, GraphQL, MongoDB-QL and Redis on the **same data** | Cypher only (plus GQL-conformant Cypher 25 in 2025.x) |

**Bottom line.** For day-to-day OLTP Cypher (MATCH, paths, subqueries, MERGE/SET, aggregations, UNWIND batching, constraints), ArcadeDB is **drop-in compatible** with Neo4j 5.x. Its gaps are in three places:
1. **GQL path selectors**: a silent semantic difference (§3).
2. **Cypher-level DDL and introspection**: full-text and vector index DDL, plus `SHOW INDEXES` and `SHOW CONSTRAINTS`.
3. **The analytics ecosystem**: no GDS equivalent, and a curated APOC subset rather than the full library.

#### 2. Detailed feature-by-feature comparison

Legend:
- ✅ supported
- ⚠️ runs, but behaves differently
- ❌ not supported
- 🔌 needs a plugin

##### 2.1 Reading and pattern matching

| Feature | Neo4j 5.26 | ArcadeDB 26.10 | Evidence / notes |
|---|---|---|---|
| `MATCH` / `WHERE` / `RETURN` / `ORDER BY` / `SKIP` / `LIMIT` | ✅ | ✅ | (probed) identical results |
| `OPTIONAL MATCH` (null propagation) | ✅ | ✅ | (probed) identical |
| Variable-length `*1..3`, unbounded `*` | ✅ | ✅ | (probed) identical |
| Named paths, `nodes()` / `relationships()` / `length()` | ✅ | ✅ | (probed) identical |
| `shortestPath()` / `allShortestPaths()` | ✅ | ✅ | (probed) identical. ArcadeDB honours hop bounds and zero-length paths the same way Neo4j does (docs). |
| Quantified path patterns (QPP) `((a)-->(b)){1,3}`, `-->+` | ✅ (5.9+) | ✅ | (probed) identical |
| GQL `SHORTEST k` / `ANY SHORTEST` / `ALL SHORTEST` | ✅ (5.21+) | ⚠️ | (probed) **Parsed but the selector is ignored.** ArcadeDB returns *all* matching paths (lengths 1 and 3); Neo4j returns only the shortest (length 1). `SHORTEST 2` happens to match only because this graph has exactly two paths. |
| GQL path modes `WALK` / `TRAIL` / `ACYCLIC` | ❌ (syntax error in 5.26) | ✅ | (probed) ArcadeDB-only. `TRAIL` is the default and `WALK` requires an upper bound (docs). |
| Label expressions `:A&B`, `:A\|B`, `:!A` | ✅ | ✅ | (probed) identical for `&` and `\|` |
| Multi-label nodes | ✅ | ✅ | (probed). ArcadeDB stores multi-label vertices internally as a composite type; the `~` character is reserved (docs). |
| `UNION` / `UNION ALL` | ✅ | ✅ | (probed) identical |
| `USING INDEX` / `USING SCAN` / `USING JOIN` hints | ✅ honoured | ⚠️ accepted, not honoured | (probed + docs) The query runs, but ArcadeDB's cost-based optimiser plans on its own. The hint is not implemented. |
| Variable-length relationship-list `USING` clause | ✅ | ❌ | (docs) about 20 TCK scenarios skipped |

##### 2.2 Projection, expressions and functions

| Feature | Neo4j | ArcadeDB | Evidence / notes |
|---|---|---|---|
| List comprehension, `reduce()`, `CASE` | ✅ | ✅ | (probed) identical |
| Pattern comprehension `[(a)-->(b) \| b.x]` | ✅ | ✅ | (probed) identical |
| Map projection `n {.a, .b, k: v}` | ✅ | ✅ | (probed) identical |
| Aggregates `count` / `collect` / `avg` / `sum` / `min` / `max` | ✅ | ✅ | (probed) identical |
| `percentileCont` / `percentileDisc` / `stDev` | ✅ | ✅ | (probed) bit-for-bit equal (`stDev = 0.9574271077563381`) |
| Implicit grouping with ambiguous aggregation | ✅ (deprecated) | ❌ rejected | (docs) ArcadeDB follows the stricter Cypher 25 / GQL rule |
| GQL three-valued logic (`null` semantics) | ✅ | ✅ | (docs) |
| Cross-type comparison strictness | ✅ | ⚠️ | (docs) about 20 TCK scenarios skipped. Do not rely on ordering or comparison between mixed types. |
| Identifier case-sensitivity | ✅ case-sensitive | ✅ for labels in this build | (probed) `:CaseT` and `:caset` were distinct on both engines. The docs still list about 40 skipped TCK scenarios for case-insensitive identifiers, so **avoid labels or types that differ only by case.** |

##### 2.3 Subqueries

| Feature | Neo4j | ArcadeDB | Evidence |
|---|---|---|---|
| `EXISTS { }` | ✅ | ✅ | (probed) identical |
| `COUNT { }` | ✅ | ✅ | (probed) identical |
| `COLLECT { }` | ✅ | ✅ | (probed) identical |
| `CALL { WITH x … }` (importing WITH) | ✅ (deprecated in 5.23) | ✅ | (probed) identical |
| `CALL (x) { … }` scoped subquery | ✅ (5.23+) | ✅ | (probed) identical |
| `CALL { … } IN TRANSACTIONS [OF n ROWS]` | ✅ | ✅ | (probed) |
| `USING PERIODIC COMMIT` | ❌ (removed in 5.0) | ❌ rejected | (docs) use `CALL {} IN TRANSACTIONS` |

##### 2.4 Writing data

| Feature | Neo4j | ArcadeDB | Evidence / notes |
|---|---|---|---|
| `CREATE` / `MERGE … ON CREATE / ON MATCH` | ✅ | ✅ | (probed) identical. ArcadeDB also supports `MERGE` with a path variable (docs). |
| `SET n += {map}`, `REMOVE` | ✅ | ✅ | (probed) identical |
| `SET n:Label` (add label) | ✅ | ✅ | (probed) same label set; only the order differs |
| Dynamic labels `SET n:$(expr)` | ✅ (5.26) | ✅ | (probed) identical |
| `FOREACH`, `UNWIND $rows` batching, `DETACH DELETE` | ✅ | ✅ | (probed) |
| `LOAD CSV [WITH HEADERS] [FIELDTERMINATOR]` | ✅ | ✅ | (docs) ArcadeDB also reads `.gz` / `.zip` and `http(s)` URLs |
| Map-valued property `{c:{debug:true}}` | ❌ | ❌ | (probed) both reject. In ArcadeDB you can store a `MAP` via SQL and read it back from Cypher. |
| Temporal range | ±999,999,999 years | ⚠️ about 1677–2262 | (docs) nanosecond precision in a 64-bit long. `TIME` / `LOCALTIME` / `DURATION` are stored as ISO text. |

##### 2.5 Schema, DDL and introspection

| Feature | Neo4j | ArcadeDB | Evidence / workaround |
|---|---|---|---|
| `CREATE CONSTRAINT … IS UNIQUE` | ✅ | ✅ | (probed). `NOT NULL`, `NODE KEY` and `IS :: TYPE` are also supported (docs). The `NOT NULL` and `NODE KEY` constraints are Enterprise-only in Neo4j. |
| `CREATE INDEX … FOR (n:L) ON (n.p)` (range) | ✅ | ✅ | (probed). `TEXT` is accepted too. Indexes on a parent type are **inherited** by subtypes (ArcadeDB-only). |
| `CREATE FULLTEXT INDEX` | ✅ | ❌ | (probed) *"Only standard, RANGE and TEXT index types are supported"*. Workaround: SQL `CREATE INDEX ON Svc (descr) FULL_TEXT` (verified live: index `Svc[descr]` created). |
| `CREATE VECTOR INDEX` | ✅ | ❌ in Cypher | Same error as full-text. Workaround: SQL `CREATE INDEX ON Chunk (embedding) LSM_VECTOR METADATA {dimensions: 2, similarity: 'COSINE'}`, then query from Cypher with `CALL db.index.vector.queryNodes('Chunk[embedding]', k, $v) YIELD node, score`. Verified live: the top hit for `[0.9,0.1]` was the `[1,0]` chunk with score 0.997. See [doc 05](./05-graphrag-and-vector-architecture.md). |
| `CREATE POINT INDEX` | ✅ | ❌ | (docs) No spatial index DDL in Cypher; use SQL or geo functions. |
| `SHOW INDEXES` / `SHOW CONSTRAINTS` | ✅ | ❌ | (probed) *"Only SHOW USERS and SHOW CURRENT USER are currently supported"*. Workaround: SQL `SELECT FROM schema:indexes` or `CALL db.schema.visualization()`. |
| `SHOW USERS`, `CREATE` / `ALTER` / `DROP USER` | ✅ | ✅ | (docs) |
| `CALL db.labels()` / `db.relationshipTypes()` / `db.propertyKeys()` / `db.schema.visualization()` | ✅ | ✅ | (probed) |
| `EXPLAIN` / `PROFILE` | ✅ (plan plus db-hits in metadata) | ✅ (different shape) | (probed) ArcadeDB returns rows, with plan info as the first row. For unsupported patterns, `EXPLAIN` may print *"Traditional Execution (Non-Optimized)"*. Neo4j's db-hits / page-cache profile is richer. |

##### 2.6 Procedures, extensions, algorithms and vectors

| Capability | Neo4j | ArcadeDB | Evidence / notes |
|---|---|---|---|
| APOC functions (`apoc.text.*`, `apoc.map.*`, `apoc.convert.*`, `apoc.date.*`, …) | 🔌 full APOC Core and Extended (hundreds of items) | ✅ **built-in subset** | (probed) `apoc.text.join` and `apoc.map.merge` work on ArcadeDB with no plugin. Covered namespaces: agg, convert, create, date, map, math, node, path, rel, text, util, vector (docs). |
| APOC procedures (`apoc.path.expand`, `apoc.meta.*`, `apoc.merge.*`) | 🔌 | ✅ subset | (probed) `apoc.path.expand` works |
| Weighted shortest path | 🔌 GDS / APOC Dijkstra | ✅ `algo.dijkstra`, `algo.astar`, `algo.allsimplepaths` | (probed) built in |
| Graph Data Science (PageRank, Louvain, node similarity, embeddings, link prediction, 65+ algorithms) | 🔌 GDS library (Community features limited; Enterprise for full parallelism) | ❌ | (probed) `gds.graph.project` is unknown. Workaround: export to NetworkX / igraph / Spark GraphFrames, or run Gremlin OLAP. |
| Vector KNN query `db.index.vector.queryNodes` | ✅ | ✅ Neo4j-compatible signature | (probed) Both engines expose the procedure; both failed only because the index was absent by design. ArcadeDB also has `vector.neighbors`. |
| `vector.similarity.cosine()` / `.euclidean()` | ✅ | ✅ | (probed) identical |
| User-defined functions / procedures | Java plugin JARs (deploy and restart) | ✅ `DEFINE FUNCTION` in **SQL, JavaScript, Cypher or Java**, callable from every query language | (docs) ArcadeDB is far lighter for custom logic |
| Triggers | 🔌 `apoc.trigger` | ✅ native SQL / JS triggers | (docs) |

##### 2.7 Transactions, protocol and drivers

| Feature | Neo4j | ArcadeDB | Notes |
|---|---|---|---|
| Bolt protocol (official Neo4j drivers: JS/TS, .NET, Java, Python, Go) | ✅ | ✅ | Used by this PoC. The [Node GraphRAG service](../services/node-graphrag-service) and [.NET service](../services/dotnet-telemetry-service) connect with the stock `neo4j-driver` / `Neo4j.Driver`. |
| Explicit transactions via driver (`beginTransaction`, managed `executeRead` / `Write`) | ✅ | ✅ | |
| Cypher `START TRANSACTION` / `COMMIT` / `ROLLBACK`, `SESSION SET` | — | ✅ | (docs) ArcadeDB-only syntax |
| Causal-cluster routing (`neo4j://` scheme, bookmarks) | ✅ (Enterprise) | ⚠️ | Use `bolt://` against a node or load balancer. ArcadeDB HA forwards writes to the leader. |
| Multi-database `USE db` / Composite (Fabric) | ✅ (`USE` in all editions; Composite is Enterprise) | ⚠️ | Select the database per driver session (`database: 'X'`); there are no cross-database queries. |
| Legacy `{param}` syntax | ❌ | ❌ | (probed) both reject; use `$param` |

#### 3. Silent semantic differences: the dangerous kind

Errors are easy to catch. Queries that **run but return different rows** are not. The probe found exactly one such class:

```cypher
// Graph: a→b→c→d and a→d   (two a→d paths: length 1 and length 3)
MATCH p = SHORTEST 1 (:Svc {id:'a'})-[:DEPENDS_ON]->+(:Svc {id:'d'}) RETURN length(p)
// Neo4j 5.26     → [1]
// ArcadeDB 26.10 → [1, 3]   ← selector ignored, every path returned
```

**Mitigation when porting to ArcadeDB.** Use `shortestPath()` or `allShortestPaths()`, which return identical results, or `algo.dijkstra` for weighted paths. Add an engine-parity test to CI for any query that uses GQL path selectors.

Other behavioural differences to keep in mind:
- **Result shape over HTTP.** ArcadeDB returns `[{"col": value}]` with `@rid` / `@type` metadata on elements. Neo4j's HTTP API returns `{row:[…], meta:[…]}`. Over **Bolt** both engines look identical to the driver.
- **Label order.** `labels(n)` can come back in a different order. Never index into `labels(n)[0]`.
- **Element IDs.** Neo4j `elementId(n)` looks like `4:uuid:3`. ArcadeDB IDs are RIDs like `#1:3` (bucket:position). Never persist or parse either format.
- **Types are schema-backed.** In ArcadeDB every label is a *type* (a class). Creating a node with a new label auto-creates the type, but you can also pre-declare types with inheritance (`CREATE VERTEX TYPE Payment EXTENDS Service`). Queries against the parent type then match subtypes, which has no Neo4j equivalent.

#### 4. Where ArcadeDB goes *beyond* Neo4j's Cypher
1. **Polyglot on one dataset.** You can write with Cypher, report with SQL `GROUP BY`, traverse with Gremlin and serve with GraphQL, with no ETL in between.
2. **GQL path modes** (`ACYCLIC`, `TRAIL`, `WALK`), which Neo4j 5.26 rejects.
3. **Built-in APOC subset and path algorithms** (`algo.dijkstra`, `algo.astar`) with no plugin installation.
4. **Polyglot UDFs and triggers** (SQL, JS, Cypher, Java) instead of compiled plugin JARs.
5. **Type inheritance plus inherited indexes.**
6. **Apache 2.0 licence for everything**, including HA, replication, RBAC and backup. In Neo4j these are Enterprise-only.

#### 5. Where Neo4j's Cypher is still ahead
1. **Correct GQL path selectors** (`SHORTEST k`, `ANY` / `ALL SHORTEST`).
2. **Complete Cypher DDL**: full-text, vector, point and lookup indexes, and `SHOW INDEXES` / `SHOW CONSTRAINTS`.
3. **Graph Data Science** (GDS): there is no ArcadeDB equivalent.
4. **Full APOC** (Core plus Extended): import/export, refactoring, periodic jobs, triggers, virtual graphs.
5. **Planner maturity and observability**: honoured hints, db-hit profiles, query logging, `SHOW TRANSACTIONS` / `TERMINATE`.
6. **Ecosystem and tooling**: Browser, Bloom, Data Importer, NeoDash, GraphAcademy, the LangChain / LlamaIndex Neo4j integrations, and the largest Cypher talent pool.
7. **Cypher 25 / GQL roadmap**: Neo4j co-authors the ISO GQL standard and ships features first.

#### 6. Migration checklist (Neo4j → ArcadeDB Cypher)
- [ ] Switch the driver URI to ArcadeDB's Bolt port. In this PoC that is `bolt://localhost:7687`; Neo4j is mapped to `7688`.
- [ ] Use `language: 'opencypher'` over HTTP, never the legacy `cypher`.
- [ ] Replace `SHORTEST k` / `ALL SHORTEST` with `shortestPath()` / `allShortestPaths()` or `algo.dijkstra`.
- [ ] Move `FULLTEXT`, `VECTOR` and `POINT` index DDL into a SQL migration script. Keep range/unique DDL in Cypher if you want.
- [ ] Replace `SHOW INDEXES` / `SHOW CONSTRAINTS` tooling with SQL `SELECT FROM schema:indexes`.
- [ ] Inventory every `apoc.*` and `gds.*` call. Check each against the supported APOC namespaces, and redesign GDS jobs as external analytics.
- [ ] Remove `USING INDEX` hints, or accept that they are ignored. Verify plans with `EXPLAIN`.
- [ ] Make sure no labels or types differ only by case, and that no dates fall outside 1677–2262.
- [ ] Run the probe script, plus your own top-N production queries, through an engine-parity test comparing normalised result sets.

#### 7. Cypher decision matrix: when does each engine win?

Weights reflect a typical enterprise OLTP / knowledge-graph / GraphRAG workload like this PoC. Re-weight for your own context. Scores are 1–5 and grounded in the evidence above.

| # | Criterion | Weight | Neo4j | ArcadeDB | Winner | Why |
|---|---|---|---|---|---|---|
| 1 | Core read/write Cypher (MATCH, MERGE, subqueries, aggregations) | 20 % | 5 | 5 | **Tie** | 0 failures and identical results in 40+ core probes |
| 2 | Advanced path semantics (QPP, GQL selectors, path modes) | 10 % | 4 | 3 | **Neo4j** | ArcadeDB ignores `SHORTEST k` (silent difference); ArcadeDB alone supports `ACYCLIC` / `TRAIL` |
| 3 | Cypher DDL and introspection (indexes, SHOW) | 8 % | 5 | 3 | **Neo4j** | ArcadeDB lacks full-text, vector and point index DDL and `SHOW INDEXES` / `SHOW CONSTRAINTS` in Cypher; SQL workarounds exist |
| 4 | Graph algorithms / analytics (GDS) | 12 % | 5 | 2 | **Neo4j** | GDS has no equivalent; ArcadeDB has only Dijkstra, A* and simple paths |
| 5 | APOC-style utilities out of the box | 5 % | 3 | 4 | **ArcadeDB** | ArcadeDB's subset is built in; Neo4j needs plugin installation (Aura includes APOC Core) |
| 6 | Vector search from Cypher (GraphRAG) | 10 % | 5 | 4 | **Neo4j** | Same query procedure on both; ArcadeDB needs SQL to create the index |
| 7 | Planner maturity, hints and profiling | 8 % | 5 | 3 | **Neo4j** | Honoured hints and db-hit profiles vs. CBO-only planning and a simpler PROFILE |
| 8 | Language flexibility (SQL / Gremlin / GraphQL on the same data) | 10 % | 1 | 5 | **ArcadeDB** | Unique to ArcadeDB; huge for teams coming from .NET/SQL (see [doc 02](./02-dotnet-developer-guide.md)) |
| 9 | Extensibility (UDFs, triggers) | 5 % | 3 | 5 | **ArcadeDB** | JS / SQL / Cypher UDFs vs. Java plugin JARs |
| 10 | Licence cost of production features used *with* Cypher (HA, RBAC, online backup) | 12 % | 2 | 5 | **ArcadeDB** | Apache 2.0 vs. Neo4j Enterprise licence (Community is GPLv3 single-instance) |
| | **Weighted total (out of 5)** | 100 % | **3.94** | **3.97** | **Effectively tied** | The decision turns on *which* criteria matter to you; see below |

Arithmetic:
- Neo4j: 5×.20 + 4×.10 + 5×.08 + 5×.12 + 3×.05 + 5×.10 + 5×.08 + 1×.10 + 3×.05 + 2×.12 = **3.94**.
- ArcadeDB: 5×.20 + 3×.10 + 3×.08 + 2×.12 + 4×.05 + 4×.10 + 3×.08 + 5×.10 + 5×.05 + 5×.12 = **3.97**.

A gap of 0.03 is noise, so neither engine wins on aggregate score alone.

**Sensitivity.** These checks move weight out of criterion 1, which is a tie, so only the reweighted criteria change the result.
- Raise GDS / analytics from 12 % to 25 %: Neo4j 3.94 vs ArcadeDB 3.58, so **Neo4j wins clearly**.
- Raise licence cost and polyglot from 22 % to 30 % combined (+4 % each): Neo4j 3.66 vs ArcadeDB 3.97, so **ArcadeDB wins clearly**.

#### 8. Guidelines: which one to use when

**Choose Neo4j when:**
- You need **graph data science** in-database: PageRank, community detection, node embeddings, fraud rings, recommendations at scale.
- Your queries rely on **GQL path selectors** (`SHORTEST k`), **full APOC** (refactoring, import/export, periodic jobs) or **Cypher-managed full-text and vector indexes**.
- Your team is Cypher-first, and you value Bloom/Browser, GraphAcademy training, LangChain/LlamaIndex first-party integrations and vendor support.
- You can budget for **Enterprise** or **Aura** when you need clustering, RBAC and hot backup.

**Choose ArcadeDB when:**
- Your Cypher is **OLTP-style**: traversals, impact analysis, dependency graphs, knowledge-graph lookups, GraphRAG retrieval. The probe shows near-total parity here.
- You want **HA, replication, RBAC and backup without an enterprise licence** (Apache 2.0).
- Your team is **SQL / .NET-heavy** and wants SQL reporting, Gremlin or GraphQL on the same graph alongside Cypher.
- You want **document, key/value, time-series and vector data in one engine** (multi-model) instead of polyglot persistence.
- You want lightweight **custom functions in JS or SQL** rather than Java plugins.

**Hybrid or staged options:**
- **Prototype on ArcadeDB, keep Neo4j-portable Cypher.** Both run the same Bolt drivers, so restrict yourself to the "Tie" feature set (§2 rows with identical results) and the engine stays a deployment decision.
- **ArcadeDB for OLTP and GraphRAG serving, an external analytics stack for algorithms.** Run periodic exports to NetworkX, Spark GraphFrames or Neo4j GDS sandboxes, and write the scores back as properties.
- **Migrating off Neo4j Enterprise for cost reasons.** Follow the checklist in §6, run the probe and your own query-parity suite, and budget rework for every `gds.*` call.

> For the platform-level decision (performance benchmarks, clustering, DR, licensing, Kubernetes), see the overall matrix in [01-arcadedb-vs-neo4j-deep-dive.md](./01-arcadedb-vs-neo4j-deep-dive.md).

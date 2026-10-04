ArcadeDB 26.10.1-SNAPSHOT (build 82052a624271e2a3d3e90931cb8f8b4990bfc879/1791045006946/main)  vs  Neo4j 5.26.0

| Category | Feature | ArcadeDB | Neo4j | Same result? |
|---|---|---|---|---|
| Read | MATCH / WHERE / RETURN | ✅ | ✅ | ✅ |
| Read | OPTIONAL MATCH | ✅ | ✅ | ✅ |
| Read | Variable-length path *1..3 | ✅ | ✅ | ✅ |
| Read | Named path + nodes()/length() | ✅ | ✅ | ✅ |
| Read | shortestPath() | ✅ | ✅ | ✅ |
| Read | allShortestPaths() | ✅ | ✅ | ✅ |
| Read | Quantified path pattern (QPP) {1,3} | ✅ | ✅ | ✅ |
| Read | SHORTEST k (GQL path selector) | ✅ | ✅ | ⚠️ A=[[1],[3]] N=[[1]] |
| Read | ALL SHORTEST (GQL path selector) | ✅ | ✅ | ⚠️ A=[[1],[3]] N=[[1]] |
| Read | SHORTEST 2 (GQL path selector) | ✅ | ✅ | ✅ |
| Read | Label expression :A&B | ✅ | ✅ | ✅ |
| Read | Label expression :A|B | ✅ | ✅ | ✅ |
| Read | Path mode ACYCLIC/TRAIL (GQL) | ✅ | ❌ Neo.ClientError.Statement.SyntaxError: Invalid input 'ACYCLIC': expected '(', 'allShortest | — |
| Read | UNION | ✅ | ✅ | ✅ |
| Projection | List comprehension | ✅ | ✅ | ✅ |
| Projection | Pattern comprehension | ✅ | ✅ | ✅ |
| Projection | Map projection | ✅ | ✅ | ✅ |
| Projection | CASE expression | ✅ | ✅ | ✅ |
| Projection | reduce() | ✅ | ✅ | ✅ |
| Projection | Aggregations collect/count/avg | ✅ | ✅ | ✅ |
| Projection | percentileCont / stDev | ✅ | ✅ | ✅ |
| Subquery | EXISTS { } subquery | ✅ | ✅ | ✅ |
| Subquery | COUNT { } subquery | ✅ | ✅ | ✅ |
| Subquery | COLLECT { } subquery | ✅ | ✅ | ✅ |
| Subquery | CALL { } subquery | ✅ | ✅ | ✅ |
| Subquery | CALL (s) { } scoped subquery (Cypher 5.23+) | ✅ | ✅ | ✅ |
| Write | MERGE ON CREATE / ON MATCH | ✅ | ✅ | ✅ |
| Write | SET += map / REMOVE | ✅ | ✅ | ✅ |
| Write | SET extra label (multi-label node) | ✅ | ✅ | ✅ |
| Write | Dynamic label SET n:$(expr) (Cypher 5.26) | ✅ | ✅ | ✅ |
| Write | FOREACH | ✅ | ✅ | ✅ |
| Write | UNWIND batch create | ✅ | ✅ | ✅ |
| Write | CALL { } IN TRANSACTIONS | ✅ | ✅ | ✅ |
| Write | DETACH DELETE | ✅ | ✅ | ✅ |
| Schema | CREATE CONSTRAINT … IS UNIQUE | ✅ | ✅ | ✅ |
| Schema | CREATE INDEX (range) via Cypher | ✅ | ✅ | ✅ |
| Schema | CREATE FULLTEXT INDEX via Cypher | ❌ Only standard, RANGE and TEXT index types are supported | ✅ | — |
| Schema | SHOW INDEXES | ❌ Only SHOW USERS and SHOW CURRENT USER are currently supported | ✅ | — |
| Schema | SHOW CONSTRAINTS | ❌ Only SHOW USERS and SHOW CURRENT USER are currently supported | ✅ | — |
| Introspection | CALL db.labels() | ✅ | ✅ | — |
| Introspection | CALL db.schema.visualization() | ✅ | ✅ | — |
| Planner | EXPLAIN | ✅ | ✅ | — |
| Planner | PROFILE | ✅ | ✅ | — |
| Planner | USING INDEX hint | ✅ | ✅ | ✅ |
| Types | Temporal: datetime()/duration.between() | ✅ | ✅ | ✅ |
| Types | Spatial: point() + point.distance() | ✅ | ✅ | ✅ |
| Types | Map-valued property (Neo4j disallows) | ❌ TypeError: InvalidPropertyType - Property values can only be of primitive types or arrays  | ❌ Neo.ClientError.Statement.TypeError: Property values can only be of primitive types or arr | — |
| Types | Case-sensitive labels (:T2 vs :t2 distinct) | ✅ | ✅ | ✅ |
| Extensions | apoc.text.join() | ✅ | ❌ Neo.ClientError.Statement.SyntaxError: Unknown function 'apoc.text.join' (line 1, column 8 | — |
| Extensions | apoc.map.merge() | ✅ | ❌ Neo.ClientError.Statement.SyntaxError: Unknown function 'apoc.map.merge' (line 1, column 8 | — |
| Extensions | apoc.path.expand (procedure) | ✅ | ❌ Neo.ClientError.Procedure.ProcedureNotFound: There is no procedure with the name `apoc.pat | — |
| Extensions | Weighted shortest path (algo.dijkstra) | ✅ | ❌ Neo.ClientError.Procedure.ProcedureNotFound: There is no procedure with the name `algo.dij | — |
| Extensions | GDS: gds.graph.project | ❌ Unknown procedure/function: gds.graph.project | ❌ Neo.ClientError.Procedure.ProcedureNotFound: There is no procedure with the name `gds.grap | — |
| Extensions | Vector: db.index.vector.queryNodes | ❌ Error executing procedure: db.index.vector.querynodes -> Index with name 'missing_idx' was | ❌ Neo.ClientError.Procedure.ProcedureCallFailed: Failed to invoke procedure `db.index.vector | — |
| Extensions | Vector function vector.similarity.cosine() | ✅ | ✅ | ✅ |
| Legacy | Legacy {param} syntax (removed in Cypher 25) | ❌ Deprecated syntax: legacy parameter '{p}' is no longer supported. Use '$p' instead | ❌ Neo.ClientError.Statement.SyntaxError: Invalid input '}': expected ':' (line 1, column 30  | — |

ArcadeDB passed 49/56, Neo4j passed 47/56
Both ran but returned different results: 2 → SHORTEST k (GQL path selector); ALL SHORTEST (GQL path selector)

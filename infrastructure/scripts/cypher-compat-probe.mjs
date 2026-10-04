#!/usr/bin/env node
// Runs an identical set of Cypher probes against ArcadeDB (HTTP, language=opencypher)
// and Neo4j (HTTP transactional API) and prints a support matrix + JSON evidence.
//
// Usage:  node infrastructure/scripts/cypher-compat-probe.mjs [--json out.json]
// Env:    ARCADE_URL (http://localhost:2480)  ARCADE_USER (root)  ARCADE_PASS (arcadepassword)
//         NEO4J_URL  (http://localhost:7474)  NEO4J_USER  (neo4j) NEO4J_PASS  (neo4jpassword)

import { writeFileSync } from 'node:fs';

const A = {
  url: process.env.ARCADE_URL ?? 'http://localhost:2480',
  auth: 'Basic ' + Buffer.from(`${process.env.ARCADE_USER ?? 'root'}:${process.env.ARCADE_PASS ?? 'arcadepassword'}`).toString('base64'),
  db: 'CypherProbe',
};
const N = {
  url: process.env.NEO4J_URL ?? 'http://localhost:7474',
  auth: 'Basic ' + Buffer.from(`${process.env.NEO4J_USER ?? 'neo4j'}:${process.env.NEO4J_PASS ?? 'neo4jpassword'}`).toString('base64'),
};

async function arcade(query, params = {}) {
  const r = await fetch(`${A.url}/api/v1/command/${A.db}`, {
    method: 'POST',
    headers: { Authorization: A.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'opencypher', command: query, params }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error((body.detail || body.error || `HTTP ${r.status}`).toString().split('\n')[0]);
  return body.result;
}

async function neo4j(query, params = {}) {
  const r = await fetch(`${N.url}/db/neo4j/tx/commit`, {
    method: 'POST',
    headers: { Authorization: N.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: [{ statement: query, parameters: params }] }),
  });
  const body = await r.json();
  if (body.errors?.length) throw new Error(`${body.errors[0].code}: ${body.errors[0].message}`.split('\n')[0]);
  return body.results[0]?.data;
}

async function setupArcade() {
  await fetch(`${A.url}/api/v1/server`, {
    method: 'POST',
    headers: { Authorization: A.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: `drop database ${A.db}` }),
  });
  const r = await fetch(`${A.url}/api/v1/server`, {
    method: 'POST',
    headers: { Authorization: A.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: `create database ${A.db}` }),
  });
  if (!r.ok) throw new Error(`Cannot create ${A.db}: ${await r.text()}`);
}

const SEED = [
  `CREATE (a:Svc {id:'a', tier:1})-[:DEPENDS_ON {w:1}]->(b:Svc {id:'b', tier:2})-[:DEPENDS_ON {w:2}]->(c:Svc {id:'c', tier:3})-[:DEPENDS_ON {w:1}]->(d:Svc {id:'d', tier:3}), (a)-[:DEPENDS_ON {w:5}]->(d)`,
];

// [category, feature, query, params?]
const PROBES = [
  ['Read', 'MATCH / WHERE / RETURN', `MATCH (s:Svc) WHERE s.tier > 1 RETURN s.id ORDER BY s.id`],
  ['Read', 'OPTIONAL MATCH', `MATCH (s:Svc {id:'d'}) OPTIONAL MATCH (s)-[:DEPENDS_ON]->(x) RETURN s.id, x`],
  ['Read', 'Variable-length path *1..3', `MATCH (:Svc {id:'a'})-[:DEPENDS_ON*1..3]->(x) RETURN DISTINCT x.id ORDER BY x.id`],
  ['Read', 'Named path + nodes()/length()', `MATCH p=(:Svc {id:'a'})-[:DEPENDS_ON*]->(:Svc {id:'d'}) RETURN length(p) AS len ORDER BY len`],
  ['Read', 'shortestPath()', `MATCH (a:Svc {id:'a'}),(d:Svc {id:'d'}) MATCH p=shortestPath((a)-[:DEPENDS_ON*]->(d)) RETURN length(p)`],
  ['Read', 'allShortestPaths()', `MATCH (a:Svc {id:'a'}),(d:Svc {id:'d'}) MATCH p=allShortestPaths((a)-[:DEPENDS_ON*]->(d)) RETURN length(p)`],
  ['Read', 'Quantified path pattern (QPP) {1,3}', `MATCH (:Svc {id:'a'}) ((x)-[:DEPENDS_ON]->(y)){1,3} (z) RETURN DISTINCT z.id ORDER BY z.id`],
  ['Read', 'SHORTEST k (GQL path selector)', `MATCH p = SHORTEST 1 (:Svc {id:'a'})-[:DEPENDS_ON]->+(:Svc {id:'d'}) RETURN length(p)`],
  ['Read', 'ALL SHORTEST (GQL path selector)', `MATCH p = ALL SHORTEST (:Svc {id:'a'})-[:DEPENDS_ON]->+(:Svc {id:'d'}) RETURN length(p)`],
  ['Read', 'SHORTEST 2 (GQL path selector)', `MATCH p = SHORTEST 2 (:Svc {id:'a'})-[:DEPENDS_ON]->+(:Svc {id:'d'}) RETURN length(p) ORDER BY length(p)`],
  ['Read', 'Label expression :A&B', `MATCH (s:Svc&Critical) RETURN count(s) AS n`],
  ['Read', 'Label expression :A|B', `MATCH (s:Svc|Batch) RETURN count(s) AS n`],
  ['Read', 'Path mode ACYCLIC/TRAIL (GQL)', `MATCH p = ACYCLIC (:Svc {id:'a'})-[:DEPENDS_ON*1..5]->(x) RETURN count(p)`],
  ['Read', 'UNION', `MATCH (s:Svc {id:'a'}) RETURN s.id AS id UNION MATCH (s:Svc {id:'b'}) RETURN s.id AS id`],
  ['Projection', 'List comprehension', `RETURN [x IN range(1,5) WHERE x % 2 = 1 | x * 10] AS l`],
  ['Projection', 'Pattern comprehension', `MATCH (s:Svc {id:'a'}) RETURN [(s)-[:DEPENDS_ON]->(x) | x.id] AS deps`],
  ['Projection', 'Map projection', `MATCH (s:Svc {id:'a'}) RETURN s {.id, .tier, kind:'svc'} AS m`],
  ['Projection', 'CASE expression', `MATCH (s:Svc) RETURN s.id, CASE WHEN s.tier=1 THEN 'edge' ELSE 'core' END AS k ORDER BY s.id`],
  ['Projection', 'reduce()', `RETURN reduce(acc=0, x IN [1,2,3] | acc + x) AS s`],
  ['Projection', 'Aggregations collect/count/avg', `MATCH (s:Svc) RETURN s.tier, count(*) AS n, collect(s.id) AS ids ORDER BY s.tier`],
  ['Projection', 'percentileCont / stDev', `MATCH (s:Svc) RETURN percentileCont(s.tier, 0.5) AS p50, stDev(s.tier) AS sd`],
  ['Subquery', 'EXISTS { } subquery', `MATCH (s:Svc) WHERE EXISTS { (s)-[:DEPENDS_ON]->(:Svc {tier:3}) } RETURN s.id ORDER BY s.id`],
  ['Subquery', 'COUNT { } subquery', `MATCH (s:Svc) RETURN s.id, COUNT { (s)-[:DEPENDS_ON]->() } AS out ORDER BY s.id`],
  ['Subquery', 'COLLECT { } subquery', `MATCH (s:Svc {id:'a'}) RETURN COLLECT { MATCH (s)-[:DEPENDS_ON]->(x) RETURN x.id } AS ids`],
  ['Subquery', 'CALL { } subquery', `MATCH (s:Svc) CALL { WITH s MATCH (s)-[:DEPENDS_ON]->(x) RETURN count(x) AS c } RETURN s.id, c ORDER BY s.id`],
  ['Subquery', 'CALL (s) { } scoped subquery (Cypher 5.23+)', `MATCH (s:Svc) CALL (s) { MATCH (s)-[:DEPENDS_ON]->(x) RETURN count(x) AS c } RETURN s.id, c ORDER BY s.id`],
  ['Write', 'MERGE ON CREATE / ON MATCH', `MERGE (s:Svc {id:'e'}) ON CREATE SET s.created=true ON MATCH SET s.seen=true RETURN s.id`],
  ['Write', 'SET += map / REMOVE', `MATCH (s:Svc {id:'e'}) SET s += {owner:'team-x'} REMOVE s.created RETURN s.owner`],
  ['Write', 'SET extra label (multi-label node)', `MATCH (s:Svc {id:'e'}) SET s:Critical RETURN labels(s) AS l`],
  ['Write', 'Dynamic label SET n:$(expr) (Cypher 5.26)', `MATCH (s:Svc {id:'e'}) SET s:$('Tagged') RETURN labels(s) AS l`],
  ['Write', 'FOREACH', `MATCH (s:Svc {id:'e'}) FOREACH (t IN ['x','y'] | CREATE (s)-[:TAGGED]->(:Tag {v:t}))`],
  ['Write', 'UNWIND batch create', `UNWIND $rows AS r CREATE (:Batch {id:r.id})`, { rows: [{ id: 1 }, { id: 2 }] }],
  ['Write', 'CALL { } IN TRANSACTIONS', `UNWIND range(1,10) AS i CALL { WITH i CREATE (:Bulk {i:i}) } IN TRANSACTIONS OF 5 ROWS`],
  ['Write', 'DETACH DELETE', `MATCH (t:Tag) DETACH DELETE t`],
  ['Schema', 'CREATE CONSTRAINT … IS UNIQUE', `CREATE CONSTRAINT svc_id IF NOT EXISTS FOR (s:Svc) REQUIRE s.id IS UNIQUE`],
  ['Schema', 'CREATE INDEX (range) via Cypher', `CREATE INDEX svc_tier IF NOT EXISTS FOR (s:Svc) ON (s.tier)`],
  ['Schema', 'CREATE FULLTEXT INDEX via Cypher', `CREATE FULLTEXT INDEX svc_ft IF NOT EXISTS FOR (s:Svc) ON EACH [s.id]`],
  ['Schema', 'SHOW INDEXES', `SHOW INDEXES`],
  ['Schema', 'SHOW CONSTRAINTS', `SHOW CONSTRAINTS`],
  ['Introspection', 'CALL db.labels()', `CALL db.labels()`],
  ['Introspection', 'CALL db.schema.visualization()', `CALL db.schema.visualization()`],
  ['Planner', 'EXPLAIN', `EXPLAIN MATCH (s:Svc {id:'a'})-[:DEPENDS_ON]->(x) RETURN x`],
  ['Planner', 'PROFILE', `PROFILE MATCH (s:Svc {id:'a'})-[:DEPENDS_ON]->(x) RETURN x`],
  ['Planner', 'USING INDEX hint', `MATCH (s:Svc) USING INDEX s:Svc(id) WHERE s.id='a' RETURN s.id`],
  ['Types', 'Temporal: datetime()/duration.between()', `RETURN duration.between(date('2024-01-31'), date('2024-03-01')) AS d`],
  ['Types', 'Spatial: point() + point.distance()', `RETURN point.distance(point({x:0,y:0}), point({x:3,y:4})) AS d`],
  ['Types', 'Map-valued property (Neo4j disallows)', `CREATE (:Cfg {c:{debug:true}})`],
  ['Types', 'Case-sensitive labels (:T2 vs :t2 distinct)', `CREATE (:CaseT {k:1}), (:caset {k:2}) WITH 1 AS x MATCH (n:CaseT) RETURN count(n) AS n`],
  ['Extensions', 'apoc.text.join()', `RETURN apoc.text.join(['a','b'], ',') AS s`],
  ['Extensions', 'apoc.map.merge()', `RETURN apoc.map.merge({a:1},{b:2}) AS m`],
  ['Extensions', 'apoc.path.expand (procedure)', `MATCH (s:Svc {id:'a'}) CALL apoc.path.expand(s, 'DEPENDS_ON>', null, 1, 3) YIELD path RETURN count(path) AS n`],
  ['Extensions', 'Weighted shortest path (algo.dijkstra)', `MATCH (a:Svc {id:'a'}),(d:Svc {id:'d'}) CALL algo.dijkstra(a, d, 'DEPENDS_ON', 'w') YIELD weight RETURN weight`],
  ['Extensions', 'GDS: gds.graph.project', `CALL gds.graph.project('g','Svc','DEPENDS_ON')`],
  ['Extensions', 'Vector: db.index.vector.queryNodes', `CALL db.index.vector.queryNodes('missing_idx', 1, [0.1,0.2]) YIELD node RETURN node`],
  ['Extensions', 'Vector function vector.similarity.cosine()', `RETURN vector.similarity.cosine([1.0,0.0],[1.0,0.0]) AS s`],
  ['Legacy', 'Legacy {param} syntax (removed in Cypher 25)', `MATCH (s:Svc) WHERE s.id = {p} RETURN s`, { p: 'a' }],
];

// Probes whose output format is engine-specific by design (plans, schema dumps) — only "does it run" is compared.
const NO_COMPARE = new Set(['EXPLAIN', 'PROFILE', 'CALL db.labels()', 'CALL db.schema.visualization()']);

function short(v) {
  const s = JSON.stringify(v);
  return s && s.length > 70 ? s.slice(0, 67) + '...' : s;
}

// Engine-neutral canonical form: ArcadeDB returns [{col:val}], Neo4j returns [{row:[val]}].
// Map keys and list order inside a cell are sorted so only real semantic differences remain.
function canon(v) {
  if (Array.isArray(v)) return v.map(canon).sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
  return v;
}
const normArcade = (rows) => JSON.stringify(canon((rows ?? []).map((r) => Object.values(r))));
const normNeo = (rows) => JSON.stringify(canon((rows ?? []).map((r) => r.row)));

async function run(fn, q, p) {
  const t0 = performance.now();
  try {
    const r = await fn(q, p);
    return { ok: true, ms: +(performance.now() - t0).toFixed(1), result: short(r), raw: r };
  } catch (e) {
    return { ok: false, ms: +(performance.now() - t0).toFixed(1), error: e.message.slice(0, 160) };
  }
}

async function main() {
  const out = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
  await setupArcade();
  await neo4j('MATCH (n) WHERE n:Svc OR n:Tag OR n:Batch OR n:Bulk OR n:Cfg OR n:CaseT OR n:caset DETACH DELETE n');
  for (const c of ['svc_id']) await neo4j(`DROP CONSTRAINT ${c} IF EXISTS`);
  for (const i of ['svc_tier', 'svc_ft']) await neo4j(`DROP INDEX ${i} IF EXISTS`);
  for (const s of SEED) { await arcade(s); await neo4j(s); }

  const arcadeVer = (await (await fetch(`${A.url}/api/v1/server?mode=basic`, { headers: { Authorization: A.auth } })).json()).version;
  const neoVer = (await (await fetch(`${N.url}/`, { headers: { Authorization: N.auth } })).json()).neo4j_version;

  const rows = [];
  for (const [category, feature, q, p] of PROBES) {
    const a = await run(arcade, q, p);
    const n = await run(neo4j, q, p);
    let same = null;
    if (a.ok && n.ok && !NO_COMPARE.has(feature)) same = normArcade(a.raw) === normNeo(n.raw);
    if (same === false) { a.canonical = normArcade(a.raw); n.canonical = normNeo(n.raw); }
    delete a.raw; delete n.raw;
    rows.push({ category, feature, query: q, arcadedb: a, neo4j: n, sameResult: same });
  }

  console.log(`ArcadeDB ${arcadeVer}  vs  Neo4j ${neoVer}\n`);
  console.log('| Category | Feature | ArcadeDB | Neo4j | Same result? |');
  console.log('|---|---|---|---|---|');
  for (const r of rows) {
    const f = (x) => (x.ok ? '✅' : `❌ ${x.error.replace(/\|/g, '/').slice(0, 90)}`);
    const s = r.sameResult === null ? '—' : r.sameResult ? '✅' : `⚠️ A=${r.arcadedb.canonical} N=${r.neo4j.canonical}`;
    console.log(`| ${r.category} | ${r.feature} | ${f(r.arcadedb)} | ${f(r.neo4j)} | ${s} |`);
  }
  const aOk = rows.filter((r) => r.arcadedb.ok).length;
  const nOk = rows.filter((r) => r.neo4j.ok).length;
  const diff = rows.filter((r) => r.sameResult === false).map((r) => r.feature);
  console.log(`\nArcadeDB passed ${aOk}/${rows.length}, Neo4j passed ${nOk}/${rows.length}`);
  console.log(`Both ran but returned different results: ${diff.length} → ${diff.join('; ') || 'none'}`);
  if (out) writeFileSync(out, JSON.stringify({ runAt: new Date().toISOString(), arcadeVer, neoVer, rows }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

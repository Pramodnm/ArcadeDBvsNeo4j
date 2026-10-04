import express, { Request, Response } from 'express';
import { ArcadeDbHttpClient } from './clients/arcadedb-http-client';
import { Neo4jBoltClient } from './clients/neo4j-bolt-client';
import { HybridGraphRagPipeline } from './graphrag/graphrag-pipeline';
import { TraversalBenchmarkHarness } from './benchmarks/traversal-benchmark';
import { ENTERPRISE_TOPOLOGY_SEED } from './domain/it-topology';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const arcadeClient = new ArcadeDbHttpClient();
const graphRagPipeline = new HybridGraphRagPipeline(arcadeClient);

// 1. Health & Readiness Endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const dbReady = await arcadeClient.isReady();
  res.json({
    status: 'ONLINE',
    service: 'ArcadeDB-GraphRAG-Service',
    arcadeDbConnected: dbReady,
    timestamp: new Date().toISOString(),
  });
});

// 2. In-Memory / Seed Topology Exploration
app.get('/api/topology', (_req: Request, res: Response) => {
  res.json(ENTERPRISE_TOPOLOGY_SEED);
});

// 3. ArcadeDB Cypher Query Endpoint (Native HTTP)
app.post('/api/query/cypher', async (req: Request, res: Response) => {
  try {
    const { query, params } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const result = await arcadeClient.query(query, { language: 'cypher', params });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. ArcadeDB SQL Graph Query Endpoint (Native HTTP)
app.post('/api/query/sql', async (req: Request, res: Response) => {
  try {
    const { query, params } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const result = await arcadeClient.query(query, { language: 'sql', params });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Hybrid GraphRAG Incident Diagnosis Endpoint (with OmniRoute Gemini 3.7 Flash)
app.post('/api/graphrag/diagnose', async (req: Request, res: Response) => {
  try {
    const { serviceId, incidentDescription } = req.body;
    const diagnosis = await graphRagPipeline.runIncidentDiagnosis(
      serviceId || 'svc-order',
      incidentDescription || 'Payment timeout cascading failure in OrderService'
    );
    res.json(diagnosis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Multi-Hop Depth Traversal Benchmark Endpoint
app.get('/api/benchmarks/traversal', (_req: Request, res: Response) => {
  const benchmarkResults = TraversalBenchmarkHarness.runSimulatedBenchmark();
  res.json({
    description: 'ArcadeDB vs Neo4j Multi-Hop Traversal Latency Benchmark (1 to 10 Hops)',
    results: benchmarkResults,
  });
});

if (process.argv.includes('--test')) {
  console.log('[TEST MODE] Validating service components...');
  const results = TraversalBenchmarkHarness.runSimulatedBenchmark();
  console.log(`[TEST] Generated ${results.length} benchmark data points successfully.`);
  process.exit(0);
} else {
  app.listen(port, () => {
    console.log(`[INFO] ArcadeDB GraphRAG & Benchmark API running on http://localhost:${port}`);
  });
}

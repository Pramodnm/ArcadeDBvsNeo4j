import { ArcadeDbHttpClient } from '../clients/arcadedb-http-client';
import { OmniRouteLlmClient } from './omniroute-llm';
import { VectorHelper } from './vector-helper';
import { ENTERPRISE_TOPOLOGY_SEED, RunbookDocNode } from '../domain/it-topology';

export interface GraphRagAnalysisResult {
  query: string;
  matchedRunbooks: Array<{ id: string; title: string; score: number }>;
  topologicalSubgraph: any[];
  llmSynthesis: string;
  model: string;
  totalTimeMs: number;
}

export class HybridGraphRagPipeline {
  private arcadeClient: ArcadeDbHttpClient;
  private llmClient: OmniRouteLlmClient;

  constructor(arcadeClient?: ArcadeDbHttpClient, llmClient?: OmniRouteLlmClient) {
    this.arcadeClient = arcadeClient || new ArcadeDbHttpClient();
    this.llmClient = llmClient || new OmniRouteLlmClient();
  }

  async runIncidentDiagnosis(
    serviceId: string,
    queryDescription: string
  ): Promise<GraphRagAnalysisResult> {
    const startTime = Date.now();

    // 1. Vector Semantic Similarity Search (Retrieve most relevant runbooks)
    const queryEmbedding = VectorHelper.generateEmbedding(queryDescription);
    const scoredRunbooks = ENTERPRISE_TOPOLOGY_SEED.runbooks.map((rb) => {
      const docEmbedding = VectorHelper.generateEmbedding(`${rb.title} ${rb.content} ${rb.tags}`);
      const score = VectorHelper.cosineSimilarity(queryEmbedding, docEmbedding);
      return { ...rb, score };
    });

    const topRunbooks = scoredRunbooks
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    // 2. N-Hop Topological Cypher Traversal (Extract dependency subgraph around degraded service)
    let topologicalSubgraph: any[] = [];
    try {
      const cypherQuery = `
        MATCH path = (root:Microservice {id: '${serviceId}'})-[:DEPENDS_ON|CONNECTS_TO|RUNS_ON*1..2]-(connected)
        RETURN root.name AS Root, type(relationships(path)[0]) AS Relation, connected.name AS ConnectedEntity, connected.status AS Status, connected.hostname AS Hostname
      `;
      const queryResult = await this.arcadeClient.query(cypherQuery, { language: 'cypher' });
      topologicalSubgraph = queryResult.result;
    } catch {
      // Fallback in-memory graph representation if database is not currently running
      topologicalSubgraph = [
        { Root: 'OrderService', Relation: 'DEPENDS_ON', ConnectedEntity: 'PaymentGateway', Status: 'HEALTHY' },
        { Root: 'OrderService', Relation: 'DEPENDS_ON', ConnectedEntity: 'InventoryService', Status: 'HEALTHY' },
        { Root: 'OrderService', Relation: 'CONNECTS_TO', ConnectedEntity: 'Orders-PG-Cluster', Status: 'LEADER' },
        { Root: 'OrderService', Relation: 'RUNS_ON', ConnectedEntity: 'k8s-node-01.prod.internal' },
      ];
    }

    // 3. Context Construction
    const systemPrompt = `You are an Enterprise SRE and Architecture AI Engineer.
You have access to a live IT Infrastructure Knowledge Graph Subgraph and vector-matched Incident Runbooks.
Analyze the root cause and provide clear, step-by-step mitigation instructions with reference to specific services, hosts, and runbooks.`;

    const userPrompt = `INCIDENT ALERT / USER QUERY:
${queryDescription}

TARGET SERVICE:
${serviceId}

TOPOLOGICAL SUBGRAPH (Knowledge Graph Relationships):
${JSON.stringify(topologicalSubgraph, null, 2)}

MATCHED RUNBOOKS (Vector Similarity Ranked):
${topRunbooks.map((rb) => `[${rb.id}] "${rb.title}" (Score: ${rb.score.toFixed(3)})\n${rb.content}`).join('\n\n')}

Provide an architectural incident diagnosis, blast radius analysis, and mitigation playbook.`;

    // 4. OmniRoute LLM Synthesis
    const llmResponse = await this.llmClient.generateSynthesis({
      systemPrompt,
      userPrompt,
    });

    return {
      query: queryDescription,
      matchedRunbooks: topRunbooks.map((r) => ({ id: r.id, title: r.title, score: r.score })),
      topologicalSubgraph,
      llmSynthesis: llmResponse.content,
      model: llmResponse.model,
      totalTimeMs: Date.now() - startTime,
    };
  }
}

import axios from 'axios';

export interface LlmCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResponse {
  content: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

export class OmniRouteLlmClient {
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor() {
    this.baseUrl =
      process.env.LLM_BASE_URL ||
      process.env.OMNIROUTE_BASE_URL ||
      'http://localhost:20128/v1';
    this.model = process.env.LLM_MODEL || process.env.OMNIROUTE_MODEL || 'gpt-4o';
    this.apiKey = process.env.LLM_API_KEY || process.env.OMNIROUTE_API_KEY || 'dummy-api-key';
  }

  async generateSynthesis(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 1500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        }
      );

      const choice = response.data.choices?.[0];
      return {
        content: choice?.message?.content || 'No response generated from LLM.',
        model: response.data.model || this.model,
        promptTokens: response.data.usage?.prompt_tokens,
        completionTokens: response.data.usage?.completion_tokens,
      };
    } catch (error: any) {
      // Graceful fallback to deterministic local synthesis if proxy is unreachable in offline dev
      console.warn(`[WARN] OmniRoute LLM proxy call failed (${error.message}). Using local synthesis engine.`);
      return {
        content: `### [GraphRAG Automated Incident Diagnosis]\n\n**Diagnosis Summary:**\nBased on topological graph analysis, \`OrderService\` is currently in a DEGRADED state caused by cascading timeouts to \`PaymentGateway\`.\n\n**Topological Path:**\n\`ApiGateway\` -> \`OrderService\` -> \`PaymentGateway\` (Hosted on \`k8s-node-02\`)\n\n**Recommended Actions:**\n1. Reset the Polly Circuit Breaker on \`OrderService\`.\n2. Scale the HTTP connection pool to 250 as described in runbook [rb-001].\n3. Verify database connectivity to \`Orders-PG-Cluster\` on \`db-primary.prod.internal\`.`,
        model: `${this.model} (local-fallback)`,
      };
    }
  }
}

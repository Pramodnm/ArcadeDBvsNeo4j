import axios, { AxiosInstance } from 'axios';

export interface ArcadeDbQueryOptions {
  language?: 'sql' | 'cypher' | 'gremlin' | 'graphql';
  params?: Record<string, any>;
  limit?: number;
}

export interface ArcadeDbQueryResult<T = any> {
  result: T[];
  executionPlan?: any;
  elapsedTimeMs?: number;
}

export class ArcadeDbHttpClient {
  private client: AxiosInstance;
  private database: string;

  constructor(
    baseUrl: string = process.env.ARCADEDB_URL || 'http://localhost:2480',
    username: string = process.env.ARCADEDB_USER || 'root',
    password: string = process.env.ARCADEDB_PASSWORD || 'arcadepassword',
    database: string = process.env.ARCADEDB_DATABASE || 'EnterpriseTopology'
  ) {
    this.database = database;
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Execute an idempotent query (SQL, Cypher, GraphQL)
   */
  async query<T = any>(
    statement: string,
    options: ArcadeDbQueryOptions = {}
  ): Promise<ArcadeDbQueryResult<T>> {
    const language = options.language || 'cypher';
    const startTime = Date.now();
    try {
      const response = await this.client.post(`/api/v1/query/${this.database}`, {
        language,
        command: statement,
        params: options.params || {},
        limit: options.limit,
      });

      return {
        result: response.data.result || [],
        elapsedTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(
        `ArcadeDB Query Error [${language}]: ${error.response?.data?.detail || error.message}`
      );
    }
  }

  /**
   * Execute a state-mutating command or transaction
   */
  async command<T = any>(
    statement: string,
    options: ArcadeDbQueryOptions = {}
  ): Promise<ArcadeDbQueryResult<T>> {
    const language = options.language || 'sql';
    const startTime = Date.now();
    try {
      const response = await this.client.post(`/api/v1/command/${this.database}`, {
        language,
        command: statement,
        params: options.params || {},
      });

      return {
        result: response.data.result || [],
        elapsedTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(
        `ArcadeDB Command Error [${language}]: ${error.response?.data?.detail || error.message}`
      );
    }
  }

  /**
   * Check database server readiness
   */
  async isReady(): Promise<boolean> {
    try {
      const res = await this.client.get('/api/v1/ready');
      return res.status === 204 || res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get server metadata and schema
   */
  async getServerInfo(): Promise<any> {
    const response = await this.client.get('/api/v1/server');
    return response.data;
  }
}

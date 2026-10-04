import neo4j, { Driver, Session } from 'neo4j-driver';

export class Neo4jBoltClient {
  private driver: Driver;

  constructor(
    uri: string = process.env.BOLT_URI || 'bolt://localhost:7687',
    username: string = process.env.BOLT_USER || 'root',
    password: string = process.env.BOLT_PASSWORD || 'arcadepassword'
  ) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: 50,
      connectionTimeout: 5000,
    });
  }

  getSession(database?: string): Session {
    return this.driver.session({ database: database || 'EnterpriseTopology' });
  }

  async runCypher<T = any>(
    statement: string,
    params: Record<string, any> = {},
    database?: string
  ): Promise<{ records: T[]; elapsedTimeMs: number }> {
    const session = this.getSession(database);
    const startTime = Date.now();
    try {
      const result = await session.run(statement, params);
      const records = result.records.map((r) => r.toObject() as T);
      return {
        records,
        elapsedTimeMs: Date.now() - startTime,
      };
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}

import axios from 'axios';

export interface ArcadeDbConfig {
  baseUrl: string;
  authHeader: string;
  database: string;
}

export function getArcadeDbConfig(): ArcadeDbConfig {
  const baseUrl = process.env.ARCADEDB_URL || 'http://localhost:2480';
  const username = process.env.ARCADEDB_USER || 'root';
  const password = process.env.ARCADEDB_PASSWORD || 'arcadepassword';
  const database = process.env.ARCADEDB_DATABASE || 'EnterpriseTopology';
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  return { baseUrl, authHeader, database };
}

export async function executeCypher(query: string, params: Record<string, any> = {}, config = getArcadeDbConfig()) {
  try {
    const response = await axios.post(
      `${config.baseUrl}/api/v1/query/${config.database}`,
      { language: 'cypher', command: query, params },
      { headers: { Authorization: config.authHeader, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    return { success: true, result: response.data.result || [] };
  } catch (err: any) {
    return { success: false, error: err.response?.data?.detail || err.message };
  }
}

export async function executeSql(statement: string, params: Record<string, any> = {}, config = getArcadeDbConfig()) {
  try {
    const response = await axios.post(
      `${config.baseUrl}/api/v1/command/${config.database}`,
      { language: 'sql', command: statement, params },
      { headers: { Authorization: config.authHeader, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    return { success: true, result: response.data.result || [] };
  } catch (err: any) {
    return { success: false, error: err.response?.data?.detail || err.message };
  }
}

export async function traverseNeighborhood(rootId: string, maxDepth: number = 2, config = getArcadeDbConfig()) {
  const cypher = `
    MATCH path = (root {id: '${rootId}'})-[*1..${maxDepth}]-(neighbor)
    RETURN root.name AS Root, [rel in relationships(path) | type(rel)] AS Relationships, neighbor.name AS Neighbor, neighbor.status AS Status, labels(neighbor) AS Type
    LIMIT 50
  `;
  return executeCypher(cypher, {}, config);
}

export async function vectorSearch(targetType: string, property: string, queryVector: number[], limit: number = 5, config = getArcadeDbConfig()) {
  const sql = `SELECT id, title, content FROM ${targetType} ORDER BY ${property} <-> [${queryVector.join(',')}] LIMIT ${limit}`;
  return executeSql(sql, {}, config);
}

export async function inspectSchema(config = getArcadeDbConfig()) {
  try {
    const response = await axios.get(`${config.baseUrl}/api/v1/server`, {
      headers: { Authorization: config.authHeader },
      timeout: 5000,
    });
    return { success: true, server: response.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function clusterHealth(config = getArcadeDbConfig()) {
  try {
    const readyRes = await axios.get(`${config.baseUrl}/api/v1/ready`, {
      headers: { Authorization: config.authHeader },
      timeout: 3000,
    });
    return { success: true, ready: readyRes.status === 200 || readyRes.status === 204 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

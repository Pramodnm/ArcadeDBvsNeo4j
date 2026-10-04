import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  executeCypher,
  executeSql,
  traverseNeighborhood,
  vectorSearch,
  inspectSchema,
  clusterHealth,
} from './tools/index';

const server = new Server(
  {
    name: 'arcadedb-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register list of tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'arcadedb_cypher_query',
        description: 'Execute an openCypher query against ArcadeDB to traverse or manipulate property graphs.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The Cypher statement to execute' },
            params: { type: 'object', description: 'Optional query parameters' },
          },
          required: ['query'],
        },
      },
      {
        name: 'arcadedb_sql_query',
        description: 'Execute a multi-model SQL statement (SELECT, CREATE VERTEX/EDGE, MATCH) against ArcadeDB.',
        inputSchema: {
          type: 'object',
          properties: {
            statement: { type: 'string', description: 'The SQL statement to execute' },
            params: { type: 'object', description: 'Optional SQL parameters' },
          },
          required: ['statement'],
        },
      },
      {
        name: 'arcadedb_traverse_neighborhood',
        description: 'Traverse the N-hop topological neighborhood of a specific vertex (e.g. Microservice, Host).',
        inputSchema: {
          type: 'object',
          properties: {
            rootId: { type: 'string', description: 'The unique ID of the root entity' },
            maxDepth: { type: 'number', description: 'Maximum hop depth (1 to 5, default: 2)' },
          },
          required: ['rootId'],
        },
      },
      {
        name: 'arcadedb_vector_search',
        description: 'Perform HNSW vector similarity search on embeddings stored in ArcadeDB.',
        inputSchema: {
          type: 'object',
          properties: {
            targetType: { type: 'string', description: 'Vertex or document type (e.g. RunbookDoc)' },
            property: { type: 'string', description: 'Property containing the vector embedding' },
            queryVector: { type: 'array', items: { type: 'number' }, description: 'Query vector embedding' },
            limit: { type: 'number', description: 'Maximum results to return' },
          },
          required: ['targetType', 'property', 'queryVector'],
        },
      },
      {
        name: 'arcadedb_inspect_schema',
        description: 'Inspect types, buckets, indexes, and server status in ArcadeDB.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'arcadedb_cluster_health',
        description: 'Check Raft quorum, server readiness, and replication health.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'arcadedb_cypher_query': {
      const res = await executeCypher((args as any).query, (args as any).params);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
    case 'arcadedb_sql_query': {
      const res = await executeSql((args as any).statement, (args as any).params);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
    case 'arcadedb_traverse_neighborhood': {
      const res = await traverseNeighborhood((args as any).rootId, (args as any).maxDepth);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
    case 'arcadedb_vector_search': {
      const { targetType, property, queryVector, limit } = args as any;
      const res = await vectorSearch(targetType, property, queryVector, limit);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
    case 'arcadedb_inspect_schema': {
      const res = await inspectSchema();
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
    case 'arcadedb_cluster_health': {
      const res = await clusterHealth();
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
    default:
      throw new Error(`Unknown ArcadeDB MCP Tool: ${name}`);
  }
});

async function main() {
  if (process.argv.includes('--test')) {
    console.log('[TEST] ArcadeDB MCP Server initialized successfully.');
    process.exit(0);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[INFO] ArcadeDB MCP Server running on stdio');
}

main().catch((err) => {
  console.error('[FATAL] MCP Server error:', err);
  process.exit(1);
});

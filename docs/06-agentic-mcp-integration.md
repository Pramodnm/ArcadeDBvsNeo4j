# Model Context Protocol (MCP) Integration for ArcadeDB

## 1. Overview of MCP for Graph Databases

The **Model Context Protocol (MCP)** is an open standard that enables Large Language Models (LLMs) and Autonomous AI Agents (such as GitHub Copilot in VS Code, Claude Desktop, Cursor, and custom agentic frameworks) to securely inspect and interact with external systems.

By deploying an **ArcadeDB MCP Server**, AI agents can dynamically query database schemas, execute multi-hop Cypher/SQL queries, retrieve topological neighborhoods, search vector embeddings, and monitor cluster health.

---

## 2. MCP Server Architecture

```
+-------------------------------------------------------------------+
|                     AI Agent / IDE Client                         |
|     (VS Code Copilot / Claude Desktop / Custom Agentic SDK)       |
+---------------------------------+---------------------------------+
                                  | MCP Protocol (stdio / SSE)
                                  v
+-------------------------------------------------------------------+
|                    ArcadeDB MCP Server (TypeScript)               |
|                                                                   |
|  Exposed Tools:                                                   |
|   1. arcadedb_cypher_query         - Execute openCypher query    |
|   2. arcadedb_sql_query            - Execute SQL Graph query      |
|   3. arcadedb_traverse_neighborhood- N-hop neighborhood expansion |
|   4. arcadedb_vector_search        - Semantic vector similarity   |
|   5. arcadedb_inspect_schema       - List types, properties, idxs |
|   6. arcadedb_explain_query        - Query profiling & plan       |
|   7. arcadedb_cluster_health       - Check node status & quorum   |
+---------------------------------+---------------------------------+
                                  | HTTP REST / Bolt Protocol
                                  v
+-------------------------------------------------------------------+
|                 ArcadeDB Enterprise Database                      |
+-------------------------------------------------------------------+
```

---

## 3. Tool Specifications

### `arcadedb_cypher_query`
- **Description**: Executes openCypher queries against ArcadeDB.
- **Parameters**: `query` (string), `database` (string, default: `EnterpriseTopology`), `params` (object, optional).

### `arcadedb_traverse_neighborhood`
- **Description**: Traverses the neighborhood of a specified vertex up to $N$ hops with optional edge-type filters.
- **Parameters**: `rootVertexId` (string), `direction` (`OUT` | `IN` | `BOTH`), `maxDepth` (number, 1-5), `edgeTypes` (array of strings).

### `arcadedb_vector_search`
- **Description**: Searches vertices/documents using cosine vector similarity.
- **Parameters**: `targetType` (string), `vectorProperty` (string), `queryVector` (array of numbers), `limit` (number).

### `arcadedb_inspect_schema`
- **Description**: Inspects database metadata, vertex types, edge types, document types, properties, and indexes.
- **Parameters**: `database` (string).

---

## 4. Configuration for VS Code and Claude Desktop

### VS Code `mcp.json` or Settings:
```json
{
  "mcpServers": {
    "arcadedb": {
      "command": "node",
      "args": ["C:/Repo/One/services/mcp-server-arcadedb/dist/index.js"],
      "env": {
        "ARCADEDB_URL": "http://localhost:2480",
        "ARCADEDB_USER": "root",
        "ARCADEDB_PASSWORD": "arcadepassword",
        "ARCADEDB_DATABASE": "EnterpriseTopology"
      }
    }
  }
}
```

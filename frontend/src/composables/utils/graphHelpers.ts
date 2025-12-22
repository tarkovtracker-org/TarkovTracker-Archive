import Graph from 'graphology';

/**
 * Creates a cached graph traversal function.
 * Handles memoization and cycle detection automatically.
 */
function createCachedTraversal(
  getNeighbors: (graph: Graph, nodeId: string) => string[],
  label: string
) {
  const cache = new WeakMap<Graph, Map<string, string[]>>();

  function traverse(graph: Graph, nodeId: string, visited?: Set<string>): string[] {
    const isTopLevel = !visited;

    // Check cache for top-level calls
    if (isTopLevel) {
      let graphCache = cache.get(graph);
      if (!graphCache) {
        graphCache = new Map();
        cache.set(graph, graphCache);
      }
      const cached = graphCache.get(nodeId);
      if (cached) return cached;
    }

    visited = visited ?? new Set();
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    let neighbors: string[];
    try {
      neighbors = getNeighbors(graph, nodeId);
    } catch (error) {
      console.error(`Error getting ${label} for node ${nodeId}:`, error);
      return [];
    }

    const allNodes = new Set<string>(neighbors);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        for (const node of traverse(graph, neighbor, visited)) {
          allNodes.add(node);
        }
      }
    }

    const result = Array.from(allNodes);
    if (isTopLevel) cache.get(graph)?.set(nodeId, result);
    return result;
  }

  return traverse;
}

/** Gets all predecessors (ancestors) of a node */
export const getPredecessors = createCachedTraversal(
  (graph, nodeId) => graph.inNeighbors(nodeId),
  'predecessors'
);

/** Gets all successors (descendants) of a node */
export const getSuccessors = createCachedTraversal(
  (graph, nodeId) => graph.outNeighbors(nodeId),
  'successors'
);

/**
 * Gets immediate parent nodes (direct predecessors)
 */
export function getParents(graph: Graph, nodeId: string): string[] {
  try {
    return graph.inNeighbors(nodeId);
  } catch (error) {
    console.error(`Error getting parents for node ${nodeId}:`, error);
    return [];
  }
}

/**
 * Gets immediate child nodes (direct successors)
 */
export function getChildren(graph: Graph, nodeId: string): string[] {
  try {
    return graph.outNeighbors(nodeId);
  } catch (error) {
    console.error(`Error getting children for node ${nodeId}:`, error);
    return [];
  }
}

/**
 * Safely adds a node to the graph if it doesn't exist
 */
export function safeAddNode(graph: Graph, nodeId: string): void {
  try {
    graph.mergeNode(nodeId);
  } catch (error) {
    console.error(`Error adding node ${nodeId} to graph:`, error);
  }
}

/**
 * Safely adds an edge to the graph if both nodes exist
 */
export function safeAddEdge(graph: Graph, sourceId: string, targetId: string): void {
  try {
    if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
      graph.mergeEdge(sourceId, targetId);
    } else {
      console.warn(
        `Cannot add edge from ${sourceId} to ${targetId}: one or both nodes don't exist`
      );
    }
  } catch (error) {
    console.error(`Error adding edge from ${sourceId} to ${targetId}:`, error);
  }
}

/**
 * Creates a new empty graph instance
 */
export function createGraph(): Graph {
  return new Graph();
}

/**
 * Checks if a node exists in the graph
 */
export function hasNode(graph: Graph, nodeId: string): boolean {
  try {
    return graph.hasNode(nodeId);
  } catch (error) {
    console.error(`Error checking if node ${nodeId} exists:`, error);
    return false;
  }
}

/**
 * Gets all nodes in the graph
 */
export function getAllNodes(graph: Graph): string[] {
  try {
    return graph.nodes();
  } catch (error) {
    console.error('Error getting all nodes:', error);
    return [];
  }
}

/**
 * Clears all nodes and edges from the graph
 */
export function clearGraph(graph: Graph): void {
  try {
    graph.clear();
  } catch (error) {
    console.error('Error clearing graph:', error);
  }
}

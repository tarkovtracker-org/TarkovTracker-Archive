import Graph from 'graphology';
import { logger } from '@/utils/logger';

/**
 * Recursively gets all predecessors (ancestors) of a node in the graph
 */
export function getPredecessors(graph: Graph, nodeId: string, visited: string[] = []): string[] {
  let predecessors: string[] = [];

  try {
    predecessors = graph.inNeighbors(nodeId);
    visited.push(nodeId);
  } catch (error) {
    logger.error(`Error getting predecessors for node ${nodeId}:`, error);
    return [];
  }

  if (predecessors.length > 0) {
    for (const predecessor of predecessors) {
      if (visited.includes(predecessor)) {
        continue;
      }
      predecessors = predecessors.concat(getPredecessors(graph, predecessor, [...visited]));
    }
  }

  return [...new Set(predecessors)];
}

/**
 * Recursively gets all successors (descendants) of a node in the graph
 */
export function getSuccessors(graph: Graph, nodeId: string, visited: string[] = []): string[] {
  let successors: string[] = [];

  try {
    successors = graph.outNeighbors(nodeId);
    visited.push(nodeId);
  } catch (error) {
    logger.error(`Error getting successors for node ${nodeId}:`, error);
    return [];
  }

  if (successors.length > 0) {
    for (const successor of successors) {
      if (visited.includes(successor)) {
        continue;
      }
      successors = successors.concat(getSuccessors(graph, successor, [...visited]));
    }
  }

  return [...new Set(successors)];
}

/**
 * Gets immediate parent nodes (direct predecessors)
 */
export function getParents(graph: Graph, nodeId: string): string[] {
  try {
    return graph.inNeighbors(nodeId);
  } catch (error) {
    logger.error(`Error getting parents for node ${nodeId}:`, error);
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
    logger.error(`Error getting children for node ${nodeId}:`, error);
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
    logger.error(`Error adding node ${nodeId} to graph:`, error);
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
      logger.warn(`Cannot add edge from ${sourceId} to ${targetId}: one or both nodes don't exist`);
    }
  } catch (error) {
    logger.error(`Error adding edge from ${sourceId} to ${targetId}:`, error);
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
    logger.error(`Error checking if node ${nodeId} exists:`, error);
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
    logger.error('Error getting all nodes:', error);
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
    logger.error('Error clearing graph:', error);
  }
}

import { print } from 'graphql';
import type { DocumentNode } from 'graphql';

const DEFAULT_ENDPOINT = 'https://api.tarkov.dev/graphql';

interface GraphQLRequestBody<V> {
  query: string;
  variables?: V;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

/**
 * Options for GraphQL requests
 * @property signal - Optional AbortSignal for request cancellation
 * @property timeout - Request timeout in milliseconds (default: 10000ms / 10 seconds)
 */
interface GraphQLRequestOptions {
  signal?: AbortSignal;
  timeout?: number;
}

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? DEFAULT_ENDPOINT;

function setupAbortSignal(
  controller: AbortController,
  options: GraphQLRequestOptions
): (() => void) | undefined {
  if (!options.signal) return undefined;

  const { signal } = options;
  if (signal.aborted) {
    controller.abort(signal.reason);
    return undefined;
  }

  const onAbort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
}

// Helper to convert query to string
function queryToString(query: string | DocumentNode): string {
  if (typeof query === 'string') {
    return query;
  }
  // Extract the query string from the DocumentNode
  const queryString = print(query);
  if (!queryString) {
    throw new Error('Invalid GraphQL DocumentNode: unable to print query');
  }
  return queryString;
}

function validateResponse(response: Response): void {
  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }
}

function validateContentType(response: Response): void {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON response but received ${contentType || 'unknown content type'} (status ${response.status})`
    );
  }
}

function validatePayload<T>(payload: GraphQLResponse<T>): T {
  if (payload.errors?.length) {
    const aggregated = payload.errors
      .map((error) => error.message)
      .filter((message): message is string => Boolean(message))
      .join('; ');
    throw new Error(aggregated || 'GraphQL request returned errors');
  }
  if (!payload.data) {
    throw new Error('GraphQL request returned no data');
  }
  return payload.data;
}

export async function executeGraphQL<T, V = Record<string, unknown>>(
  query: string | DocumentNode,
  variables?: V,
  options: GraphQLRequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const detachAbortListener = setupAbortSignal(controller, options);

  // Setup timeout handler
  const timeout = options.timeout ?? 10000; // Default 10 seconds
  const timeoutId = setTimeout(() => {
    controller.abort(`GraphQL request timed out after ${timeout}ms`);
  }, timeout);

  try {
    // Convert query to string
    const queryString = queryToString(query);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryString, variables } satisfies GraphQLRequestBody<V>),
      signal: controller.signal,
      mode: 'cors',
    });

    validateResponse(response);
    validateContentType(response);

    const payload = (await response.json()) as GraphQLResponse<T>;
    return validatePayload(payload);
  } catch (error) {
    // Detect abort errors and preserve the original timeout message
    if (error instanceof DOMException && error.name === 'AbortError' && controller.signal.reason) {
      // Re-throw the original reason if it's an Error
      if (controller.signal.reason instanceof Error) {
        throw controller.signal.reason;
      }
      // Otherwise create a new Error with the reason message
      throw new Error(String(controller.signal.reason));
    }
    // Re-throw all other errors unchanged
    throw error;
  } finally {
    clearTimeout(timeoutId);
    detachAbortListener?.();
  }
}

export { queryToString };

const DEFAULT_ENDPOINT = 'https://api.tarkov.dev/graphql';

interface GraphQLRequestBody<V> {
  query: string;
  variables?: V;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

interface GraphQLRequestOptions {
  signal?: AbortSignal;
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
function queryToString(query: string | import('graphql').DocumentNode): string {
  if (typeof query === 'string') {
    return query;
  }
  // Extract the query string from the DocumentNode
  const body = query.loc?.source.body;
  if (!body) {
    throw new Error('Invalid GraphQL DocumentNode: missing query source body');
  }
  return body;
}

export async function executeGraphQL<T, V = Record<string, unknown>>(
  query: string | import('graphql').DocumentNode,
  variables?: V,
  options: GraphQLRequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const detachAbortListener = setupAbortSignal(controller, options);

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

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GraphQLResponse<T>;
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
  } finally {
    detachAbortListener?.();
  }
}

export { queryToString };

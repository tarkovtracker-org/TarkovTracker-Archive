type StoreLike =
  | {
      $state?: {
        currentGameMode?: string;
      };
    }
  | null
  | undefined;

interface GameModeResult<TData = unknown> {
  currentGameMode: string;
  currentData: TData;
}

export function getCurrentGameModeData<TData = Record<string, unknown>>(
  store: StoreLike,
  fallbackMode: string = 'pvp'
): GameModeResult<TData> {
  const state = store?.$state;
  if (!state || typeof state !== 'object') {
    return {
      currentGameMode: fallbackMode,
      currentData: undefined as unknown as TData,
    };
  }

  const currentGameMode =
    typeof state.currentGameMode === 'string' && state.currentGameMode.length > 0
      ? state.currentGameMode
      : fallbackMode;

  const stateRecord = state as Record<string, unknown>;
  const currentData = (stateRecord[currentGameMode] ?? state) as TData;

  return {
    currentGameMode,
    currentData,
  };
}

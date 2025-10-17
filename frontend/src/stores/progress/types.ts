import type { Store } from 'pinia';
import type { UserState } from '@/shared_state';

export type TeamStoresMap = Record<string, Store<string, UserState>>;

export type CompletionsMap = Record<string, Record<string, boolean>>;

export type TraderLevelsMap = Record<string, Record<string, number>>;

export type TraderStandingMap = Record<string, Record<string, number>>;

export type FactionMap = Record<string, string>;

export type TaskAvailabilityMap = Record<string, Record<string, boolean>>;

export type ObjectiveCompletionsMap = Record<string, Record<string, boolean>>;

export type HideoutLevelMap = Record<string, Record<string, number>>;

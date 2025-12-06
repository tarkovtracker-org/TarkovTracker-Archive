import type Graph from 'graphology';
import type { ApolloError } from '@apollo/client';
import type { Store, StateTree } from 'pinia';
import type { Ref, ComputedRef } from 'vue';
import type { _GettersTree } from 'pinia';
import type { UserState } from '@/shared_state';
import type { Unsubscribe, DocumentReference, DocumentData } from 'firebase/firestore';
import type { MapLocation, MapZone } from './maps';

// Core Tarkov Data Types
export interface TarkovItem {
  id: string;
  shortName?: string;
  name?: string;
  link?: string;
  wikiLink?: string;
  image512pxLink?: string;
  gridImageLink?: string;
  baseImageLink?: string;
  iconLink?: string;
  image8xLink?: string;
  backgroundColor?: string;
}

export interface ItemRequirement {
  id: string;
  item: TarkovItem;
  count: number;
  quantity: number;
  foundInRaid?: boolean;
}

export interface StationLevelRequirement {
  id: string;
  station: { id: string; name: string };
  level: number;
}

export interface SkillRequirement {
  id: string;
  name: string;
  level: number;
}

export interface TraderRequirement {
  id?: string;
  trader: { id: string; name: string };
  value: number;
}

export interface TaskTraderLevelRequirement {
  id: string;
  trader: { id: string; name: string };
  level: number;
}

export interface Craft {
  id: string;
  duration: number;
  requiredItems: ItemRequirement[];
  rewardItems: ItemRequirement[];
}

export interface HideoutLevel {
  id: string;
  level: number;
  description?: string;
  constructionTime: number;
  itemRequirements: ItemRequirement[];
  stationLevelRequirements: StationLevelRequirement[];
  skillRequirements: SkillRequirement[];
  traderRequirements: TraderRequirement[];
  crafts: Craft[];
}

export interface HideoutStation {
  id: string;
  name: string;
  normalizedName?: string;
  levels: HideoutLevel[];
}

export interface HideoutModule extends HideoutLevel {
  stationId: string;
  predecessors: string[];
  successors: string[];
  parents: string[];
  children: string[];
}

export interface TaskObjective {
  id: string;
  description?: string;
  location?: { id: string; name?: string };
  maps?: { id: string; name?: string }[];
  possibleLocations?: MapLocation[];
  zones?: MapZone[];
  item?: TarkovItem; // Legacy field - use items instead
  items?: TarkovItem[]; // New field replacing item
  markerItem?: TarkovItem;
  count?: number;
  type?: string;
  foundInRaid?: boolean;
  x?: number;
  y?: number;
  optional?: boolean;
  taskId?: string;
  requiredKeys?: TarkovItem | TarkovItem[]; // New field replacing Task.neededKeys
  trader?: { id: string; name?: string };
  level?: number;
  value?: number;
  compareMethod?: string;
}

export type Key = TarkovItem;

export interface RequiredKey {
  keys: Key[];
  map: { id: string; name?: string } | null;
}

export interface TaskRequirement {
  task: { id: string; name?: string };
  status?: string[];
}

export interface FinishReward {
  __typename?: string;
  status?: string;
  quest?: { id: string };
}

export interface Task {
  id: string;
  tarkovDataId?: number;
  name?: string;
  normalizedName?: string; // New field
  eodOnly?: boolean;
  kappaRequired?: boolean;
  lightkeeperRequired?: boolean;
  experience?: number;
  taskImageLink?: string; // New field
  wikiLink?: string;
  availableDelaySecondsMin?: number; // New field
  availableDelaySecondsMax?: number; // New field
  restartable?: boolean; // New field
  descriptionMessageId?: string; // New field
  startMessageId?: string; // New field
  successMessageId?: string; // New field
  failMessageId?: string; // New field
  map?: { id: string; name?: string };
  locations?: string[];
  trader?: { id: string; name?: string; imageLink?: string; normalizedName?: string };
  objectives?: TaskObjective[];
  taskRequirements?: TaskRequirement[];
  traderRequirements?: TraderRequirement[];
  minPlayerLevel?: number;
  failedRequirements?: TaskRequirement[];
  traderLevelRequirements?: TaskTraderLevelRequirement[];
  factionName?: string;
  finishRewards?: FinishReward[];
  startRewards?: FinishReward[]; // New field
  failConditions?: TaskObjective[]; // New field
  failureOutcome?: object; // New field
  neededKeys?: RequiredKey[]; // Legacy field - computed from objectives.requiredKeys
  traderIcon?: string;
  predecessors?: string[];
  successors?: string[];
  parents?: string[];
  children?: string[];
  alternatives?: string[];
  neededBy?: string[];
}

export interface TarkovMap {
  id: string;
  name: string;
  normalizedName?: string;
  svg?:
    | string
    | {
        file: string;
        floors: string[];
        defaultFloor: string;
        coordinateRotation: number;
        bounds: number[][];
      };
}

export interface Trader {
  id: string;
  name: string;
  normalizedName?: string;
  imageLink?: string;
  levels?: {
    id?: string;
    level?: number;
    requiredPlayerLevel?: number;
    requiredReputation?: number;
    requiredCommerce?: number;
    insuranceRate?: number;
    payRate?: number;
    repairCostMultiplier?: number;
  }[];
}

export interface PlayerLevel {
  level: number;
  exp: number;
  levelBadgeImageLink: string;
}

// Query Result Types
export interface LanguageQueryResult {
  __type?: { enumValues: { name: string }[] };
}

export interface TarkovDataQueryResult {
  tasks: Task[];
  maps: TarkovMap[];
  traders: Trader[];
  playerLevels: PlayerLevel[];
}

export interface TarkovHideoutQueryResult {
  hideoutStations: HideoutStation[];
}

// Needed Items Types
export interface NeededItemBase {
  id: string;
  item?: TarkovItem;
  count: number;
  foundInRaid?: boolean;
}

export interface NeededItemTaskObjective extends NeededItemBase {
  needType: 'taskObjective';
  taskId: string;
  type?: string;
  markerItem?: TarkovItem;
  alternativeItems?: TarkovItem[];
}

export interface NeededItemHideoutModule extends NeededItemBase {
  needType: 'hideoutModule';
  hideoutModule: HideoutModule;
}

// Lookup Types
export interface ObjectiveMapInfo {
  objectiveID: string;
  mapID: string;
}

export interface ObjectiveGPSInfo {
  objectiveID: string;
  x?: number;
  y?: number;
}

export interface StaticMapData {
  [key: string]: {
    id: number;
    tdevId: string;
    locale: {
      en: string;
      ru?: string;
    };
    wiki?: string;
    description?: string;
    enemies?: string[];
    raidDuration?: {
      day: number;
      night: number;
    };
    svg: {
      file: string;
      floors: string[];
      defaultFloor: string;
      coordinateRotation: number;
      bounds: number[][];
    };
  };
}

// Store Types
export interface SystemState extends StateTree {
  tokens?: string[];
  team?: string | null;
}

export interface SystemGetters extends _GettersTree<SystemState> {
  userTokens: (state: SystemState) => string[];
  userTokenCount: (state: SystemState) => number;
  userTeam: (state: SystemState) => string | null;
  userTeamIsOwn: (state: SystemState) => boolean;
}

export interface TeamState extends StateTree {
  owner?: string | null;
  password?: string | null;
  members?: string[];
}

export interface TeamGetters extends _GettersTree<TeamState> {
  teamOwner: (state: TeamState) => string | null;
  isOwner: (state: TeamState) => boolean;
  teamPassword: (state: TeamState) => string | null;
  teamMembers: (state: TeamState) => string[];
  teammates: (state: TeamState) => string[];
}

// Firebase Types
export interface FirebaseListenerConfig {
  refToWatch: ComputedRef<DocumentReference<DocumentData> | null>;
  unsubscribe: Ref<Unsubscribe | null>;
  store: Store;
  storeId?: string;
}

// Composable Return Types
export interface TarkovDataComposable {
  availableLanguages: Ref<string[] | null>;
  languageCode: ComputedRef<string>;
  queryErrors: Ref<ApolloError | null>;
  queryResults: Ref<TarkovDataQueryResult | null>;
  lastQueryTime: Ref<number | null>;
  loading: Ref<boolean>;
  hideoutLoading: Ref<boolean>;
  queryHideoutErrors: Ref<ApolloError | null>;
  queryHideoutResults: Ref<TarkovHideoutQueryResult | null>;
  lastHideoutQueryTime: Ref<number | null>;
  hideoutStations: Ref<HideoutStation[]>;
  hideoutModules: Ref<HideoutModule[]>;
  hideoutGraph: Ref<Graph>;
  tasks: Ref<Task[]>;
  taskGraph: Ref<Graph>;
  objectiveMaps: Ref<{ [taskId: string]: ObjectiveMapInfo[] }>;
  alternativeTasks: Ref<{ [taskId: string]: string[] }>;
  objectiveGPS: Ref<{ [taskId: string]: ObjectiveGPSInfo[] }>;
  mapTasks: Ref<{ [mapId: string]: string[] }>;
  objectives: ComputedRef<TaskObjective[]>;
  maps: ComputedRef<TarkovMap[]>;
  rawMaps: ComputedRef<TarkovMap[]>;
  traders: ComputedRef<Trader[]>;
  neededItemTaskObjectives: Ref<NeededItemTaskObjective[]>;
  neededItemHideoutModules: Ref<NeededItemHideoutModule[]>;
  disabledTasks: string[];
  playerLevels: ComputedRef<PlayerLevel[]>;
  minPlayerLevel: ComputedRef<number>;
  maxPlayerLevel: ComputedRef<number>;
}

export interface LiveDataComposable {
  useTeamStore: () => Store<string, TeamState, TeamGetters>;
  useSystemStore: () => Store<string, SystemState, SystemGetters>;
  useProgressStore: () => Store<string, UserState>;
  teammateStores: Ref<Record<string, Store<string, UserState>>>;
  tarkovStore: Store<string, UserState>;
}

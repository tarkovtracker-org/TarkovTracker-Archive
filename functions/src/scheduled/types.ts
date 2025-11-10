import type { firestore } from 'firebase-admin';

export type BackoffStrategy = (attempt: number) => number;
export type DelayScheduler = (ms: number) => Promise<void>;

export interface TaskTrader {
  name: string;
}

export interface TaskRequirementTask {
  id: string;
  status: string;
}

export interface TaskRequirementItem {
  id: string;
  count: number;
}

export interface TaskRequirementTraderLevel {
  name: string;
  level: number;
}

export interface TaskRequirements {
  level: number;
  tasks: TaskRequirementTask[];
  items: TaskRequirementItem[];
  traderLevel: TaskRequirementTraderLevel[];
}

export interface ObjectiveTarget {
  id: string;
  name: string;
}

export interface ObjectiveLocation {
  id: string;
  name: string;
}

export interface ObjectiveCondition {
  compareMethod: string;
  conditionType: string;
  value: number;
  dynamicValues: unknown;
}

export interface TaskObjective {
  id: string;
  description: string;
  type: string;
  target: ObjectiveTarget | null;
  location: ObjectiveLocation | null;
  conditions: ObjectiveCondition[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  trader: TaskTrader;
  requirements: TaskRequirements;
  objectives: TaskObjective[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface HideoutItemRequirement {
  id: string;
  count: number;
}

export interface HideoutLevelRequirement {
  type: string;
  value: number;
}

export interface HideoutLevel {
  level: number;
  itemRequirements: HideoutItemRequirement[];
  requirements: HideoutLevelRequirement[];
}

export interface HideoutStation {
  id: string;
  name: string;
  description: string;
  levels: HideoutLevel[];
}

export interface HideoutResponse {
  hideoutStations: HideoutStation[];
}

export interface ItemCategory {
  name: string;
}

export interface ItemProperty {
  name: string;
  value: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  categories: ItemCategory[];
  types: string[];
  properties: ItemProperty[];
}

export interface ItemsResponse {
  items: Item[];
}

export interface Shard {
  data: Item[];
  index: string;
  size: number;
}

export interface ApiToken {
  lastUsed: firestore.Timestamp;
  isActive: boolean;
  status: 'active' | 'expired' | 'revoked';
  expiredAt?: firestore.Timestamp;
  createdAt?: firestore.Timestamp;
  userId?: string;
}

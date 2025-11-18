import type { firestore } from 'firebase-admin';
export type BackoffStrategy = (attempt: number) => number;
export type DelayScheduler = (ms: number) => Promise<void>;
// The Tarkov.dev schema changes frequently. To keep the importer resilient
// we accept loosely-typed task structures and validate shape at runtime.
export type Task = Record<string, unknown>;
export interface TasksResponse {
  tasks: Task[];
}
export type HideoutStation = Record<string, unknown>;
export interface HideoutResponse {
  hideoutStations: HideoutStation[];
}
export interface ItemsResponse {
  items: Record<string, unknown>[];
}
export interface Shard {
  data: Record<string, unknown>[];
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

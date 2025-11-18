import type { firestore } from 'firebase-admin';
import type { TokenGameMode } from '../types/api.js';
export interface RevokeTokenData {
  token: string;
}
export interface RevokeTokenResult {
  revoked: boolean;
}
export interface SystemDocData {
  tokens?: string[];
}
export interface TokenDocData {
  owner: string;
  note: string;
  permissions: string[];
  gameMode?: TokenGameMode;
  createdAt: firestore.Timestamp | firestore.FieldValue;
}

import { InjectionToken } from '@angular/core';
import { ArchitectureEstimateConfig } from '../models/pricing.model';

export interface SavedEstimateRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  config: ArchitectureEstimateConfig;
  userId?: string;
  isPublic?: boolean;
  /**
   * Optional human-readable tags for search & filtering.
   */
  tags?: string[];
}

export interface IEstimateRepository {
  saveSharedEstimate(config: ArchitectureEstimateConfig): Promise<string>;
  getSharedEstimate(id: string): Promise<ArchitectureEstimateConfig | null>;
  saveUserEstimate(userId: string, config: ArchitectureEstimateConfig): Promise<string>;
  getUserEstimates(userId: string): Promise<SavedEstimateRecord[]>;
  deleteUserEstimate(userId: string, estimateId: string): Promise<void>;

  /**
   * Guest-first persistence. Anonymous users are stored 100% locally
   * (zero Firestore reads → Spark-tier free); signed-in users are stored in
   * Firestore under their UID for cross-device access.
   */
  saveGuestEstimate(userId: string, config: ArchitectureEstimateConfig, isAnonymous: boolean): Promise<string>;
  getGuestEstimates(userId: string, isAnonymous: boolean): Promise<SavedEstimateRecord[]>;
  deleteGuestEstimate(userId: string, estimateId: string, isAnonymous: boolean): Promise<void>;

  /**
   * Renames a persisted estimate (guest local or remote).
   */
  renameEstimate(userId: string, estimateId: string, newName: string, isAnonymous: boolean): Promise<void>;

  /**
   * Moves an anonymous guest's locally-stored estimates into a newly signed-in
   * account's Firestore library. Used when an anonymous session upgrades to a
   * real account under a different UID (e.g. linking failed and a pre-existing
   * account was signed into instead).
   */
  migrateGuestData(oldUserId: string, newUserId: string): Promise<void>;
}

export const ESTIMATE_REPOSITORY_TOKEN = new InjectionToken<IEstimateRepository>('IEstimateRepository');

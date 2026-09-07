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
   * Guest-first local persistence. Estimates saved anonymously are stored in
   * local storage under the guest's anonymous UID. Signing in later links the
   * same guest UID so nothing is lost.
   */
  saveGuestEstimate(userId: string, config: ArchitectureEstimateConfig): Promise<string>;
  getGuestEstimates(userId: string): Promise<SavedEstimateRecord[]>;
  deleteGuestEstimate(userId: string, estimateId: string): Promise<void>;

  /**
   * Renames a persisted estimate (guest local or remote).
   */
  renameEstimate(userId: string, estimateId: string, newName: string): Promise<void>;
}

export const ESTIMATE_REPOSITORY_TOKEN = new InjectionToken<IEstimateRepository>('IEstimateRepository');

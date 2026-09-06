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
}

export interface IEstimateRepository {
  saveSharedEstimate(config: ArchitectureEstimateConfig): Promise<string>;
  getSharedEstimate(id: string): Promise<ArchitectureEstimateConfig | null>;
  saveUserEstimate(userId: string, config: ArchitectureEstimateConfig): Promise<string>;
  getUserEstimates(userId: string): Promise<SavedEstimateRecord[]>;
  deleteUserEstimate(userId: string, estimateId: string): Promise<void>;
}

export const ESTIMATE_REPOSITORY_TOKEN = new InjectionToken<IEstimateRepository>('IEstimateRepository');

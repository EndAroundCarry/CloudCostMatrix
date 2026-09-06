import { Injectable } from '@angular/core';
import { IEstimateRepository, SavedEstimateRecord } from '../../core/repositories/estimate.repository.interface';
import { ArchitectureEstimateConfig } from '../../core/models/pricing.model';

@Injectable({
  providedIn: 'root'
})
export class FirebaseEstimateRepository implements IEstimateRepository {
  private readonly STORAGE_KEY_PREFIX = 'ccm_saved_est_';
  private readonly SHARED_PREFIX = 'ccm_shared_';

  public async saveSharedEstimate(config: ArchitectureEstimateConfig): Promise<string> {
    const id = 'est_' + Math.random().toString(36).substring(2, 9);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${this.SHARED_PREFIX}${id}`, JSON.stringify(config));
    }
    return id;
  }

  public async getSharedEstimate(id: string): Promise<ArchitectureEstimateConfig | null> {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(`${this.SHARED_PREFIX}${id}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ArchitectureEstimateConfig;
    } catch {
      return null;
    }
  }

  public async saveUserEstimate(userId: string, config: ArchitectureEstimateConfig): Promise<string> {
    const id = 'usr_est_' + Math.random().toString(36).substring(2, 9);
    const record: SavedEstimateRecord = {
      id,
      name: config.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
      userId
    };

    if (typeof window !== 'undefined') {
      const list = await this.getUserEstimates(userId);
      list.unshift(record);
      localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(list));
    }
    return id;
  }

  public async getUserEstimates(userId: string): Promise<SavedEstimateRecord[]> {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SavedEstimateRecord[];
    } catch {
      return [];
    }
  }

  public async deleteUserEstimate(userId: string, estimateId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const list = await this.getUserEstimates(userId);
    const filtered = list.filter(item => item.id !== estimateId);
    localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(filtered));
  }
}

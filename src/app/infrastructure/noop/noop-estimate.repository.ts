import { Injectable } from '@angular/core';
import { IEstimateRepository, SavedEstimateRecord } from '../../core/repositories/estimate.repository.interface';
import { ArchitectureEstimateConfig } from '../../core/models/pricing.model';

/**
 * Server-only stand-in for FirebaseEstimateRepository. Belt-and-braces: with
 * NoopAuthService in place, EstimatorStore never calls most of these methods
 * during prerender (there's no signed-in/anonymous user to act on), but the
 * real repository does touch bare `localStorage` in a few spots — trivially
 * safe here rather than relying on that being unreachable.
 */
@Injectable()
export class NoopEstimateRepository implements IEstimateRepository {
  saveSharedEstimate(config: ArchitectureEstimateConfig): Promise<string> {
    void config;
    return Promise.resolve('');
  }

  getSharedEstimate(): Promise<ArchitectureEstimateConfig | null> {
    return Promise.resolve(null);
  }

  saveUserEstimate(): Promise<string> {
    return Promise.resolve('');
  }

  getUserEstimates(): Promise<SavedEstimateRecord[]> {
    return Promise.resolve([]);
  }

  deleteUserEstimate(): Promise<void> {
    return Promise.resolve();
  }

  saveGuestEstimate(): Promise<string> {
    return Promise.resolve('');
  }

  getGuestEstimates(): Promise<SavedEstimateRecord[]> {
    return Promise.resolve([]);
  }

  deleteGuestEstimate(): Promise<void> {
    return Promise.resolve();
  }

  renameEstimate(): Promise<void> {
    return Promise.resolve();
  }

  migrateGuestData(): Promise<void> {
    return Promise.resolve();
  }
}

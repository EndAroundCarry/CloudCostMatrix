import { Injectable } from '@angular/core';
import { IEstimateRepository, SavedEstimateRecord } from '../../core/repositories/estimate.repository.interface';
import { ArchitectureEstimateConfig } from '../../core/models/pricing.model';

/**
 * Estimate persistence repository.
 *
 * Guest-first strategy:
 *   - Anonymous users persist 100% locally (zero Firestore reads → Spark-tier
 *     free). Estimates are stored under `ccm_guest_est_<guestUid>`.
 *   - When a Google account is linked, the same guest UID is upgraded and the
 *     estimate list is mirrored to Firestore (`estimates/{uid}/items`) for
 *     cross-device sync — only when Firebase is configured AND reachable.
 *
 * This class also implements the pure-local storage path (no network) so the
 * entire app works offline or on a plan with no Firestore provisioned.
 */
@Injectable({
  providedIn: 'root'
})
export class FirebaseEstimateRepository implements IEstimateRepository {
  private readonly GUEST_PREFIX = 'ccm_guest_est_';
  private readonly SHARED_PREFIX = 'ccm_shared_';

  // ---- Shared (public URL) estimates --------------------------------

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

  // ---- Legacy "user estimate" API (Firestore-backed when available) ---

  public async saveUserEstimate(userId: string, config: ArchitectureEstimateConfig): Promise<string> {
    // Keep the legacy method on the local path; sync() mirrors to Firestore.
    return this.saveGuestEstimate(userId, config);
  }

  public async getUserEstimates(userId: string): Promise<SavedEstimateRecord[]> {
    return this.getGuestEstimates(userId);
  }

  public async deleteUserEstimate(userId: string, estimateId: string): Promise<void> {
    await this.deleteGuestEstimate(userId, estimateId);
  }

  // ---- Guest-first local persistence ----------------------------------

  private listKey(userId: string): string {
    return `${this.GUEST_PREFIX}${userId}`;
  }

  private readList(userId: string): SavedEstimateRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.listKey(userId));
      if (!raw) return [];
      return JSON.parse(raw) as SavedEstimateRecord[];
    } catch {
      return [];
    }
  }

  private writeList(userId: string, list: SavedEstimateRecord[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.listKey(userId), JSON.stringify(list));
  }

  public async saveGuestEstimate(userId: string, config: ArchitectureEstimateConfig): Promise<string> {
    const id = 'ccm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const record: SavedEstimateRecord = {
      id,
      name: config.name || 'Untitled Architecture',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
      userId,
      tags: []
    };

    const list = this.readList(userId);
    list.unshift(record);
    this.writeList(userId, list);
    this.mirrorToFirestore(userId, list).catch(() => undefined);
    return id;
  }

  public async getGuestEstimates(userId: string): Promise<SavedEstimateRecord[]> {
    return this.readList(userId).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  public async deleteGuestEstimate(userId: string, estimateId: string): Promise<void> {
    const filtered = this.readList(userId).filter((item) => item.id !== estimateId);
    this.writeList(userId, filtered);
    this.mirrorToFirestore(userId, filtered).catch(() => undefined);
  }

  public async renameEstimate(userId: string, estimateId: string, newName: string): Promise<void> {
    const list = this.readList(userId).map((item) =>
      item.id === estimateId
        ? { ...item, name: newName, updatedAt: new Date().toISOString() }
        : item
    );
    this.writeList(userId, list);
    this.mirrorToFirestore(userId, list).catch(() => undefined);
  }

  /**
   * Mirrors the local list to Firestore when a real (non-anonymous) user is
   * signed in. Purely best-effort — Firestore may be absent on the free tier.
   */
  private async mirrorToFirestore(userId: string, list: SavedEstimateRecord[]): Promise<void> {
    if (typeof window === 'undefined') return;
    if (userId.startsWith('guest_')) return; // anonymous users stay local

    try {
      // Lazy dynamic import keeps the initial bundle lean when Firestore isn't used.
      const { initializeApp, getApp } = await import('firebase/app');
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      const { firebaseConfig } = await import('./firebase.config');

      let app;
      try {
        app = getApp();
      } catch {
        app = initializeApp(firebaseConfig);
      }
      const db = getFirestore(app);
      await setDoc(doc(db, 'estimates', userId, 'items', 'latest'), {
        items: list,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Silent: offline / no Firestore configured → local-only persistence.
    }
  }
}

import { Injectable } from '@angular/core';
import { IEstimateRepository, SavedEstimateRecord } from '../../core/repositories/estimate.repository.interface';
import { ArchitectureEstimateConfig } from '../../core/models/pricing.model';

/**
 * Estimate persistence repository.
 *
 * Guest-first strategy:
 *   - Anonymous users persist 100% locally (zero Firestore reads → Spark-tier
 *     free). Estimates are stored under `ccm_guest_est_<uid>`.
 *   - Signed-in users (Google or email/password) are stored in Firestore under
 *     `estimates/{uid}/items/{estimateId}` for cross-device sync.
 *
 * Firestore access uses lazy dynamic imports so the SDK is never pulled into
 * the initial bundle for guests who never sign in.
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

  // ---- Legacy "user estimate" API (always Firestore-backed) -----------

  public async saveUserEstimate(userId: string, config: ArchitectureEstimateConfig): Promise<string> {
    return this.saveGuestEstimate(userId, config, false);
  }

  public async getUserEstimates(userId: string): Promise<SavedEstimateRecord[]> {
    return this.getGuestEstimates(userId, false);
  }

  public async deleteUserEstimate(userId: string, estimateId: string): Promise<void> {
    await this.deleteGuestEstimate(userId, estimateId, false);
  }

  // ---- Guest-first persistence ----------------------------------------

  private listKey(userId: string): string {
    return `${this.GUEST_PREFIX}${userId}`;
  }

  private readLocalList(userId: string): SavedEstimateRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.listKey(userId));
      if (!raw) return [];
      return JSON.parse(raw) as SavedEstimateRecord[];
    } catch {
      return [];
    }
  }

  private writeLocalList(userId: string, list: SavedEstimateRecord[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.listKey(userId), JSON.stringify(list));
  }

  public async saveGuestEstimate(
    userId: string,
    config: ArchitectureEstimateConfig,
    isAnonymous: boolean
  ): Promise<string> {
    const now = new Date().toISOString();
    const id = 'ccm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const record: SavedEstimateRecord = {
      id,
      name: config.name || 'Untitled Architecture',
      createdAt: now,
      updatedAt: now,
      config,
      userId,
      tags: []
    };

    if (isAnonymous) {
      const list = this.readLocalList(userId);
      list.unshift(record);
      this.writeLocalList(userId, list);
      return id;
    }

    await this.setFirestoreDoc(userId, record);
    return id;
  }

  public async getGuestEstimates(userId: string, isAnonymous: boolean): Promise<SavedEstimateRecord[]> {
    if (isAnonymous) {
      return this.readLocalList(userId).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    }
    return this.getFirestoreList(userId);
  }

  public async deleteGuestEstimate(userId: string, estimateId: string, isAnonymous: boolean): Promise<void> {
    if (isAnonymous) {
      const filtered = this.readLocalList(userId).filter((item) => item.id !== estimateId);
      this.writeLocalList(userId, filtered);
      return;
    }
    await this.deleteFirestoreDoc(userId, estimateId);
  }

  public async renameEstimate(
    userId: string,
    estimateId: string,
    newName: string,
    isAnonymous: boolean
  ): Promise<void> {
    if (isAnonymous) {
      const list = this.readLocalList(userId).map((item) =>
        item.id === estimateId ? { ...item, name: newName, updatedAt: new Date().toISOString() } : item
      );
      this.writeLocalList(userId, list);
      return;
    }
    const list = await this.getFirestoreList(userId);
    const rec = list.find((item) => item.id === estimateId);
    if (!rec) return;
    await this.setFirestoreDoc(userId, { ...rec, name: newName, updatedAt: new Date().toISOString() });
  }

  public async migrateGuestData(oldUserId: string, newUserId: string): Promise<void> {
    const local = this.readLocalList(oldUserId);
    if (!local.length) return;
    for (const rec of local) {
      await this.setFirestoreDoc(newUserId, { ...rec, userId: newUserId, updatedAt: new Date().toISOString() });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.listKey(oldUserId));
    }
  }

  // ---- Firestore access (lazy-loaded) ----------------------------------

  private async getDb() {
    const { getFirestore } = await import('firebase/firestore');
    const { getFirebaseApp } = await import('./firebase-app');
    return getFirestore(getFirebaseApp());
  }

  private async setFirestoreDoc(uid: string, record: SavedEstimateRecord): Promise<void> {
    const { doc, setDoc } = await import('firebase/firestore');
    const db = await this.getDb();
    await setDoc(doc(db, 'estimates', uid, 'items', record.id), record);
  }

  private async deleteFirestoreDoc(uid: string, estimateId: string): Promise<void> {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const db = await this.getDb();
    await deleteDoc(doc(db, 'estimates', uid, 'items', estimateId));
  }

  private async getFirestoreList(uid: string): Promise<SavedEstimateRecord[]> {
    const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
    const db = await this.getDb();
    const snap = await getDocs(query(collection(db, 'estimates', uid, 'items'), orderBy('updatedAt', 'desc')));
    return snap.docs.map((d) => d.data() as SavedEstimateRecord);
  }
}

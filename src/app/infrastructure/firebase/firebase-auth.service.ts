import { Injectable, signal, computed } from '@angular/core';
import { IAuthService, AppUser } from '../../core/repositories/auth.service.interface';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService implements IAuthService {
  private readonly _currentUser = signal<AppUser | null>(null);

  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => this._currentUser() !== null);
  public readonly isAnonymous = computed(() => this._currentUser()?.isAnonymous ?? true);

  constructor() {
    this.restoreGuestSession();
  }

  private restoreGuestSession(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ccm_guest_uid');
      if (stored) {
        this._currentUser.set({
          uid: stored,
          email: null,
          displayName: 'Guest Architect',
          photoURL: null,
          isAnonymous: true
        });
      }
    }
  }

  public async signInAnonymously(): Promise<AppUser> {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
    const guestUser: AppUser = {
      uid: guestId,
      email: null,
      displayName: 'Guest Architect',
      photoURL: null,
      isAnonymous: true
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('ccm_guest_uid', guestId);
    }
    this._currentUser.set(guestUser);
    return guestUser;
  }

  public async signInWithGoogle(): Promise<AppUser> {
    const user: AppUser = {
      uid: 'user_google_' + Math.random().toString(36).substring(2, 9),
      email: 'architect@example.com',
      displayName: 'Cloud Architect',
      photoURL: null,
      isAnonymous: false
    };
    this._currentUser.set(user);
    return user;
  }

  public async linkWithGoogle(): Promise<AppUser> {
    const current = this._currentUser();
    const upgradedUser: AppUser = {
      uid: current?.uid || ('user_' + Math.random().toString(36).substring(2, 9)),
      email: 'architect@example.com',
      displayName: 'Cloud Architect',
      photoURL: null,
      isAnonymous: false
    };
    this._currentUser.set(upgradedUser);
    return upgradedUser;
  }

  public async signOut(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ccm_guest_uid');
    }
    this._currentUser.set(null);
  }
}

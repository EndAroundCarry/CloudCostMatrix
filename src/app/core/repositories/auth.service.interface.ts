import { InjectionToken, Signal } from '@angular/core';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export interface IAuthService {
  readonly currentUser: Signal<AppUser | null>;
  readonly isAuthenticated: Signal<boolean>;
  readonly isAnonymous: Signal<boolean>;
  /** Human-readable message from the most recent failed auth attempt, or null. */
  readonly authError: Signal<string | null>;

  /** Resolves once Firebase has restored (or determined there is no) persisted session. */
  whenReady(): Promise<AppUser | null>;

  signInAnonymously(): Promise<AppUser>;
  /** Signs in with Google. Upgrades an existing anonymous session in place when possible. */
  signInWithGoogle(): Promise<AppUser>;
  signInWithEmail(email: string, password: string): Promise<AppUser>;
  /** Upgrades an existing anonymous session in place when possible. */
  signUpWithEmail(email: string, password: string, displayName?: string): Promise<AppUser>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
  clearAuthError(): void;
}

export const AUTH_SERVICE_TOKEN = new InjectionToken<IAuthService>('IAuthService');

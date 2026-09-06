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

  signInAnonymously(): Promise<AppUser>;
  signInWithGoogle(): Promise<AppUser>;
  linkWithGoogle(): Promise<AppUser>;
  signOut(): Promise<void>;
}

export const AUTH_SERVICE_TOKEN = new InjectionToken<IAuthService>('IAuthService');

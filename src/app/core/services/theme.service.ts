import { Injectable, signal, computed } from '@angular/core';

export type AppTheme = 'dark' | 'light';

const STORAGE_KEY = 'ccm_theme';

/**
 * Light/dark theme manager.
 *
 * The whole UI is authored against Tailwind's dark slate palette, and Tailwind
 * v4 emits CSS variables (e.g. `.bg-slate-900{background-color:var(--color-slate-900)}`).
 * Toggling `data-theme` on <html> lets a scoped variable remap in styles.css
 * translate the entire dark-coded interface to a light palette without touching
 * every component class.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<AppTheme>(this.initialTheme());

  public readonly theme = this._theme.asReadonly();
  public readonly isLight = computed(() => this._theme() === 'light');

  constructor() {
    this.apply();
  }

  public toggle(): AppTheme {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
    this.apply();
    return this._theme();
  }

  public setTheme(theme: AppTheme): void {
    this._theme.set(theme);
    this.apply();
  }

  private initialTheme(): AppTheme {
    if (typeof window === 'undefined') return 'dark';
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
      const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)')?.matches;
      return prefersLight ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  private apply(): void {
    const theme = this._theme();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      // Keep the mobile browser chrome (theme-color) in sync with the theme.
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', theme === 'light' ? '#eef2f7' : '#0b1120');
      }
    }
    try {
      window.localStorage?.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode / storage unavailable */
    }
  }
}

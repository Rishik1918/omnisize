export type ThemeMode = 'light' | 'dark' | 'sunset';

const STORAGE_KEY = 'omnisize_theme_mode';

export class ThemeManager {
  private static listeners: Array<(mode: ThemeMode, isDark: boolean) => void> = [];
  private static checkInterval: any = null;

  static getThemeMode(): ThemeMode {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return saved || 'dark'; // Default dark theme
  }

  static setThemeMode(mode: ThemeMode): void {
    localStorage.setItem(STORAGE_KEY, mode);
    this.applyTheme();
    this.notify();
  }

  static isCurrentlyDark(): boolean {
    const mode = this.getThemeMode();
    if (mode === 'dark') return true;
    if (mode === 'light') return false;

    // Sunset mode: automatically switches to dark mode from 6:00 PM (18:00) to 6:00 AM (06:00)
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  }

  static applyTheme(): void {
    const isDark = this.isCurrentlyDark();
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
  }

  static init(): void {
    this.applyTheme();

    if (!this.checkInterval && typeof window !== 'undefined') {
      this.checkInterval = setInterval(() => {
        if (this.getThemeMode() === 'sunset') {
          this.applyTheme();
          this.notify();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  static subscribe(listener: (mode: ThemeMode, isDark: boolean) => void): () => void {
    this.listeners.push(listener);
    listener(this.getThemeMode(), this.isCurrentlyDark());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify(): void {
    const mode = this.getThemeMode();
    const isDark = this.isCurrentlyDark();
    this.listeners.forEach((l) => l(mode, isDark));
  }
}

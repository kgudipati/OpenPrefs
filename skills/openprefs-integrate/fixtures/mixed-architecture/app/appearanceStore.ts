export type Theme = "light" | "dark" | "system";

let theme: Theme = "system";

export const appearanceStore = {
  getTheme(): Theme {
    return theme;
  },
  setTheme(value: Theme): void {
    theme = value;
  },
};

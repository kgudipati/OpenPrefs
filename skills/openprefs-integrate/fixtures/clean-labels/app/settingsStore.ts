export type Theme = "light" | "dark" | "system";
export type TextSize = "small" | "medium" | "large";
export type ProfileVisibility = "public" | "connections" | "private";

export interface UserPreferences {
  readonly theme: Theme;
  readonly textSize: TextSize;
  readonly directMessageNotifications: boolean;
  readonly profileVisibility: ProfileVisibility;
}

let preferences: UserPreferences = {
  theme: "system",
  textSize: "medium",
  directMessageNotifications: true,
  profileVisibility: "connections",
};

export function readPreferences(): UserPreferences {
  return { ...preferences };
}

export function setTheme(value: Theme): void {
  preferences = { ...preferences, theme: value };
}

export function setTextSize(value: TextSize): void {
  preferences = { ...preferences, textSize: value };
}

export function setDirectMessageNotifications(value: boolean): void {
  preferences = { ...preferences, directMessageNotifications: value };
}

export function setProfileVisibility(value: ProfileVisibility): void {
  preferences = { ...preferences, profileVisibility: value };
}

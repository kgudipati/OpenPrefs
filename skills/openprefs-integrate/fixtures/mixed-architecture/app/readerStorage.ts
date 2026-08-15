export type ReadingTextSize = "small" | "medium" | "large";

export interface StringStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const key = "reader.text-size";

export function readTextSize(storage: StringStorage): ReadingTextSize {
  const value = storage.getItem(key);
  return value === "small" || value === "large" ? value : "medium";
}

export function writeTextSize(storage: StringStorage, value: ReadingTextSize): void {
  storage.setItem(key, value);
}

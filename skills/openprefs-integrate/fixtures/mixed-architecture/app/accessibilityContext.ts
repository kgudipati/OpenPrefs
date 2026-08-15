export interface AccessibilityContext {
  readonly highContrast: boolean;
  setHighContrast(value: boolean): void;
}

export function createAccessibilityContext(): () => AccessibilityContext {
  let highContrast = false;
  return () => ({
    highContrast,
    setHighContrast(value: boolean): void {
      highContrast = value;
    },
  });
}

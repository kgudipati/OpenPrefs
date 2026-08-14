/**
 * Narrows an unknown value to a non-array object record.
 *
 * @param value - The value to inspect without invoking user-defined properties.
 * @returns `true` only for non-null objects that are not arrays.
 */
export function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Describes an own data property read without invoking an accessor. */
export type OwnDataProperty =
  | { readonly found: false }
  | { readonly found: true; readonly value: unknown };

/**
 * Reads an own data property while refusing inherited properties and accessors.
 *
 * @param value - The object whose property descriptor should be inspected.
 * @param key - The property key to read.
 * @returns The property's value when it is an own data property, otherwise an absent result.
 */
export function readOwnDataProperty(value: object, key: PropertyKey): OwnDataProperty {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    return { found: false };
  }
  return { found: true, value: descriptor.value };
}

/**
 * Converts an unknown thrown value into a stable boundary error message.
 *
 * @param error - The value thrown or used to reject a boundary operation.
 * @param fallback - The message to use when the thrown value contains no safe message.
 * @returns A non-empty error message without coercing hostile values.
 */
export function errorMessage(error: unknown, fallback: string): string {
  try {
    if (error instanceof Error && typeof error.message === "string" && error.message.length > 0) {
      return error.message;
    }
  } catch {
    // A thrown proxy can make even Error inspection throw; boundary normalization must not.
  }
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  return fallback;
}

import { definePreferences } from "openprefs";
import { preferenceDefinitions } from "./preferenceDefinitions.js";

/** Preferences that the existing example application chooses to expose to OpenPrefs. */
export const preferences = definePreferences(preferenceDefinitions);

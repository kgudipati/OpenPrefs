export type { ManifestErrorCode } from "./errors/manifestError";
export { ManifestError } from "./errors/manifestError";
export { definePreferences } from "./manifest/definePreferences";
export type { PreferencesManifest } from "./manifest/manifest";
export { parsePreferencesJson } from "./manifest/parseJson";
export type {
  BooleanPreferenceDefinition,
  NumberPreferenceDefinition,
  OpenPrefsMetadata,
  PreferenceDefinition,
  PreferenceDefinitions,
  PreferencesState,
  PreferenceValue,
  StringPreferenceDefinition,
} from "./manifest/types";
export type { PreferenceChange, SettingsProposal } from "./proposal/types";
export type {
  ProposalRejection,
  ProposalRejectionCode,
  ProposalValidationResult,
} from "./validation/validateProposal";
export { validateProposal } from "./validation/validateProposal";

export type { ApplyFailure, ApplyResult, PreferencesAdapter } from "./adapter/types";
export type { CreateOpenPrefsOptions, OpenPrefs } from "./core/createOpenPrefs";
export { createOpenPrefs } from "./core/createOpenPrefs";
export type {
  AlreadySatisfiedResult,
  AppliedResult,
  ConfirmationRequiredResult,
  FailedResult,
  NeedsClarificationResult,
  NoChangesRejectedResult,
  OpenPrefsResult,
  PreferenceChangePreview,
  ProposalRejectedResult,
  RejectedResult,
  TooManyChangesRejectedResult,
  UnknownPreferenceRejectedResult,
  UnsupportedResult,
} from "./core/results";
export type { ManifestErrorCode } from "./errors/manifestError";
export { ManifestError } from "./errors/manifestError";
export type { PolicyErrorCode } from "./errors/policyError";
export { PolicyError } from "./errors/policyError";
export { definePreferences } from "./manifest/definePreferences";
export type { PreferencesManifest } from "./manifest/manifest";
export { parsePreferencesJson } from "./manifest/parseJson";
export type {
  BooleanPreferenceDefinition,
  NumberPreferenceDefinition,
  OpenPrefsMetadata,
  PreferenceChangeFor,
  PreferenceDefinition,
  PreferenceDefinitions,
  PreferencesState,
  PreferenceValue,
  StringPreferenceDefinition,
} from "./manifest/types";
export { evaluatePolicy } from "./policy/evaluatePolicy";
export { resolvePolicy } from "./policy/resolvePolicy";
export type {
  OpenPrefsPolicy,
  PolicyDecision,
  PolicyRejectionReason,
} from "./policy/types";
export type { PreferenceChange, SettingsProposal } from "./proposal/types";
export type { PreferencesResolver, ResolveInput, ResolveResult } from "./resolver/types";
export type {
  ProposalRejection,
  ProposalRejectionCode,
  ProposalValidationResult,
} from "./validation/validateProposal";
export { validateProposal } from "./validation/validateProposal";

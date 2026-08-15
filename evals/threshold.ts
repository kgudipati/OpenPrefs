/**
 * Deterministic exact-match regression floor measured against the committed 45-case suite.
 *
 * This is deliberately a lower bound: improvements above 22 pass, while any score below 22 fails.
 */
export const deterministicThreshold = 22;

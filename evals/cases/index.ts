import { adversarialCases } from "./adversarial.js";
import { ambiguousCases } from "./ambiguous.js";
import { contradictoryCases } from "./contradictory.js";
import { directCases } from "./direct.js";
import { goalOrientedCases } from "./goalOriented.js";
import { multiSettingCases } from "./multiSetting.js";
import { relativeCases } from "./relative.js";
import { synonymCases } from "./synonym.js";
import { unsupportedCases } from "./unsupported.js";

/** Complete section 53 eval case suite in stable reporting order. */
export const evalCases = [
  ...directCases,
  ...synonymCases,
  ...multiSettingCases,
  ...relativeCases,
  ...goalOrientedCases,
  ...ambiguousCases,
  ...unsupportedCases,
  ...adversarialCases,
  ...contradictoryCases,
] as const;

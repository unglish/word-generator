/**
 * Shared types and constants for grapheme definitions.
 */

import { Grapheme } from "../../types.js";

/** Etymology origin indices for graphemes */
export const ORIGINS = ["Germanic", "French", "Greek", "Latin", "Other"] as const;

/** Type alias for grapheme arrays used in category files */
export type GraphemeList = Grapheme[];

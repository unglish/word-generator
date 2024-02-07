// Importing from your submodules
import generate from "./verbs/generate";
import * as phonemes from "./elements/phonemes";
import * as graphemes from "./elements/graphemes";
import { setRand } from "./utils/random";

// Alternatively, if you want to export everything under a single default export
export {
  setRand,
  phonemes,
  graphemes,
};

export default generate;


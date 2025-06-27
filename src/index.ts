import generateWord from "./core/generate.js";
import * as phonemes from "./elements/phonemes.js";
import * as graphemes from "./elements/graphemes.js";
import * as random from "./utils/random.js";
export { scoreWord } from "./scoring/score.js";

export default {
  generateWord,
  random,
  phonemes,
  graphemes,
};

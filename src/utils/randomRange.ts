import type { RNG } from "./random.js";

export default (min: number, max: number, rand: RNG, returnAsInt?: boolean): number => {
  const result = rand() * (max - min) + min;
  return returnAsInt ? Math.floor(result) : result;
};

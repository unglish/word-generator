import type { RNG } from "./random.js";

const pick = <T>(choices: T[], rand: RNG): T => {
  const index = Math.floor(rand() * choices.length);
  return choices[index];
};

export default pick;

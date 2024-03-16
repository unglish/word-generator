import { getRand } from "./random.js";

const pick = <T>(choices: T[]): T => {
  const index = Math.floor(getRand()() * choices.length);
  return choices[index];
};

export default pick;

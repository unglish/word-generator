import { getRand } from "./random.js";

export default (min: number, max: number, returnAsInt?: boolean): number => {
  const result = getRand()() * (max - min) + min;
  return returnAsInt ? Math.floor(result) : result;
};

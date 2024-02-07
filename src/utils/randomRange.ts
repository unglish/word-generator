import { rand } from "./random";

export const randomRange = function (min, max, returnAsInt) {
  const result = rand() * (max - min) + min;
  return returnAsInt ? Math.floor(result) : result;
};

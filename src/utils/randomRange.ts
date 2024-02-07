import { rand } from "./random";

export const randomRange = function (min: number, max: number, returnAsInt: any) {
  const result = rand() * (max - min) + min;
  return returnAsInt ? Math.floor(result) : result;
};

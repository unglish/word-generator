import { rand } from "./random.js";

export default (min: number, max: number, returnAsInt: any) => {
  const result = rand() * (max - min) + min;
  return returnAsInt ? Math.floor(result) : result;
};

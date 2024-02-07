import { rand } from "./random.js";

export const pick = (arr: string | any[]) => arr[(rand() * arr.length) | 0];
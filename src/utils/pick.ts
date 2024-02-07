import { rand } from "./random";

export const pick = (arr) => arr[(rand() * arr.length) | 0];
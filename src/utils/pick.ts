import { rand } from "./random";

export const pick = (arr: string | any[]) => arr[(rand() * arr.length) | 0];
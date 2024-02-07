import { rand } from "./random.js";

export default (arr: string | any[]) => arr[(rand() * arr.length) | 0];
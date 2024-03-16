export type RandomFunction = () => number;

const rand: RandomFunction = Math.random;
let currentRand: RandomFunction = rand;

export const getRand = (): RandomFunction => currentRand;

export const overrideRand = (randomFunc: RandomFunction): void => {
  currentRand = randomFunc;
};

export const resetRand = (): void => {
  currentRand = rand;
};

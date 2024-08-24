export type RandomFunction = () => number;

const xorshift: RandomFunction = (() => {
  let state = Date.now();
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 2**32;
  };
})();

const rand: RandomFunction = xorshift;
let currentRand: RandomFunction = rand;

export const getRand = (): RandomFunction => currentRand;

export const overrideRand = (randomFunc: RandomFunction): void => {
  currentRand = randomFunc;
};

export const resetRand = (): void => {
  currentRand = rand;
};

// Default randomness function
export let rand: () => number = Math.random;

// Function to set a custom randomness function
export const setRand = (randomFunc: () => number): void => {
  rand = randomFunc;
};
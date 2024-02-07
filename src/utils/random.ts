export let rand: () => number = Math.random;

// Function to set a custom randomness function
export default (randomFunc: () => number): void => {
  rand = randomFunc;
};
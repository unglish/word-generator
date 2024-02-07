import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  return {
    root: "demo",
    build: {
      outDir: "../dist-demo",
    },
  };
});
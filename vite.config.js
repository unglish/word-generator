import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "build-lib") {
    return {
      build: {
        lib: {
          entry: "src/index.ts",
          name: "unglish-word-generator",
          fileName: () => "index.js" // Output file name
        },
        rollupOptions: {
          // Externalize dependencies, if needed
          external: [],
          output: {
            // Provide globals for external dependencies, if any
            globals: {},
          },
        },
      },
    };
  }

  // Demo configuration
  return {
    root: "demo",
    build: {
      outDir: "../dist-demo",
    },
  };
});
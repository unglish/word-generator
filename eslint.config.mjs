import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import { noBranchAssertion } from "./scripts/lib/no-branch-assertion.mjs";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      ecmaVersion: 12,
      sourceType: "module",
    },
    rules: {
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "always"],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    plugins: { local: { rules: { "no-branch-assertion": noBranchAssertion } } },
    rules: { "local/no-branch-assertion": "error" },
  },
);

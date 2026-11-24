// @ts-check
/* Flat config for ESLint 9. Same rules as the old .eslintrc.json:
 * Next core-web-vitals + typescript-eslint recommended everywhere,
 * type-checked rules on .ts/.tsx only, plus the house style rules. */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const typeChecked = tseslint.configs.recommendedTypeCheckedOnly.map(
  (config) => ({ ...config, files: ["**/*.ts", "**/*.tsx"] }),
);

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...typeChecked,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
      "no-trailing-spaces": "error",
      "eol-last": "error",
      "max-len": ["error", { code: 80 }],
      semi: ["error", "always"],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

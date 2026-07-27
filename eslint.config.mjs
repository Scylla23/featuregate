import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  // Globbed rather than bare names: turbo runs `eslint .` from each package
  // dir, where a bare "dist" does not match packages/*/dist. Without this,
  // linting after a build reports hundreds of errors in compiled output.
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },

  // 1. Base JS/TS Config (Applies to everything)
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": "off", // Handled by TS
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // 2. React Config (Applies to Dashboard and Website)
  {
    files: ["packages/{dashboard,website}/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // React Compiler rules, on by default in eslint-plugin-react-hooks v6.
      // The 6 current violations are real smells, not bugs on React 18, and
      // they sit in core state — project-provider, use-flag-form — which the
      // dashboard has no tests to cover. Warn until there is a safety net,
      // then fix and promote these back to "error".
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },

  // 3. Prettier Config (Must be last to override)
  prettier,
);

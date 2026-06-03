import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // Design-system footgun: tokens.css overrides the spacing scale, so in
      // Tailwind v4 `max-w-<token>` resolves to a spacing value, not a
      // container width (e.g. `max-w-2xl` => max-width: 40px), squishing the
      // element. Flag it in className strings and template literals.
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\bmax-w-(xs|s|md|l|xl|2xl|3xl|4xl|5xl|7xl|8xl|9xl|10xl|11xl)\\b/]",
          message:
            "`max-w-<token>` resolves to the spacing scale here (e.g. max-w-2xl = 40px), not a container width. Use an arbitrary value like max-w-[42rem], or a non-colliding name (sm/lg).",
        },
        {
          selector:
            "JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\bmax-w-(xs|s|md|l|xl|2xl|3xl|4xl|5xl|7xl|8xl|9xl|10xl|11xl)\\b/]",
          message:
            "`max-w-<token>` resolves to the spacing scale here (e.g. max-w-2xl = 40px), not a container width. Use an arbitrary value like max-w-[42rem], or a non-colliding name (sm/lg).",
        },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  }
);

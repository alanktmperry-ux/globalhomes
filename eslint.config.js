import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import i18next from "eslint-plugin-i18next";
import tseslint from "typescript-eslint";

const I18N_ENFORCED_FILES = [
  "src/pages/seeker/**/*.tsx",
  "src/pages/halo/**/*.tsx",
  "src/pages/properties/**/*.tsx",
  "src/features/auth/pages/**/*.tsx",
  "src/features/properties/pages/**/*.tsx",
  "src/features/agents/pages/AgentLandingPage.tsx",
  "src/features/agents/pages/AgencyOnboardingPage.tsx",
  "src/components/halo/HaloStep1.tsx",
  "src/components/halo/HaloStep2.tsx",
  "src/components/halo/HaloStep3.tsx",
  "src/components/halo/HaloStepIndicator.tsx",
  "src/shared/components/layout/SiteHeader.tsx",
  "src/shared/components/layout/SiteFooter.tsx",
];

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: I18N_ENFORCED_FILES,
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "warn",
        {
          mode: "jsx-text-only",
          "should-validate-template": false,
          words: {
            exclude: [
              "ListHQ",
              "Halo",
              "AUD",
              "AUS",
              "AU",
              "ABN",
              "ACN",
              "GST",
              "FIRB",
              "ListHQ.com.au",
            ],
          },
          callees: {
            exclude: ["t", "i18n(ext)?", "translate"],
          },
        },
      ],
    },
  },
);

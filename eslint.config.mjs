import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Common data-fetch / URL-sync patterns; fix incrementally without blocking commits
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "jest.config.js", "scripts/**/*.js"],
  },
];

export default eslintConfig;

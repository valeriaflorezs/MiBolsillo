import next from "eslint-config-next/core-web-vitals";

const config = [
  ...next,
  { ignores: ["src/generated/**", ".next/**", "node_modules/**"] },
  { rules: { "react/no-danger": "error" } },
];
export default config;

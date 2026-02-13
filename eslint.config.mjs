import nextConfig from "eslint-config-next/core-web-vitals";
import prettierConfig from "eslint-config-prettier";

/** @type {import('eslint').Linter.FlatConfig[]} */
const eslintConfig = [...nextConfig, prettierConfig];

export default eslintConfig;

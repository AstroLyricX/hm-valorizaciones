import eslintConfigCodely from "eslint-config-codely";
import pluginCypress from "eslint-plugin-cypress";
import jestDom from "eslint-plugin-jest-dom";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import globals from "globals";

export default [
	{
		ignores: ["dist", "dev-dist", "node_modules", "coverage"],
	},
	...eslintConfigCodely.ts,
	{
		rules: {
			"import/no-unresolved": ["error", { ignore: ["^virtual:"] }],
		},
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		languageOptions: {
			globals: globals.browser,
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
		},
	},
	{
		// Código generado por shadcn/ui: se mantiene igual al original para poder actualizarlo.
		files: ["src/components/ui/**/*.tsx"],
		rules: {
			"react-refresh/only-export-components": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"no-param-reassign": "off",
		},
	},
	{
		files: ["tests/**/*.spec.{ts,tsx}"],
		ignores: ["tests/e2e/**"],
		languageOptions: {
			globals: { ...globals.browser, ...globals.jest },
		},
		...testingLibrary.configs["flat/react"],
	},
	{
		files: ["tests/**/*.spec.{ts,tsx}"],
		ignores: ["tests/e2e/**"],
		...jestDom.configs["flat/recommended"],
	},
	{
		files: ["tests/e2e/**/*.ts"],
		...pluginCypress.configs.recommended,
	},
	{
		files: ["*.config.{js,ts}"],
		languageOptions: {
			globals: globals.node,
		},
	},
];

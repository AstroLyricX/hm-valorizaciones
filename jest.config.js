/** @type {import("jest").Config} */
const config = {
	testEnvironment: "jest-fixed-jsdom",
	setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"],
	testMatch: ["<rootDir>/tests/**/*.spec.{ts,tsx}"],
	testPathIgnorePatterns: ["<rootDir>/tests/e2e/"],
	// TanStack Table v9 solo publica módulos ES: se transforman con swc como el resto del código.
	transformIgnorePatterns: ["/node_modules/(?!@tanstack/)"],
	transform: {
		"^.+\\.(js|jsx|ts|tsx)$": [
			"@swc/jest",
			{
				sourceMaps: true,
				jsc: {
					parser: {
						syntax: "typescript",
						tsx: true,
					},
					transform: {
						react: {
							runtime: "automatic",
						},
					},
				},
			},
		],
	},
	moduleNameMapper: {
		"^@/app/entorno$": "<rootDir>/tests/support/entorno.ts",
		"^@/(.*)$": "<rootDir>/src/$1",
		"\\.(css|less|scss|sass)$": "jest-transform-stub",
		"\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
			"jest-transform-stub",
	},
};

export default config;

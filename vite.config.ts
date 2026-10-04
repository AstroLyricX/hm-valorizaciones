import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "prompt",
			pwaAssets: {
				config: true,
			},
			manifest: {
				name: "Valorizaciones H&M",
				short_name: "H&M Valoriza",
				description: "Gestión de equipos, contratos y valorizaciones de H&M E.I.R.L.",
				lang: "es-PE",
				start_url: "/",
				scope: "/",
				display: "standalone",
				orientation: "any",
				theme_color: "#005A9C",
				background_color: "#FFFFFF",
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
				cleanupOutdatedCaches: true,
			},
			devOptions: {
				enabled: false,
			},
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "src"),
		},
	},
	server: {
		port: 3000,
	},
});

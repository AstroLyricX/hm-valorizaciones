import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// En GitHub Pages la app vive en /<repositorio>/ (el workflow define BASE_PATH); en local, en /.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
	base,
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
				start_url: base,
				scope: base,
				display: "standalone",
				orientation: "any",
				theme_color: "#005A9C",
				background_color: "#FFFFFF",
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
				// Abre la pantalla del aviso al tocar una notificación del sistema.
				importScripts: ["avisos-sw.js"],
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

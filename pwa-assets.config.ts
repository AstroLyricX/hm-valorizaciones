import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

export default defineConfig({
	headLinkOptions: {
		preset: "2023",
	},
	preset: {
		...minimal2023Preset,
		transparent: {
			...minimal2023Preset.transparent,
			resizeOptions: { background: "#FFFFFF" },
			// El favicon de pestaña es public/favicon.svg (diseño propio); no se genera desde el logo.
			favicons: [],
		},
		maskable: {
			...minimal2023Preset.maskable,
			resizeOptions: { background: "#FFFFFF" },
		},
		apple: {
			...minimal2023Preset.apple,
			resizeOptions: { background: "#FFFFFF" },
		},
	},
	images: ["public/logo-hm.png"],
});

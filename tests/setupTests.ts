import "fake-indexeddb/auto";
import "@testing-library/jest-dom";

// jsdom no implementa matchMedia (lo usan el sidebar y useIsMobile). Se simula escritorio.
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string): MediaQueryList =>
		({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
		}) as MediaQueryList,
});

// jsdom tampoco implementa scrollTo (lo usa ScrollRestoration y el selector al abrirse).
window.scrollTo = () => undefined;
Element.prototype.scrollTo = () => undefined;

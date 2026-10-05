import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import { ReloadPrompt } from "./components/ReloadPrompt";

// Pide al navegador no borrar los datos locales (IndexedDB) cuando falte espacio.
// Algunos navegadores no exponen navigator.storage; en ese caso no se hace nada.
if ("storage" in navigator && "persist" in navigator.storage) {
	void navigator.storage.persist().catch(() => false);
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
	<React.StrictMode>
		<App />
		<ReloadPrompt />
	</React.StrictMode>,
);

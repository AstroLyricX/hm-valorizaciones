import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import { ReloadPrompt } from "./components/ReloadPrompt";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
	<React.StrictMode>
		<App />
		<ReloadPrompt />
	</React.StrictMode>,
);

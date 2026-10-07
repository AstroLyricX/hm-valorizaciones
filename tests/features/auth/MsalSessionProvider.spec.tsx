import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
	type ClienteMsal,
	MsalSessionProvider,
} from "../../../src/features/auth/MsalSessionProvider";
import { useSession } from "../../../src/features/auth/useSession";

const ANA: AccountInfo = {
	homeAccountId: "uid.tid",
	environment: "login.microsoftonline.com",
	tenantId: "tid",
	username: "ana@hmcontratistas.com",
	localAccountId: "uid",
	name: "Ana Quispe",
	idTokenClaims: { roles: ["ADMIN"] },
};

// MSAL simulado: el mismo contrato que PublicClientApplication, sin red.
function clienteSimulado({
	cuentas = [] as AccountInfo[],
	redireccion = null as AuthenticationResult | null,
} = {}) {
	let activa: AccountInfo | null = null;
	const cliente = {
		initialize: jest.fn(async () => Promise.resolve()),
		handleRedirectPromise: jest.fn(async () => Promise.resolve(redireccion)),
		getActiveAccount: jest.fn(() => activa),
		getAllAccounts: jest.fn(() => cuentas),
		setActiveAccount: jest.fn((cuenta: AccountInfo | null) => {
			activa = cuenta;
		}),
		loginRedirect: jest.fn(async () => Promise.resolve()),
		logoutRedirect: jest.fn(async () => Promise.resolve()),
		clearCache: jest.fn(async () => Promise.resolve()),
	};

	return cliente satisfies ClienteMsal;
}

function Sesion() {
	const { user, isLoading, destino, modo, signIn, signOut } = useSession();

	if (isLoading) {
		return <p>Cargando</p>;
	}

	return (
		<div>
			<p>{user ? `${user.name} · ${user.email} · ${user.rol}` : "Sin sesión"}</p>
			<p>Destino: {destino ?? "—"}</p>
			<p>Modo: {modo}</p>
			<button type="button" onClick={() => void signIn("/contratos")}>
				Entrar
			</button>
			<button type="button" onClick={() => void signOut()}>
				Salir
			</button>
		</div>
	);
}

function renderizar(cliente: ClienteMsal) {
	render(
		<MsalSessionProvider cliente={cliente}>
			<Sesion />
		</MsalSessionProvider>,
	);
}

afterEach(() => {
	Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

test("recuerda la cuenta guardada en el dispositivo, también sin conexión", async () => {
	Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
	const cliente = clienteSimulado({ cuentas: [ANA] });
	renderizar(cliente);

	expect(
		await screen.findByText("Ana Quispe · ana@hmcontratistas.com · ADMIN"),
	).toBeInTheDocument();
	expect(screen.getByText("Modo: microsoft")).toBeInTheDocument();
	expect(cliente.setActiveAccount).toHaveBeenCalledWith(ANA);
});

test("al volver del login de Microsoft toma la cuenta y la ruta de origen", async () => {
	const cliente = clienteSimulado({
		redireccion: { account: ANA, state: "/valorizaciones" } as AuthenticationResult,
	});
	renderizar(cliente);

	expect(await screen.findByText(/Ana Quispe/)).toBeInTheDocument();
	expect(screen.getByText("Destino: /valorizaciones")).toBeInTheDocument();
});

test("iniciar sesión redirige a Microsoft pidiendo los permisos y la ruta de vuelta", async () => {
	const user = userEvent.setup();
	const cliente = clienteSimulado();
	renderizar(cliente);

	expect(await screen.findByText("Sin sesión")).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Entrar" }));

	expect(cliente.loginRedirect).toHaveBeenCalledWith({
		scopes: ["User.Read", "Files.ReadWrite.AppFolder"],
		state: "/contratos",
		prompt: "select_account",
	});
});

test("al salir con conexión cierra la sesión de Microsoft; sin conexión, solo la del dispositivo", async () => {
	const user = userEvent.setup();
	const conRed = clienteSimulado({ cuentas: [ANA] });
	renderizar(conRed);
	await user.click(await screen.findByRole("button", { name: "Salir" }));

	expect(await screen.findByText("Sin sesión")).toBeInTheDocument();
	expect(conRed.logoutRedirect).toHaveBeenCalledWith(expect.objectContaining({ account: ANA }));
	expect(conRed.clearCache).not.toHaveBeenCalled();
});

test("sin conexión, salir borra la cuenta del dispositivo", async () => {
	const user = userEvent.setup();
	Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
	const sinRed = clienteSimulado({ cuentas: [ANA] });
	renderizar(sinRed);
	await user.click(await screen.findByRole("button", { name: "Salir" }));

	await waitFor(() => {
		expect(sinRed.clearCache).toHaveBeenCalledWith({ account: ANA });
	});
	expect(sinRed.logoutRedirect).not.toHaveBeenCalled();
	expect(sinRed.setActiveAccount).toHaveBeenLastCalledWith(null);
});

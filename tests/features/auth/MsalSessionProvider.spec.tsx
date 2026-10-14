import {
	type AccountInfo,
	type AuthenticationResult,
	InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
	type ClienteMsal,
	MsalSessionProvider,
} from "../../../src/features/auth/MsalSessionProvider";
import { ReautenticacionRequeridaError } from "../../../src/features/auth/SessionContext";
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
		acquireTokenSilent: jest.fn(async () =>
			Promise.resolve({ accessToken: "token-graph" } as AuthenticationResult),
		),
		acquireTokenRedirect: jest.fn(async () => Promise.resolve()),
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

	// El login pide solo el perfil; SharePoint se pide al sincronizar.
	expect(cliente.loginRedirect).toHaveBeenCalledWith({
		scopes: ["User.Read"],
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

test("da el token de Graph en silencio y pide volver a entrar si Microsoft lo exige", async () => {
	const cliente = clienteSimulado({ cuentas: [ANA] });
	let obtener: (() => Promise<string>) | undefined;
	function Token() {
		obtener = useSession().obtenerToken;

		return null;
	}
	render(
		<MsalSessionProvider cliente={cliente}>
			<Token />
		</MsalSessionProvider>,
	);
	await waitFor(() => {
		expect(cliente.setActiveAccount).toHaveBeenCalledWith(ANA);
	});

	expect(await obtener?.()).toBe("token-graph");
	expect(cliente.acquireTokenSilent).toHaveBeenCalledWith({
		scopes: ["Sites.ReadWrite.All"],
		account: ANA,
	});

	cliente.acquireTokenSilent.mockRejectedValueOnce(
		new InteractionRequiredAuthError("login_required", "correlacion-1"),
	);
	await expect(obtener?.()).rejects.toBeInstanceOf(ReautenticacionRequeridaError);
});

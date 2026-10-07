import type { AccountInfo } from "@azure/msal-browser";

import { puede, rolDesdeClaims, usuarioDesdeCuenta } from "../../../src/features/auth/roles";

function cuenta(cambios: Partial<AccountInfo> = {}): AccountInfo {
	return {
		homeAccountId: "uid.tid",
		environment: "login.microsoftonline.com",
		tenantId: "tid",
		username: "Ana.Quispe@HMContratistas.com",
		localAccountId: "uid",
		name: "Ana Quispe",
		...cambios,
	};
}

describe("roles", () => {
	it("es ADMIN solo si Entra ID le asignó el rol ADMIN", () => {
		expect(rolDesdeClaims(["ADMIN"])).toBe("ADMIN");
		expect(rolDesdeClaims(["OPERADOR", "ADMIN"])).toBe("ADMIN");
		expect(rolDesdeClaims(["OPERADOR"])).toBe("OPERADOR");
		// Cuenta personal o sin rol asignado.
		expect(rolDesdeClaims(undefined)).toBe("OPERADOR");
		expect(rolDesdeClaims("ADMIN")).toBe("OPERADOR");
	});

	it("solo el administrador configura y anula", () => {
		expect(puede("ADMIN", "configurar")).toBe(true);
		expect(puede("ADMIN", "anular")).toBe(true);
		expect(puede("OPERADOR", "configurar")).toBe(false);
		expect(puede("OPERADOR", "anular")).toBe(false);
		expect(puede(undefined, "anular")).toBe(false);
	});

	it("arma el usuario con el correo en minúsculas y el rol del token", () => {
		expect(usuarioDesdeCuenta(cuenta({ idTokenClaims: { roles: ["ADMIN"] } }))).toEqual({
			name: "Ana Quispe",
			email: "ana.quispe@hmcontratistas.com",
			rol: "ADMIN",
		});
		// Una cuenta personal trae el correo en el claim "email".
		expect(
			usuarioDesdeCuenta(
				cuenta({ name: undefined, username: "", idTokenClaims: { email: "luis@outlook.com" } }),
			),
		).toEqual({ name: "luis@outlook.com", email: "luis@outlook.com", rol: "OPERADOR" });
	});
});

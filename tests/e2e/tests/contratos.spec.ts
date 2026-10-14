import {
	datosGeneralesDelContrato,
	llenarEquipo,
	registrarCliente,
	registrarEquipo,
	registrarProveedor,
} from "../support/datos";
import { iniciarSesion } from "../support/sesion";

const DUENO = "HUISE QUEA ANTOLIN";

describe("Contratos", () => {
	beforeEach(() => {
		cy.viewport(1280, 900);
		iniciarSesion();
		registrarCliente("Constructora Andina SAC", "20602629903");
		registrarProveedor("Huise Quea Antolin", "10098637074");
		registrarEquipo({
			activoFijo: "AF-001",
			descripcion: "Excavadora",
			fabricante: "CAT",
			modelo: "340",
			placa: "EXC-340",
			dueno: DUENO,
		});
		registrarEquipo({
			activoFijo: "AF-002",
			descripcion: "Volquete",
			fabricante: "Volvo",
			modelo: "FMX",
			placa: "V3K-882",
			dueno: DUENO,
		});
	});

	it("registra un contrato con 2 equipos y muestra el monto contractual", () => {
		cy.visit("/contratos");
		cy.findByRole("table").findByRole("button", { name: "Nuevo" }).click();

		datosGeneralesDelContrato();
		cy.findByRole("button", { name: "Agregar equipo" }).click();
		llenarEquipo(1, /EXCAVADORA CAT 340/, "150", "47");
		cy.findByRole("button", { name: "Agregar equipo" }).click();
		llenarEquipo(2, /VOLQUETE VOLVO FMX/, "20", "850");
		cy.findByLabelText("Monto contractual").should("have.text", "USD 24,050.00");
		cy.findByRole("dialog").findByRole("button", { name: "Guardar" }).click();

		cy.findByText("Contrato CTR-001 registrado.").should("exist");
		cy.findByRole("heading", { level: 1, name: "GESTIÓN GENERAL DE SUBCONTRATOS - OSUR" }).should(
			"exist",
		);
		cy.findByRole("region", { name: "Equipos del contrato" }).should(
			"contain.text",
			"VOLQUETE VOLVO FMX",
		);

		cy.get("main").findByRole("link", { name: "Contratos" }).click();
		cy.findByRole("table").findByText("USD 24,050.00").should("exist");
	});
});

// El alta se abre con el botón de la cabecera de la página ("Agregar cliente", "Nuevo contrato"…).
export function abrirNuevo(etiqueta: string): void {
	cy.contains("button:visible", new RegExp(`^${etiqueta}$`)).click();
}

// Los selectores son propios: se abre el campo y se elige la opción de la lista flotante,
// que se muestra fuera del formulario.
export function seleccionar(etiqueta: RegExp | string, opcion: RegExp | string): void {
	cy.findByRole("dialog").findByLabelText(etiqueta).click();
	cy.findByRole("option", { name: opcion }).click();
}

// El calendario se abre desde el campo; se elige año, mes y día.
export function elegirFecha(etiqueta: RegExp, iso: string): void {
	const [anio, mes, dia] = iso.split("-").map(Number);
	const nombreMes = new Date(anio, mes - 1, 1).toLocaleDateString("es-PE", { month: "long" });
	cy.findByRole("dialog").findByLabelText(etiqueta).click();
	cy.findByRole("combobox", { name: "Elegir el año" }).select(`${anio}`);
	cy.findByRole("combobox", { name: "Elegir el mes" }).select(`${mes - 1}`);
	cy.findByRole("button", {
		name: new RegExp(`, ${dia} de ${nombreMes} de ${anio}$`, "i"),
	}).click();
}

export function datosDelCliente(razonSocial: string, ruc: string): void {
	cy.findByRole("dialog").within(() => {
		cy.findByLabelText(/Razón social/).type(razonSocial);
		cy.findByLabelText(/RUC/).type(ruc);
		cy.findByLabelText(/Correo/).type("obras@empresa.pe");
		cy.findAllByLabelText(/^Dirección/)
			.first()
			.type("Jr. Bellavista S/N");
		cy.findByLabelText(/Nombre completo/).type("Juan Pérez Quispe");
		cy.findByLabelText(/DNI/).type("40123456");
		cy.findByLabelText(/Teléfono/).type("951234567");
	});
}

// Registra un cliente o un proveedor desde su pantalla (mismos datos, listas separadas).
function registrarTercero(ruta: string, etiqueta: string, razonSocial: string, ruc: string): void {
	cy.visit(ruta);
	abrirNuevo(etiqueta);
	datosDelCliente(razonSocial, ruc);
	cy.findByRole("dialog").findByRole("button", { name: "Guardar" }).click();
	cy.findByRole("dialog").should("not.exist");
}

export function registrarCliente(razonSocial: string, ruc: string): void {
	registrarTercero("/clientes", "Agregar cliente", razonSocial, ruc);
}

// Los dueños de los equipos son proveedores.
export function registrarProveedor(razonSocial: string, ruc: string): void {
	registrarTercero("/proveedores", "Agregar proveedor", razonSocial, ruc);
}

interface DatosEquipo {
	activoFijo: string;
	descripcion: string;
	fabricante: string;
	modelo: string;
	placa: string;
	dueno: string;
}

export function datosDelEquipo(equipo: DatosEquipo): void {
	cy.findByRole("dialog").within(() => {
		cy.findByLabelText(/Activo fijo/).type(equipo.activoFijo);
		cy.findByLabelText(/Descripción del equipo/).type(equipo.descripcion);
		cy.findByLabelText(/Fabricante/).type(equipo.fabricante);
		cy.findByLabelText(/^Modelo/).type(equipo.modelo);
		cy.findByLabelText(/Placa/).type(equipo.placa);
		cy.findByLabelText(/Año/).type("2019");
		cy.findByLabelText(/Marca del motor/).type(equipo.fabricante);
	});
	seleccionar(/Dueño/, equipo.dueno);
}

// Registra un equipo desde la pantalla de Equipos.
export function registrarEquipo(equipo: DatosEquipo): void {
	cy.visit("/equipos");
	abrirNuevo("Agregar equipo");
	datosDelEquipo(equipo);
	cy.findByRole("dialog").findByRole("button", { name: "Guardar" }).click();
	cy.findByRole("dialog").should("not.exist");
}

export function datosGeneralesDelContrato(): void {
	seleccionar(/Cliente/, "CONSTRUCTORA ANDINA SAC");
	cy.findByRole("dialog").within(() => {
		cy.findByLabelText(/Proyecto/).type("Gestión general de subcontratos - OSUR");
		cy.findByLabelText(/Ubicación/).type("Asillo - San Antón");
	});
	elegirFecha(/Fecha de inicio/, "2026-08-01");
	elegirFecha(/Fecha de fin/, "2026-12-31");
}

export function llenarEquipo(numero: number, equipo: RegExp, horas: string, costo: string): void {
	seleccionar(`Equipo del ítem ${numero}`, equipo);
	cy.findByLabelText(`Horas mínimas del ítem ${numero}`).type(horas);
	cy.findByLabelText(`Costo por hora del ítem ${numero}`).type(costo);
}

// Cliente, proveedor dueño de la excavadora y contrato de 150 h a USD 47.00 (USD 7,050.00), como el xlsm.
export function registrarContratoDelXlsm(): void {
	registrarCliente("Constructora Andina SAC", "20602629903");
	registrarProveedor("Huise Quea Antolin", "10098637074");
	registrarEquipo({
		activoFijo: "AF-001",
		descripcion: "Excavadora",
		fabricante: "CAT",
		modelo: "340",
		placa: "EXC-340",
		dueno: "HUISE QUEA ANTOLIN",
	});
	cy.visit("/contratos");
	abrirNuevo("Nuevo contrato");
	datosGeneralesDelContrato();
	// El contrato del xlsm es en dólares (la moneda por defecto es soles).
	seleccionar(/Moneda/, "Dólares (USD)");
	cy.findByRole("button", { name: "Agregar equipo" }).click();
	llenarEquipo(1, /EXCAVADORA CAT 340/, "150", "47");
	cy.findByRole("dialog").findByRole("button", { name: "Guardar" }).click();
	cy.findByText("Contrato CTR-001 registrado.").should("exist");
}

// En escritorio el alta se abre con "+ Nuevo" de la tabla; en celular, con el botón de la cabecera.
export function abrirNuevo(etiquetaCelular: string): void {
	cy.contains("button:visible", new RegExp(`^(Nuevo|${etiquetaCelular})$`)).click();
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

// Registra un cliente desde la pantalla de Clientes.
export function registrarCliente(razonSocial: string, ruc: string): void {
	cy.visit("/clientes");
	abrirNuevo("Agregar cliente");
	datosDelCliente(razonSocial, ruc);
	cy.findByRole("dialog").findByRole("button", { name: "Guardar" }).click();
	cy.findByRole("dialog").should("not.exist");
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

import type { TerceroDatosInput } from "../../src/features/clientes/domain/tercero";
import type { EquipoDatosInput } from "../../src/features/equipos/domain/equipo";

// Datos de prueba tomados del xlsm (hojas CLIENTES y EQUIPOS).
export const CLIENTE: TerceroDatosInput = {
	razonSocial: "Constructora Andina SAC",
	ruc: "20602629903",
	direccion: "Jr. Bellavista S/N",
	correo: "obras@andina.pe",
	estado: "ACTIVO",
	representanteNombre: "Juan Pérez Quispe",
	representanteDni: "40123456",
	representanteTelefono: "951 234 567",
	representanteDireccion: "",
	representanteEstadoCivil: "",
	banco: "",
	numeroCuenta: "",
	cci: "",
	prefijoEquipos: "",
};

export const HUISE: TerceroDatosInput = {
	...CLIENTE,
	razonSocial: "Huise Quea Antolin",
	ruc: "10098637074",
	direccion: "Jr. Bellavista S/N - Ollachea",
	correo: "huise@correo.pe",
	representanteNombre: "Antolin Huise Quea",
	representanteDni: "02345678",
	representanteTelefono: "931 161 371",
};

export function excavadora(
	duenoId: string,
	cambios: Partial<EquipoDatosInput> = {},
): EquipoDatosInput {
	return {
		descripcion: "Excavadora",
		fabricante: "CAT",
		modelo: "340",
		serieEquipo: "",
		marcaMotor: "CAT",
		tipoMotor: "",
		serieMotor: "",
		placa: "EXC-340",
		anio: "2019",
		categoria: "PESADO",
		estado: cambios.propiedad === "PROPIO" ? "P" : "PR",
		propiedad: "PROVEEDOR",
		duenoId,
		observaciones: "",
		...cambios,
	};
}

export function volquete(
	duenoId: string,
	cambios: Partial<EquipoDatosInput> = {},
): EquipoDatosInput {
	return excavadora(duenoId, {
		descripcion: "Volquete",
		fabricante: "Volvo",
		modelo: "FMX",
		marcaMotor: "Volvo",
		placa: "V3K-882",
		...cambios,
	});
}

// "Hoy" fijo para crear valorizaciones: dentro de la vigencia del contrato de prueba
// (01/08/2026 al 31/12/2026), para que las pruebas no dependan de la fecha real.
export const HOY = "2026-09-15";

import Big from "big.js";

import {
	ETIQUETA_ESTADO,
	ETIQUETA_ESTADO_CIVIL,
	type Tercero,
} from "@/features/clientes/domain/tercero";
import {
	type Contrato,
	type ContratoEquipo,
	estadoContrato,
	ETIQUETA_ESTADO_CONTRATO,
	ETIQUETA_TIPO_CONTRATO,
	parcialEquipo,
} from "@/features/contratos/domain/contrato";
import {
	DUENO_PROPIO,
	type Equipo,
	ETIQUETA_CATEGORIA,
	ETIQUETA_ESTADO_EQUIPO,
	nombreEquipo,
} from "@/features/equipos/domain/equipo";
import {
	calcularValorizacion,
	ETIQUETA_ESTADO_VALORIZACION,
	ETIQUETA_TIPO_VALORIZACION,
	formatearPeriodo,
	type Valorizacion,
	type ValorizacionItem,
} from "@/features/valorizaciones/domain/valorizacion";

export type Celda = string | number | Date | null;
export type Fila = Record<string, Celda>;

export interface Hoja {
	nombre: string;
	columnas: string[];
	// Columnas con montos o horas: se escriben con 2 decimales.
	numericas: string[];
	filas: Fila[];
}

export interface DatosExportacion {
	terceros: readonly Tercero[];
	equipos: readonly Equipo[];
	contratos: readonly Contrato[];
	contratoEquipos: readonly ContratoEquipo[];
	valorizaciones: readonly Valorizacion[];
	valorizacionItems: readonly ValorizacionItem[];
	hoy: string;
}

function monto(centavos: number | null | undefined): number | null {
	return centavos === null || centavos === undefined ? null : new Big(centavos).div(100).toNumber();
}

function cantidad(valor: string | null | undefined): number | null {
	return valor === null || valor === undefined ? null : Number(valor);
}

// Fecha ISO "2026-08-01" como fecha de Excel (sin desfase de zona horaria).
function fecha(iso: string | null | undefined): Date | null {
	if (!iso) {
		return null;
	}
	const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);

	return new Date(Date.UTC(anio, mes - 1, dia));
}

type Columnas<T> = readonly (readonly [string, (registro: T) => Celda])[];

// Cada hoja declara sus columnas: así el encabezado sale aunque no haya registros.
function hoja<T>(
	nombre: string,
	columnas: Columnas<T>,
	registros: readonly T[],
	numericas: string[] = [],
): Hoja {
	return {
		nombre,
		columnas: columnas.map(([columna]) => columna),
		numericas,
		filas: registros.map((registro) =>
			Object.fromEntries(columnas.map(([columna, valor]) => [columna, valor(registro)])),
		),
	};
}

interface DetalleExportado {
	item: ValorizacionItem;
	valorizacion: Valorizacion;
	orden: number | null;
	calculado: ReturnType<typeof calcularValorizacion>["items"][number];
}

// Libro de respaldo con todos los registros vigentes, con las mismas hojas que el xlsm.
export function libroExcel(datos: DatosExportacion): Hoja[] {
	const { terceros, equipos, contratos, contratoEquipos, valorizaciones, valorizacionItems, hoy } =
		datos;
	const porTercero = new Map(terceros.map((tercero) => [tercero.id, tercero]));
	const porEquipo = new Map(equipos.map((equipo) => [equipo.id, equipo]));
	const porContrato = new Map(contratos.map((contrato) => [contrato.id, contrato]));
	const porContratoEquipo = new Map(contratoEquipos.map((item) => [item.id, item]));
	const porValorizacion = new Map(
		valorizaciones.map((valorizacion) => [valorizacion.id, valorizacion]),
	);
	const cliente = (terceroId: string | undefined) =>
		terceroId === undefined ? undefined : porTercero.get(terceroId);

	// Clientes y proveedores tienen los mismos datos: cada lista en su hoja.
	const columnasTercero: Columnas<Tercero> = [
		["Código", (tercero) => tercero.codigo],
		["Razón social", (tercero) => tercero.razonSocial],
		["RUC", (tercero) => tercero.ruc],
		["Dirección", (tercero) => tercero.direccion],
		["Correo", (tercero) => tercero.correo],
		["Estado", (tercero) => ETIQUETA_ESTADO[tercero.estado]],
		["Representante", (tercero) => tercero.representanteNombre],
		["DNI del representante", (tercero) => tercero.representanteDni],
		["Teléfono del representante", (tercero) => tercero.representanteTelefono],
		["Dirección del representante", (tercero) => tercero.representanteDireccion],
		[
			"Estado civil",
			(tercero) =>
				tercero.representanteEstadoCivil
					? ETIQUETA_ESTADO_CIVIL[tercero.representanteEstadoCivil]
					: "",
		],
		["Banco", (tercero) => tercero.banco],
		["N.° de cuenta", (tercero) => tercero.numeroCuenta],
		["CCI", (tercero) => tercero.cci],
	];
	const clientes = hoja(
		"CLIENTES",
		columnasTercero,
		terceros.filter((tercero) => tercero.tipo === "CLIENTE"),
	);
	const proveedores = hoja(
		"PROVEEDORES",
		[
			...columnasTercero.slice(0, 2),
			["Código de equipos", (tercero) => tercero.prefijoEquipos],
			...columnasTercero.slice(2),
		],
		terceros.filter((tercero) => tercero.tipo === "PROVEEDOR"),
	);

	const hojaEquipos = hoja<Equipo>(
		"EQUIPOS",
		[
			["Activo fijo", (equipo) => equipo.activoFijo],
			["Descripción", (equipo) => equipo.descripcion],
			["Fabricante", (equipo) => equipo.fabricante],
			["Modelo", (equipo) => equipo.modelo],
			["Serie del equipo", (equipo) => equipo.serieEquipo],
			["Marca del motor", (equipo) => equipo.marcaMotor],
			["Tipo de motor", (equipo) => equipo.tipoMotor],
			["Serie del motor", (equipo) => equipo.serieMotor],
			["Placa", (equipo) => equipo.placa],
			["Año", (equipo) => Number(equipo.anio)],
			["Categoría", (equipo) => ETIQUETA_CATEGORIA[equipo.categoria]],
			["Estado", (equipo) => `${equipo.estado} · ${ETIQUETA_ESTADO_EQUIPO[equipo.estado]}`],
			[
				"Dueño",
				(equipo) =>
					equipo.propiedad === "PROPIO"
						? DUENO_PROPIO
						: (cliente(equipo.duenoId)?.razonSocial ?? ""),
			],
			["Observaciones", (equipo) => equipo.observaciones],
		],
		equipos,
	);

	const hojaContratos = hoja<Contrato>(
		"CONTRATOS",
		[
			["Código", (contrato) => contrato.codigo],
			["Documento contractual", (contrato) => contrato.documentoContractual],
			["Tipo", (contrato) => ETIQUETA_TIPO_CONTRATO[contrato.tipo]],
			["Cód. cliente o proveedor", (contrato) => cliente(contrato.terceroId)?.codigo ?? ""],
			["Cliente o proveedor", (contrato) => cliente(contrato.terceroId)?.razonSocial ?? ""],
			["Proyecto", (contrato) => contrato.proyecto],
			["Ubicación", (contrato) => contrato.ubicacion],
			["Fecha de inicio", (contrato) => fecha(contrato.fechaInicio)],
			["Fecha de fin", (contrato) => fecha(contrato.fechaFin)],
			["Moneda", (contrato) => contrato.moneda],
			["Monto contractual", (contrato) => monto(contrato.montoContractual)],
			["Fondo de garantía (%)", (contrato) => contrato.fondoGarantiaPct],
			["Estado", (contrato) => ETIQUETA_ESTADO_CONTRATO[estadoContrato(contrato, hoy)]],
			["Observaciones", (contrato) => contrato.observaciones],
		],
		contratos,
		["Monto contractual"],
	);

	const codigoContrato = (contratoId: string) => porContrato.get(contratoId)?.codigo ?? "";
	const hojaEquiposContrato = hoja<ContratoEquipo>(
		"EQUIPOS_CONTRATO",
		[
			["Contrato", (item) => codigoContrato(item.contratoId)],
			["Ítem", (item) => item.orden],
			["Activo fijo", (item) => porEquipo.get(item.equipoId)?.activoFijo ?? ""],
			[
				"Equipo",
				(item) => {
					const equipo = porEquipo.get(item.equipoId);

					return equipo ? nombreEquipo(equipo) : "";
				},
			],
			["Horas mínimas", (item) => cantidad(item.horasMinimas)],
			["Costo por hora", (item) => monto(item.costoHora)],
			["Parcial", (item) => monto(parcialEquipo(item))],
		],
		[...contratoEquipos]
			.filter((item) => porContrato.has(item.contratoId))
			.sort(
				(a, b) =>
					codigoContrato(a.contratoId).localeCompare(codigoContrato(b.contratoId)) ||
					a.orden - b.orden,
			),
		["Horas mínimas", "Costo por hora", "Parcial"],
	);

	const contratoDe = (valorizacion: Valorizacion) => porContrato.get(valorizacion.contratoId);
	const hojaValorizaciones = hoja<Valorizacion>(
		"VALORIZACIONES",
		[
			["N.° valorización", (valorizacion) => valorizacion.numero ?? ""],
			["Contrato", (valorizacion) => contratoDe(valorizacion)?.codigo ?? ""],
			[
				"Tipo",
				(valorizacion) => {
					const contrato = contratoDe(valorizacion);

					return contrato ? ETIQUETA_TIPO_VALORIZACION[contrato.tipo] : "";
				},
			],
			[
				"Cliente o proveedor",
				(valorizacion) => cliente(contratoDe(valorizacion)?.terceroId)?.razonSocial ?? "",
			],
			["Proyecto", (valorizacion) => contratoDe(valorizacion)?.proyecto ?? ""],
			["Periodo", (valorizacion) => formatearPeriodo(valorizacion.periodo)],
			["Fecha de emisión", (valorizacion) => fecha(valorizacion.fechaEmision)],
			["Moneda", (valorizacion) => valorizacion.moneda],
			["Subtotal 1", (valorizacion) => monto(valorizacion.totales?.subtotal1)],
			["Gastos generales", (valorizacion) => monto(valorizacion.totales?.gastosGenerales)],
			["Utilidad", (valorizacion) => monto(valorizacion.totales?.utilidad)],
			["Subtotal 2", (valorizacion) => monto(valorizacion.totales?.subtotal2)],
			["IGV", (valorizacion) => monto(valorizacion.totales?.igv)],
			["Total factura", (valorizacion) => monto(valorizacion.totales?.total)],
			["Fondo de garantía", (valorizacion) => monto(valorizacion.totales?.fondoGarantia)],
			["Neto a pagar", (valorizacion) => monto(valorizacion.totales?.netoPagable)],
			["Estado", (valorizacion) => ETIQUETA_ESTADO_VALORIZACION[valorizacion.estado]],
			["Monto en letras", (valorizacion) => valorizacion.montoEnLetras ?? ""],
			["Motivo de anulación", (valorizacion) => valorizacion.motivoAnulacion ?? ""],
		],
		valorizaciones,
		[
			"Subtotal 1",
			"Gastos generales",
			"Utilidad",
			"Subtotal 2",
			"IGV",
			"Total factura",
			"Fondo de garantía",
			"Neto a pagar",
		],
	);

	// Detalle de las emitidas y anuladas, con los datos congelados al emitir.
	const detalles = valorizacionItems
		.flatMap((item): DetalleExportado[] => {
			const valorizacion = porValorizacion.get(item.valorizacionId);
			if (!valorizacion || valorizacion.estado === "BORRADOR") {
				return [];
			}
			const [calculado] = calcularValorizacion(
				[
					{
						cantidadContractual: item.cantidadContractual ?? "0",
						precioUnitario: item.precioUnitario ?? 0,
						cantidadAnterior: item.cantidadAnterior ?? "0",
						cantidadActual: item.cantidadActual,
					},
				],
				{ gastosGeneralesPct: 0, utilidadPct: 0, igvPct: 0, fondoGarantiaPct: 0 },
			).items;

			return [
				{
					item,
					valorizacion,
					orden: porContratoEquipo.get(item.contratoEquipoId)?.orden ?? null,
					calculado,
				},
			];
		})
		.sort(
			(a, b) =>
				(a.valorizacion.numero ?? "").localeCompare(b.valorizacion.numero ?? "") ||
				(a.orden ?? 0) - (b.orden ?? 0),
		);
	const hojaDetalle = hoja<DetalleExportado>(
		"DET_VALORIZACIONES",
		[
			["N.° valorización", ({ valorizacion }) => valorizacion.numero ?? ""],
			["Contrato", ({ valorizacion }) => contratoDe(valorizacion)?.codigo ?? ""],
			["Ítem", ({ orden }) => orden],
			["Descripción", ({ item }) => item.descripcion ?? ""],
			["UM", () => "H"],
			["Cant. contractual", ({ item }) => cantidad(item.cantidadContractual)],
			["P.U.", ({ item }) => monto(item.precioUnitario)],
			["Parcial", ({ calculado }) => monto(calculado.parcial)],
			["Cant. anterior", ({ item }) => cantidad(item.cantidadAnterior)],
			["Cant. actual", ({ item }) => cantidad(item.cantidadActual)],
			["Cant. acumulada", ({ calculado }) => cantidad(calculado.cantidadAcumulada)],
			["Importe anterior", ({ calculado }) => monto(calculado.importeAnterior)],
			["Importe actual", ({ calculado }) => monto(calculado.importeActual)],
			["Importe acumulado", ({ calculado }) => monto(calculado.importeAcumulado)],
		],
		detalles,
		[
			"Cant. contractual",
			"P.U.",
			"Parcial",
			"Cant. anterior",
			"Cant. actual",
			"Cant. acumulada",
			"Importe anterior",
			"Importe actual",
			"Importe acumulado",
		],
	);

	return [
		clientes,
		proveedores,
		hojaEquipos,
		hojaContratos,
		hojaEquiposContrato,
		hojaValorizaciones,
		hojaDetalle,
	];
}

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

import { formatearMoneda, formatearMonto } from "@/lib/dinero";
import { formatearFechaNumerica } from "@/lib/fechas";

import { partesDe } from "../application/ValorizacionService";
import type { ColumnaResumen } from "../domain/valorizacion";
import {
	ABREVIATURA_UNIDAD,
	ETIQUETA_TIPO_VALORIZACION,
	formatearPeriodo,
	precioAdicional,
} from "../domain/valorizacion";
import { horas } from "../ui/formato";
import { type DatosPdf, fechaDelPdf, letrasDelPdf } from "./datosPdf";

// Colores del logo (azul H&M) y bordes como la hoja VALORIZACION del xlsm.
const AZUL = "#005A9C";
const AZUL_CLARO = "#E6EFF7";
const BORDE = "#9AA9BC";
const TEXTO = "#0E1E36";
const GRIS = "#5B6B82";

const estilos = StyleSheet.create({
	pagina: {
		paddingTop: 28,
		paddingBottom: 36,
		paddingHorizontal: 28,
		fontFamily: "Helvetica",
		fontSize: 7.5,
		color: TEXTO,
	},
	cabecera: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
	logo: { width: 54, height: 54 },
	titulo: {
		flex: 1,
		textAlign: "center",
		fontFamily: "Helvetica-Bold",
		fontSize: 13,
		color: AZUL,
	},
	cajaNumero: { width: 150, borderWidth: 1, borderColor: BORDE },
	cajaFila: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDE },
	cajaEtiqueta: {
		width: 55,
		padding: 3,
		backgroundColor: AZUL_CLARO,
		fontFamily: "Helvetica-Bold",
	},
	cajaValor: { flex: 1, padding: 3, textAlign: "center" },
	seccion: { marginTop: 6 },
	franja: {
		backgroundColor: AZUL,
		color: "#FFFFFF",
		fontFamily: "Helvetica-Bold",
		padding: 3,
		textAlign: "center",
		fontSize: 8,
	},
	columnas: { flexDirection: "row", gap: 12 },
	columna: { flex: 1 },
	subtitulo: { fontFamily: "Helvetica-Bold", color: AZUL, marginBottom: 2, marginTop: 4 },
	dato: { flexDirection: "row", paddingVertical: 1.5 },
	datoEtiqueta: { width: 90, color: GRIS },
	datoValor: { flex: 1, fontFamily: "Helvetica-Bold" },
	tabla: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: BORDE, marginTop: 6 },
	fila: { flexDirection: "row" },
	celda: {
		borderRightWidth: 1,
		borderBottomWidth: 1,
		borderColor: BORDE,
		paddingVertical: 3,
		paddingHorizontal: 3,
	},
	encabezado: { backgroundColor: AZUL_CLARO, fontFamily: "Helvetica-Bold", textAlign: "center" },
	numero: { textAlign: "right" },
	negrita: { fontFamily: "Helvetica-Bold" },
	pie: { flexDirection: "row", gap: 16, marginTop: 8 },
	son: { flex: 1, borderWidth: 1, borderColor: BORDE, padding: 6 },
	pago: { width: 230, borderWidth: 1, borderColor: BORDE },
	pagoFila: { flexDirection: "row", justifyContent: "space-between", padding: 3 },
	firmas: { flexDirection: "row", gap: 30, marginTop: 44, paddingHorizontal: 20 },
	firma: { flex: 1, borderTopWidth: 1, borderColor: TEXTO, paddingTop: 4, textAlign: "center" },
	marcaAgua: {
		position: "absolute",
		top: 250,
		left: 0,
		right: 0,
		textAlign: "center",
		fontSize: 90,
		fontFamily: "Helvetica-Bold",
		color: "#C8D3E0",
		opacity: 0.35,
		transform: "rotate(-18deg)",
	},
	numeroPagina: {
		position: "absolute",
		bottom: 16,
		right: 28,
		color: GRIS,
		fontSize: 7,
	},
});

// Ancho de cada columna de la planilla (pt). La descripción ocupa el resto.
const ANCHO = {
	item: 26,
	um: 24,
	cantidad: 56,
	precio: 50,
	importe: 64,
} as const;

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
	return (
		<View style={estilos.dato}>
			<Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
			<Text style={estilos.datoValor}>{valor === "" ? "—" : valor}</Text>
		</View>
	);
}

function Celda({
	ancho,
	children,
	estilo = [],
}: {
	ancho?: number;
	children?: string;
	estilo?: Style[];
}) {
	return (
		<Text style={[estilos.celda, ancho === undefined ? { flex: 1 } : { width: ancho }, ...estilo]}>
			{children}
		</Text>
	);
}

const RESUMEN: readonly { etiqueta: (datos: DatosPdf) => string; campo: keyof ColumnaResumen }[] = [
	{ etiqueta: () => "Subtotal 1", campo: "subtotal1" },
	{
		etiqueta: ({ planilla }) => `Gastos generales (${planilla.valorizacion.gastosGeneralesPct} %)`,
		campo: "gastosGenerales",
	},
	{
		etiqueta: ({ planilla }) => `Utilidad (${planilla.valorizacion.utilidadPct} %)`,
		campo: "utilidad",
	},
	{ etiqueta: () => "Subtotal 2", campo: "subtotal2" },
	{ etiqueta: ({ planilla }) => `IGV ${planilla.valorizacion.igvPct} %`, campo: "igv" },
	{ etiqueta: () => "TOTAL DE LA FACTURA", campo: "total" },
];

// Formato imprimible de la hoja VALORIZACION: A4 horizontal, con la cabecera en cada página.
export function ValorizacionPDF(datos: DatosPdf) {
	const { planilla, calculo, logo } = datos;
	const { valorizacion, contrato, empresa, filas } = planilla;
	const { contratante, proveedor } = partesDe(planilla);
	const moneda = valorizacion.moneda;
	const marca =
		valorizacion.estado === "BORRADOR"
			? "BORRADOR"
			: valorizacion.estado === "ANULADA"
				? "ANULADA"
				: null;
	const anchoContractual = ANCHO.cantidad + ANCHO.precio + ANCHO.importe;
	const anchoCantidades = ANCHO.cantidad * 3;
	const anchoImportes = ANCHO.importe * 3;

	return (
		<Document
			title={`Valorización ${valorizacion.numero ?? formatearPeriodo(valorizacion.periodo)}`}
			author={empresa.razonSocial}
			subject={`${contrato.codigo} · ${contrato.proyecto}`}
		>
			<Page size="A4" orientation="landscape" style={estilos.pagina}>
				{marca && (
					<Text fixed style={estilos.marcaAgua}>
						{marca}
					</Text>
				)}

				<View fixed style={estilos.cabecera}>
					<Image src={logo} style={estilos.logo} />
					<Text style={estilos.titulo}>VALORIZACIÓN DE EQUIPOS Y CANTERAS</Text>
					<View style={estilos.cajaNumero}>
						<View style={estilos.cajaFila}>
							<Text style={estilos.cajaEtiqueta}>N.° VAL.</Text>
							<Text style={[estilos.cajaValor, estilos.negrita]}>
								{valorizacion.numero ?? "BORRADOR"}
							</Text>
						</View>
						<View style={estilos.cajaFila}>
							<Text style={estilos.cajaEtiqueta}>FECHA</Text>
							<Text style={estilos.cajaValor}>{formatearFechaNumerica(fechaDelPdf(planilla))}</Text>
						</View>
						<View style={estilos.cajaFila}>
							<Text style={estilos.cajaEtiqueta}>TIPO</Text>
							<Text style={estilos.cajaValor}>
								{ETIQUETA_TIPO_VALORIZACION[contrato.tipo].toUpperCase()}
							</Text>
						</View>
						<View style={[estilos.cajaFila, { borderBottomWidth: 0 }]}>
							<Text style={estilos.cajaEtiqueta}>PERIODO</Text>
							<Text style={estilos.cajaValor}>
								{formatearPeriodo(valorizacion.periodo).toUpperCase()}
							</Text>
						</View>
					</View>
				</View>

				<Dato etiqueta="Proyecto" valor={contrato.proyecto} />
				<Dato etiqueta="Ubicación" valor={contrato.ubicacion} />

				<View style={estilos.seccion}>
					<Text style={estilos.franja}>DATOS PARA FACTURACIÓN</Text>
					<View style={estilos.columnas}>
						<View style={estilos.columna}>
							<Text style={estilos.subtitulo}>DEL CONTRATANTE</Text>
							<Dato etiqueta="Razón social" valor={contratante.razonSocial} />
							<Dato etiqueta="Dirección legal" valor={contratante.direccion} />
							<Dato etiqueta="RUC" valor={contratante.ruc} />
							<Dato etiqueta="Teléfonos" valor={contratante.telefono} />
						</View>
						<View style={estilos.columna}>
							<Text style={estilos.subtitulo}>DEL PROVEEDOR</Text>
							<Dato etiqueta="Razón social" valor={proveedor.razonSocial} />
							<Dato etiqueta="Dirección legal" valor={proveedor.direccion} />
							<Dato etiqueta="RUC" valor={proveedor.ruc} />
							<Dato etiqueta="Teléfonos" valor={proveedor.telefono} />
						</View>
					</View>
				</View>

				<View style={[estilos.seccion, estilos.columnas]}>
					<View style={estilos.columna}>
						<Dato etiqueta="Nombre del servicio" valor={valorizacion.nombreServicio} />
						<Dato etiqueta="Tipo de servicio" valor="ALQUILER" />
						<Dato etiqueta="Plazo de pago" valor={valorizacion.plazoPago} />
					</View>
					<View style={estilos.columna}>
						<Dato etiqueta="Documento contractual" valor={contrato.documentoContractual} />
						<Dato
							etiqueta="Monto contractual"
							valor={formatearMoneda(contrato.montoContractual, moneda)}
						/>
						<Dato
							etiqueta="Saldo contractual"
							valor={formatearMoneda(calculo.saldoContractual, moneda)}
						/>
					</View>
					<View style={estilos.columna}>
						<Dato
							etiqueta="Inicio de contrato"
							valor={formatearFechaNumerica(contrato.fechaInicio)}
						/>
						<Dato etiqueta="Fin de contrato" valor={formatearFechaNumerica(contrato.fechaFin)} />
						<Dato
							etiqueta="Fondo de garantía"
							valor={`${valorizacion.fondoGarantiaPct.toLocaleString("es-PE")} %`}
						/>
					</View>
				</View>

				<View style={estilos.seccion}>
					<Text style={estilos.franja}>PLANILLA DE MEDICIÓN</Text>
					<View style={estilos.tabla}>
						<View fixed style={estilos.fila}>
							<Celda ancho={ANCHO.item} estilo={[estilos.encabezado]}>
								ÍTEM
							</Celda>
							<Celda estilo={[estilos.encabezado]}>DESCRIPCIÓN DEL SERVICIO</Celda>
							<Celda ancho={ANCHO.um} estilo={[estilos.encabezado]}>
								UM
							</Celda>
							<Celda ancho={anchoContractual} estilo={[estilos.encabezado]}>
								{`CONTRACTUAL (${moneda})`}
							</Celda>
							<Celda ancho={anchoCantidades} estilo={[estilos.encabezado]}>
								CANTIDADES
							</Celda>
							<Celda ancho={anchoImportes} estilo={[estilos.encabezado]}>
								{`IMPORTES (${moneda})`}
							</Celda>
						</View>
						<View fixed style={estilos.fila}>
							<Celda ancho={ANCHO.item} estilo={[estilos.encabezado]} />
							<Celda estilo={[estilos.encabezado]} />
							<Celda ancho={ANCHO.um} estilo={[estilos.encabezado]} />
							{["CANT.", "P.U.", "PARCIAL"].map((titulo, indice) => (
								<Celda
									key={titulo}
									ancho={indice === 2 ? ANCHO.importe : ANCHO.cantidad}
									estilo={[estilos.encabezado]}
								>
									{titulo}
								</Celda>
							))}
							{["ANTERIOR", "ACTUAL", "ACUMULADO"].map((titulo) => (
								<Celda key={`c-${titulo}`} ancho={ANCHO.cantidad} estilo={[estilos.encabezado]}>
									{titulo}
								</Celda>
							))}
							{["ANTERIOR", "ACTUAL", "ACUMULADO"].map((titulo) => (
								<Celda key={`i-${titulo}`} ancho={ANCHO.importe} estilo={[estilos.encabezado]}>
									{titulo}
								</Celda>
							))}
						</View>

						{filas.map((fila, indice) => {
							const item = calculo.items[indice];

							return (
								<View key={fila.contratoEquipoId} wrap={false} style={estilos.fila}>
									<Celda ancho={ANCHO.item} estilo={[{ textAlign: "center" }]}>
										{String(indice + 1)}
									</Celda>
									<Celda>{fila.descripcion}</Celda>
									<Celda ancho={ANCHO.um} estilo={[{ textAlign: "center" }]}>
										H
									</Celda>
									<Celda ancho={ANCHO.cantidad} estilo={[estilos.numero]}>
										{horas(fila.cantidadContractual)}
									</Celda>
									<Celda ancho={ANCHO.precio} estilo={[estilos.numero]}>
										{formatearMonto(fila.precioUnitario)}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={[estilos.numero]}>
										{formatearMonto(item.parcial)}
									</Celda>
									<Celda ancho={ANCHO.cantidad} estilo={[estilos.numero]}>
										{horas(fila.cantidadAnterior)}
									</Celda>
									<Celda ancho={ANCHO.cantidad} estilo={[estilos.numero, estilos.negrita]}>
										{horas(fila.cantidadActual)}
									</Celda>
									<Celda ancho={ANCHO.cantidad} estilo={[estilos.numero]}>
										{horas(item.cantidadAcumulada)}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={[estilos.numero]}>
										{formatearMonto(item.importeAnterior)}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={[estilos.numero, estilos.negrita]}>
										{formatearMonto(item.importeActual)}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={[estilos.numero]}>
										{formatearMonto(item.importeAcumulado)}
									</Celda>
								</View>
							);
						})}

						{valorizacion.adicionales.map((adicional, indice) => {
							const importeAdicional = calculo.adicionales[indice] ?? 0;
							const cantidad = /^\d{1,7}(\.\d{1,2})?$/.test(adicional.cantidad.trim())
								? adicional.cantidad.trim()
								: "0";

							return (
								<View key={adicional.id} wrap={false} style={estilos.fila}>
									<Celda ancho={ANCHO.item} estilo={[{ textAlign: "center" }]}>
										{String(filas.length + indice + 1)}
									</Celda>
									<Celda>{adicional.descripcion}</Celda>
									<Celda ancho={ANCHO.um} estilo={[{ textAlign: "center" }]}>
										{ABREVIATURA_UNIDAD[adicional.unidad]}
									</Celda>
									<Celda ancho={ANCHO.cantidad} estilo={[estilos.numero]}>
										-
									</Celda>
									<Celda ancho={ANCHO.precio} estilo={[estilos.numero]}>
										{formatearMonto(precioAdicional(adicional))}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={[estilos.numero]}>
										-
									</Celda>
									<Celda ancho={ANCHO.cantidad} estilo={[estilos.numero]}>
										-
									</Celda>
									<Celda ancho={ANCHO.cantidad} estilo={[estilos.numero, estilos.negrita]}>
										{horas(cantidad)}
									</Celda>
									<Celda ancho={ANCHO.cantidad} estilo={[estilos.numero]}>
										{horas(cantidad)}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={[estilos.numero]}>
										-
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={[estilos.numero, estilos.negrita]}>
										{formatearMonto(importeAdicional)}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={[estilos.numero]}>
										{formatearMonto(importeAdicional)}
									</Celda>
								</View>
							);
						})}

						{RESUMEN.map(({ etiqueta, campo }) => {
							const total = campo === "total";
							const estilo = total ? [estilos.numero, estilos.negrita] : [estilos.numero];

							return (
								<View
									key={campo}
									wrap={false}
									style={[estilos.fila, total ? { backgroundColor: AZUL_CLARO } : {}]}
								>
									<Celda estilo={[estilos.numero, ...(total ? [estilos.negrita] : [])]}>
										{etiqueta(datos)}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={estilo}>
										{formatearMonto(calculo.contractual[campo])}
									</Celda>
									<Celda ancho={anchoCantidades} />
									<Celda ancho={ANCHO.importe} estilo={estilo}>
										{formatearMonto(calculo.anterior[campo])}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={estilo}>
										{formatearMonto(calculo.actual[campo])}
									</Celda>
									<Celda ancho={ANCHO.importe} estilo={estilo}>
										{formatearMonto(calculo.acumulado[campo])}
									</Celda>
								</View>
							);
						})}
					</View>
				</View>

				<View wrap={false} style={estilos.pie}>
					<View style={estilos.son}>
						<Text style={estilos.negrita}>SON:</Text>
						<Text style={{ marginTop: 3, fontSize: 8.5 }}>{letrasDelPdf(datos)}</Text>
						{valorizacion.observaciones !== "" && (
							<Text style={{ marginTop: 6, color: GRIS }}>
								Observaciones: {valorizacion.observaciones}
							</Text>
						)}
						{valorizacion.estado === "ANULADA" && (
							<Text style={{ marginTop: 6, color: "#B42318" }}>
								Anulada. Motivo: {valorizacion.motivoAnulacion}
							</Text>
						)}
					</View>
					<View style={estilos.pago}>
						<View style={estilos.pagoFila}>
							<Text>Total de la factura</Text>
							<Text>{formatearMoneda(calculo.actual.total, moneda)}</Text>
						</View>
						<View style={estilos.pagoFila}>
							<Text>{`Fondo de garantía (${valorizacion.fondoGarantiaPct.toLocaleString("es-PE")} %)`}</Text>
							<Text>{`- ${formatearMoneda(calculo.fondoGarantia, moneda)}`}</Text>
						</View>
						<View style={[estilos.pagoFila, { backgroundColor: AZUL_CLARO }]}>
							<Text style={estilos.negrita}>NETO A PAGAR</Text>
							<Text style={estilos.negrita}>{formatearMoneda(calculo.netoPagable, moneda)}</Text>
						</View>
					</View>
				</View>

				<View wrap={false} style={estilos.firmas}>
					<Text style={estilos.firma}>{`${contratante.razonSocial}\nCONTRATANTE`}</Text>
					<Text style={estilos.firma}>{"GERENTE ADMINISTRATIVO"}</Text>
					<Text style={estilos.firma}>{`${proveedor.razonSocial}\nPROVEEDOR`}</Text>
				</View>

				<Text
					fixed
					style={estilos.numeroPagina}
					render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
				/>
			</Page>
		</Document>
	);
}

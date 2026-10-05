---
name: "Sistema de valorizaciones H&M"
description: "PWA offline-first que reemplaza y mejora el libro VALORIZACIONES H&M.xlsm"
created_at: "2026-10-04T00:00:00Z"
created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
last_implementation_at: "2026-10-05T00:00:00Z"
has_completed_all_phases: "false"
---

# Plan: Sistema de valorizaciones H&M

## 🎯 Objetivo

Construir una PWA que funcione sin internet y reemplace el libro `VALORIZACIONES H&M.xlsm`. Debe cubrir sus mismos módulos (clientes, equipos, contratos y valorizaciones) y corregir sus errores de cálculo. Además, debe completar lo que el xlsm dejó a medio hacer: el historial, el PDF, el monto en letras y las retenciones.

## 👀 Contexto

### Fuente: `VALORIZACIONES H&M.xlsm`

| Hoja | Rol | Equivalente en el sistema |
|---|---|---|
| INICIO | Panel con 3 indicadores y 9 botones | Ruta `/` (Inicio) y menú principal |
| CLIENTES | Maestro de clientes (A:H) | Módulo **Clientes** |
| EQUIPOS | Maestro de equipos (A:L) | Módulo **Equipos** |
| CONTRATOS / DET_CONTRATOS | Cabecera (A:R) e ítems (A:J) | Módulo **Contratos** |
| VALORIZACION | Formato imprimible con planilla de medición | **Nueva valorización** y **PDF** |
| REG_VALORIZACIONES / DET_VALORIZACIONES | Historial (vacío en el xlsm) | **Historial de valorizaciones** |
| CONFIG | Datos de H&M e IGV | Módulo **Configuración** |

### Problemas del xlsm que el sistema debe resolver

| # | Problema en el xlsm | Cómo lo resuelve el sistema |
|---|---|---|
| P1 | El saldo contractual muestra lo valorizado en el periodo (`K15 = O22`) | `saldo = montoContractual - acumulado`, calculado y probado |
| P2 | El monto contractual toma solo el primer ítem (`K14 = J22`) | Suma de todos los ítems del contrato |
| P3 | El IGV está fijo en las fórmulas (`*18%`) | Se toma de Configuración y se guarda en cada valorización emitida |
| P4 | No avisa cuando lo valorizado excede lo contratado (167.63 h de 150 h) | Alerta visible por ítem y por contrato, y confirmación antes de emitir |
| P5 | La cantidad "anterior" se escribe a mano | Se calcula sumando las valorizaciones emitidas del contrato |
| P6 | El monto en letras se escribe a mano | Función `montoEnLetras` con pruebas |
| P7 | El número de valorización es manual (`0002.2026.`) | Correlativo automático por año (`0002-2026`), asignado al emitir |
| P8 | REG/DET_VALORIZACIONES no se llenan nunca | Toda valorización queda guardada, con historial y estados |
| P9 | No exporta a PDF; la columna "RUTA PDF" queda vacía | PDF generado en el dispositivo y guardado en OneDrive |
| P10 | No calcula retenciones ni neto pagable | Cálculo de fondo de garantía, fiel cumplimiento, descuentos y neto |
| P11 | La cabecera repite datos de CONFIG y del contrato a mano | La cabecera se llena sola desde el contrato y la configuración |
| P12 | Hay macros que borran todo sin confirmar | Sin borrados físicos: borrado lógico y confirmación |
| P13 | Tipos de datos incorrectos: UM = `1`, documento contractual como número | Esquemas Zod con tipos estrictos y listas cerradas |
| P14 | Solo 4 filas de ítems; la plantilla y la hoja no coinciden | Ítems ilimitados |
| P15 | Es de un solo usuario y solo funciona en Windows con Excel | PWA que funciona en celular y escritorio, sin internet, con varios usuarios |

### Proyecto

- Stack: React 19, Vite 8, TypeScript 6, Tailwind 4, shadcn/ui (Base UI, Nova), vite-plugin-pwa, Jest, Cypress, ESLint (Codely). Ver [`README.md`](../README.md).
- Archivos clave: [`src/index.tsx`](../src/index.tsx), [`src/App.tsx`](../src/App.tsx), [`src/index.css`](../src/index.css), [`vite.config.ts`](../vite.config.ts), [`components.json`](../components.json).
- Verificación: `npm run lint && npm run typecheck && npm run test:ci && npm run build`. La fase 1 agrega el script `npm run verify`, que ejecuta todo eso.

## 🧭 Decisiones

| ID | Decisión | Estado |
|---|---|---|
| D1 | ¿Qué papel cumple H&M? En la hoja VALORIZACION figura como **contratante** frente a un **proveedor**, y EQUIPOS tiene una columna PROPIETARIO. | ⏳ **Pendiente**. Supuesto inicial: la entidad `Tercero` tiene un campo `tipo: CLIENTE \| PROVEEDOR`, y el contrato indica quién valoriza a quién. |
| D2 | Roles de usuario | ⏳ **Pendiente**. Supuesto inicial: `ADMIN` (todo) y `OPERADOR` (carga valorizaciones, no edita la configuración ni anula) |
| D3 | Login | ✅ Microsoft (MSAL) en la fase 11. Mientras tanto, una sesión de prueba con la misma interfaz. |
| D4 | Almacenamiento | ✅ Dexie (IndexedDB) como fuente de verdad, sincronizado con OneDrive mediante JSON por registro |
| D5 | Base de las retenciones (fondo de garantía y fiel cumplimiento) | ⏳ **Pendiente**. Supuesto inicial: porcentaje sobre el subtotal 2 (sin IGV) |

## 🗺️ Menú

| Ítem | Ruta | Botones del xlsm que reemplaza | Escritorio | Celular |
|---|---|---|---|---|
| Inicio | `/` | Indicadores de INICIO | Menú lateral | Barra inferior |
| Valorizaciones | `/valorizaciones` | NUEVA VALORIZACIÓN, HISTORIAL | Menú lateral | Barra inferior |
| Contratos | `/contratos` | NUEVO CONTRATO, VER CONTRATOS | Menú lateral | Barra inferior |
| Equipos | `/equipos` | NUEVO EQUIPO, VER EQUIPOS | Menú lateral | Barra inferior |
| Clientes | `/clientes` | NUEVO CLIENTE, VER CLIENTES | Menú lateral | Dentro de "Más" |
| Configuración | `/configuracion` | CONFIGURACIÓN | Menú lateral | Dentro de "Más" |

Acción principal, siempre visible: **"+ Nueva valorización"**.

## 📜 Contratos públicos

### Esquema de datos (Dexie, base `hm-valorizaciones`)

Todos los registros llevan estos campos comunes: `id` (uuidv7), `createdAt`, `updatedAt`, `updatedBy`, `deletedAt` (borrado lógico) y `version`. Los montos se guardan en **centavos** (entero) y las cantidades como texto decimal (big.js). Las fechas van en ISO 8601.

| Tabla | Campos (además de los comunes) | Origen en el xlsm |
|---|---|---|
| `empresa` | razonSocial, ruc, direccion, telefono, igvPorcentaje, logo | CONFIG |
| `terceros` | codigo (`CLI-001`), tipo, razonSocial, ruc, direccion, contacto, telefono, correo, estado (`ACTIVO\|INACTIVO`) | CLIENTES A:H |
| `equipos` | codigo (`EQ-001`), tipo, marca, modelo, serie, placa, anio, propietario, horometro, estado (`OPERATIVO\|EN_MANTENIMIENTO\|INOPERATIVO\|BAJA`), ubicacion, observaciones | EQUIPOS A:L |
| `contratos` | codigo (`CTR-001`), documentoContractual (texto), terceroId, nombreServicio, proyecto, ubicacion, tipoServicio, fechaInicio, fechaFin, plazoPagoDias, moneda (`PEN\|USD`), gastosGeneralesPct, utilidadPct, fondoGarantiaPct, fielCumplimientoPct, obligacionesLaborales, estado (`ACTIVO\|CULMINADO\|SUSPENDIDO`), observaciones | CONTRATOS A:R |
| `contratoItems` | contratoId, item, equipoId?, descripcion, unidad (`HM\|DIA\|MES\|M3\|GLB\|UND`), cantidadContractual, precioUnitario, estado | DET_CONTRATOS A:J |
| `valorizaciones` | numero (`0002-2026`, asignado al emitir), contratoId, periodo (`YYYY-MM`), fechaEmision, moneda, igvPct, totales congelados (subtotal1, gastosGenerales, utilidad, subtotal2, igv, total, fondoGarantia, fielCumplimiento, descuento, netoPagable), montoEnLetras, estado (`BORRADOR\|EMITIDA\|ANULADA`), pdfPath | REG_VALORIZACIONES A:V |
| `valorizacionItems` | valorizacionId, contratoItemId, descripcion, unidad, precioUnitario y cantidadContractual (copias al emitir), cantidadAnterior, cantidadActual | DET_VALORIZACIONES A:P |
| `outbox` | entidad, registroId, operacion, payload, intentos | (nueva: sincronización) |

### Servicios de aplicación (`src/features/*/application`)

- `TerceroService`: `listar(filtro)`, `obtener(id)`, `crear(datos)`, `actualizar(id, datos)`, `desactivar(id)`.
- `EquipoService`: los mismos métodos que `TerceroService`.
- `ContratoService`: `listar`, `obtener` (con sus ítems), `crear`, `actualizar`, `agregarItem`, `actualizarItem`, `quitarItem`, `culminar(id)`.
- `ValorizacionService`: `crearBorrador(contratoId, periodo)`, `actualizarCantidades(id, items)`, `calcular(id)` (devuelve totales y alertas), `emitir(id)` (asigna número y congela los totales), `anular(id, motivo)`, `listarHistorial(filtro)`.
- `EmpresaService`: `obtener()`, `actualizar(datos)`.
- Funciones puras (`src/features/valorizaciones/domain`): `calcularValorizacion`, `montoEnLetras(centavos, moneda)`, `siguienteNumero(anio, existentes)`.
- `src/shared/domain`: `rucValido(ruc)`.

### Pruebas

- `rucValido.spec.ts`: RUC válido de empresa (20…), RUC válido de persona natural (10…), dígito verificador incorrecto, longitud incorrecta, prefijo no permitido.
- `calcularValorizacion.spec.ts`: reproduce el caso del xlsm (150 h × 47 USD; anterior 114.40 h, actual 53.23 h → actual 2,501.81, IGV 450.33, total 2,952.14, acumulado 7,878.61, saldo −828.61, avance 111.75 %, alerta de exceso). También: varios ítems, gastos generales y utilidad, IGV configurable, retenciones, redondeo.
- `montoEnLetras.spec.ts`: 2,952.14 USD → "DOS MIL NOVECIENTOS CINCUENTA Y DOS CON 14/100 DÓLARES AMERICANOS". Además: 0, 1, 100, 1,000,000, PEN → "SOLES".
- `siguienteNumero.spec.ts`: primero del año, consecutivo, cambio de año.
- Pruebas de repositorios con `fake-indexeddb`: crear, editar, borrado lógico, filtros.
- Cypress: navegación por el menú; alta de cliente; contrato con ítems; valorización de punta a punta en modo sin conexión.

### Textos de la interfaz (principales)

- Alerta de exceso: "El acumulado supera la cantidad contratada en {n} {unidad} ({p} %)."
- Confirmación al emitir: "Al emitir se asignará el número {numero} y ya no podrá editarse. ¿Continuar?"
- Estado de la sincronización: "Sin conexión: los cambios se guardan en este dispositivo", "Sincronizando…", "Todo sincronizado".

## 🪜 Fases

El detalle y las casillas de cada fase están en [`TAREAS.md`](TAREAS.md). Cada fase es una porción vertical que se puede probar y deja el build en verde.

| Fase | Entrega | Problemas que resuelve |
|---|---|---|
| 0 | ✅ Base del proyecto (stack, PWA, marca) | P15 (base) |
| 1 | Layout, menú y rutas, con sesión de prueba | — |
| 2 | Configuración de la empresa con Dexie (primera porción vertical con datos) | P3, P11 |
| 3 | Clientes | P12, P13 |
| 4 | Equipos | P13 |
| 5 | Contratos e ítems | P2, P13, P14 |
| 6 | Valorización: borrador y cálculos | P1, P4, P5, P10 |
| 7 | Emisión, numeración, monto en letras e historial | P6, P7, P8 |
| 8 | PDF de la valorización | P9 |
| 9 | Inicio con indicadores reales | — |
| 10 | Exportar a Excel e importar datos del xlsm | Migración |
| 11 | Login con Microsoft y roles | D2, D3 |
| 12 | Sincronización con OneDrive y subida de PDFs | P9, P15 |
| 13 | Consulta de RUC (Cloudflare Worker con el padrón de SUNAT) | — |

## ⏭️ Siguiente paso

Resolver las decisiones D1, D2 y D5, y empezar la **fase 1: layout, menú y rutas**.

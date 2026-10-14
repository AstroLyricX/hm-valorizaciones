# Lista de tareas: Sistema de valorizaciones H&M

Plan y decisiones: [`PLAN.md`](PLAN.md). Los códigos P1–P15 son los problemas del xlsm que se corrigen.

Todas las fases terminan con estas dos tareas:

- **Verificar:** ejecutar `npm run verify` (lint, tipos, pruebas y build) y corregir lo que falle.
- **STOP:** presentar los cambios para revisión y proponer el mensaje de commit. No avanzar a la siguiente fase sin aprobación.

---

## Fase 0: Base del proyecto ✅

- [x] Actualizar el template de Codely (React 19, Vite 8, TypeScript 6, Jest 30, Cypress 16, ESLint 9)
- [x] Tailwind 4 y shadcn/ui (Base UI, Nova), con el alias `@/`
- [x] PWA: manifiesto, íconos desde el logo y aviso de actualización
- [x] Marca: logo oficial, azul `#005A9C` y favicon SVG

## Fase 1: Layout, menú y rutas ✅

- [x] Agregar el script `verify` en `package.json`
- [x] Configurar React Router con las rutas `/`, `/valorizaciones`, `/valorizaciones/nueva`, `/contratos`, `/equipos`, `/clientes`, `/configuracion` y `/login`
- [x] Componente `AppLayout`: menú lateral en escritorio y tablet (`md:`, el punto de quiebre del sidebar de shadcn) y barra inferior en celular con 4 ítems más "Más"
- [x] Botón "+ Nueva valorización" siempre visible
- [x] Páginas de las secciones con título y estado vacío ("Aún no hay contratos")
- [x] `SessionProvider` con sesión de prueba, la pantalla `/login` y la protección de rutas (`RequireSession`). Debe usar la misma interfaz que tendrá después MSAL.
- [x] Indicador de conexión (en línea / sin conexión) en la cabecera
- [x] Agregar los componentes de shadcn: `sidebar`, `sheet`, `dropdown-menu`, `avatar`, `separator`, `tooltip`
- [x] Pruebas: Jest (el layout muestra los ítems del menú; una ruta protegida redirige a `/login`) y Cypress (navegar las 6 secciones en escritorio y en celular)
- [x] Verificar
- [x] STOP

## Fase 2: Configuración de la empresa (primera porción vertical con datos) ✅

- [x] `src/data/db.ts`: Dexie con la tabla `empresa` y la tabla `outbox`
- [x] Campos comunes (`id`, `createdAt`, `updatedAt`, `updatedBy`, `deletedAt`, `version`) y su `BaseSchema` en Zod
- [x] `src/lib/dinero.ts` (centavos y big.js) y `src/lib/fechas.ts` (date-fns en español)
- [x] `EmpresaSchema`, `EmpresaRepository` y `EmpresaService`
- [x] Datos iniciales, sacados de la hoja CONFIG: razón social, RUC 20602629903, dirección, teléfono, IGV 18 %
- [x] Página `/configuracion`: formulario con React Hook Form + Zod; el IGV se edita como porcentaje (P3)
- [x] `rucValido` en `src/shared/domain`, con pruebas
- [x] `navigator.storage.persist()` al iniciar la app
- [x] Pruebas: el repositorio con `fake-indexeddb` y el formulario (guardar y validar el RUC)
- [x] Verificar
- [x] STOP

## Fase 3: Clientes ✅

- [x] `TerceroSchema` (con el tipo según la decisión D1), `TerceroRepository` y `TerceroService`
- [x] Código automático `CLI-001`, `CLI-002`… (reemplaza `GenerarCodigoCliente` del xlsm)
- [x] Listado con TanStack Table v9: búsqueda por razón social o RUC, filtro por estado; en celular, tarjetas
- [x] Formulario de alta y edición en un panel lateral (desde abajo en celular, desde la derecha en escritorio). Valida el RUC (11 dígitos y dígito verificador), no permite RUC duplicados y valida el correo.
- [x] Desactivar en lugar de borrar, con confirmación (P12)
- [x] Teléfono y RUC guardados como texto (P13)
- [x] Pruebas: el servicio (alta, RUC duplicado, código correlativo) y Cypress (alta y edición de un cliente)
- [x] Verificar
- [x] STOP

## Fase 4: Equipos ✅

- [x] `EquipoSchema`, `EquipoRepository` y `EquipoService`, con código `EQ-001`
- [x] Listado con filtros por estado y tipo, y tarjetas en celular
- [x] Formulario con todos los campos de la hoja EQUIPOS (A:L); el estado sale de una lista cerrada
- [x] Insignias de estado: OPERATIVO, EN MANTENIMIENTO, INOPERATIVO, BAJA
- [x] Pruebas: el servicio y Cypress (alta de un equipo)
- [x] Verificar
- [x] STOP

## Fase 5: Contratos ✅

Rediseñada según `VALORIZACIONES.txt`: el contrato son equipos con horas mínimas × costo por hora.

- [x] Formularios en ventanas (cabecera azul del logo, Cancelar/Guardar), obligatorios con `*` rojo.
- [x] Selectores y fechas propios (no los del navegador), también en los filtros de las tablas.
- [x] Clientes con representante y datos bancarios; equipos con activo fijo, motor, categoría, dueño y estados SB/FM/FO/OP/P/D.

- [x] `ContratoSchema` y `ContratoEquipoSchema`, `ContratoRepository` y `ContratoService` (código CTR-001)
- [x] Formulario en una sola página: cliente, proyecto, ubicación, fecha de inicio y fin, moneda, fondo de garantía (opcional), n.° de documento (opcional) y observaciones
- [x] Equipos del contrato: equipo, horas mínimas y costo por hora; parcial y monto contractual en vivo (P2)
- [x] Estado calculado: Activo o Vencido según la fecha de fin
- [x] Ficha del contrato: datos, equipos, resumen y valorizaciones (vacío por ahora)
- [x] Pruebas: cálculos, esquemas, servicio, pantalla y Cypress (contrato con 2 equipos)
- [x] Verificar
- [x] STOP

## Fase 6: Valorización (borrador y cálculos) ✅

- [x] `calcularValorizacion` (función pura con big.js): parcial, anterior, actual, acumulado, subtotal 1, gastos generales, utilidad, subtotal 2, IGV, total, fondo de garantía, neto a pagar, saldo y avance %
- [x] Prueba con el caso real del xlsm: actual 2,501.81, IGV 450.33, total 2,952.14, acumulado 7,878.61, saldo −828.61, avance 111.75 %
- [x] Cantidad anterior = suma de las horas de las valorizaciones EMITIDAS del contrato de periodos anteriores (P5)
- [x] `ValorizacionService.crearBorrador` (no duplica contrato + periodo), `actualizarCantidad`, `actualizarCabecera` y `eliminarBorrador`
- [x] Nueva valorización: contrato vigente y periodo (mes y año); también desde la ficha del contrato
- [x] Planilla de medición: tabla como la hoja VALORIZACION en escritorio y tarjetas por equipo en celular. Solo se escriben las horas del periodo.
- [x] Cabecera llena sola con los datos de la empresa, del proveedor y del contrato (P11)
- [x] Alerta de exceso por equipo y en el resumen (P4)
- [x] Saldo contractual correcto (P1) y fondo de garantía sobre el subtotal 2 (P10, supuesto D5). Fiel cumplimiento queda para cuando el contrato lo registre.
- [x] El borrador se guarda solo al escribir, también sin conexión
- [x] Pruebas: cálculo, servicio, pantallas y Cypress (crear un borrador y ver la alerta de exceso)
- [x] Verificar
- [x] STOP

## Fase 7: Emisión, monto en letras e historial ✅

- [x] `montoEnLetras(centavos, moneda)`, con pruebas (P6): "DOS MIL NOVECIENTOS CINCUENTA Y DOS CON 14/100 DÓLARES AMERICANOS."
- [x] `siguienteNumero`: correlativo `NNNN-YYYY` por año de emisión; las anuladas conservan su número (P7)
- [x] `ValorizacionService.emitir`: confirmación (con advertencia si hay exceso), número asignado, y totales, IGV, monto en letras y datos del contrato congelados
- [x] `ValorizacionService.anular` con motivo, solo para ADMIN (supuesto D2; la sesión de prueba es ADMIN hasta la fase 11)
- [x] Historial `/valorizaciones` con número, periodo, contrato, proyecto, proveedor, total y estado, con filtros (P8)
- [x] Detalle en modo lectura de una valorización emitida o anulada
- [x] La ficha del contrato suma lo valorizado de las emitidas: saldo y avance
- [x] Pruebas: el número correlativo, que una valorización emitida no se pueda editar, y que la siguiente valorización tome el acumulado anterior
- [x] Verificar
- [x] STOP

## Fase 8: PDF de la valorización ✅

- [x] `ValorizacionPDF` con `@react-pdf/renderer`, cargado solo al pulsar el botón (`import()` en su propio chunk, precacheado para usarlo sin conexión)
- [x] Mismo diseño que la hoja VALORIZACION: logo, N.° de valorización, fecha y periodo, contratante y proveedor, datos del servicio, planilla, totales, pago neto, "SON:" y tres firmas (contratante, gerente administrativo y proveedor)
- [x] A4 horizontal, con la cabecera y los títulos de la planilla repetidos en cada página, y número de página
- [x] Marca de agua BORRADOR o ANULADA cuando corresponde
- [x] Botones "Descargar PDF" y "Compartir" (Web Share API, solo donde el navegador lo permite)
- [x] Nombre del archivo: `VAL-0002-2026-CTR-001.pdf` (borrador: `VAL-BORRADOR-2026-08-CTR-001.pdf`)
- [x] Pruebas: el contenido del PDF con datos de ejemplo (Jest) y la descarga del PDF real (Cypress)
- [x] Verificar
- [x] STOP

## Fase 9: Inicio con indicadores ✅

- [x] Indicadores: valorizado del mes (facturas emitidas este mes, por moneda), contratos activos, equipos en obra (en contratos vigentes) y clientes activos
- [x] Contratos que requieren atención: excedidos (más del 100 %) o por agotarse (90 % o más), con barra de avance
- [x] Borradores pendientes y las últimas 5 valorizaciones emitidas o anuladas
- [x] Pruebas: `resumenInicio` con datos de ejemplo (caso del xlsm: 111.75 %) y la pantalla de Inicio
- [x] Verificar
- [x] STOP
- [ ] Pendiente de confirmar: si existe un estado "Operativo" de equipo para mostrar "Equipos operativos" como en la hoja INICIO

## Fase 10: Exportar a Excel ✅

- [x] Exportar a Excel con SheetJS desde Configuración: CLIENTES, EQUIPOS, CONTRATOS, EQUIPOS_CONTRATO, VALORIZACIONES y DET_VALORIZACIONES (montos con 2 decimales y fechas reales de Excel); SheetJS se carga solo al exportar
- [x] Pruebas: exportar sin perder datos (se lee el Excel generado) y la descarga en Cypress
- [x] Verificar
- [x] STOP
- Decisión: **no se importa desde el xlsm** (solo tiene un cliente de prueba); los datos reales se registran en la app y la primera valorización empieza con 0 h anteriores.

## Fase 11: Login con Microsoft y roles ✅ (pendiente el registro en Azure)

- [ ] Registrar la app en Azure (Entra ID), con los permisos `User.Read` y `Files.ReadWrite.AppFolder` y los roles ADMIN y OPERADOR (tarea del administrador; pasos en `docs/AZURE.md`)
- [x] Login con MSAL (`@azure/msal-browser`), Auth Code + PKCE por redirección, cuentas de empresa y personales (`common`); se activa con `VITE_MSAL_CLIENT_ID` en `.env.local`. Sin Client ID: sesión de prueba ("Modo de prueba")
- [x] Sesión recordada en el dispositivo para trabajar sin conexión; al salir sin conexión solo se borra la cuenta local
- [x] Roles ADMIN y OPERADOR desde los App roles de Entra ID (sin rol o cuenta personal: OPERADOR). Solo ADMIN: Configuración (empresa, IGV, exportar) y anular valorizaciones
- [x] `updatedBy` con el correo del usuario
- [x] Pruebas: roles, MSAL simulado (cuenta guardada, vuelta del login, salir con y sin conexión), protección de rutas y Cypress con un operador
- [x] Verificar
- [x] STOP

## Fase 12: Sincronización con SharePoint ✅ (pendiente el sitio y el registro en Azure)

Decisión: los datos son **compartidos por todos los usuarios** en un sitio de SharePoint de H&M
(no en el OneDrive de cada uno). Permiso `Sites.ReadWrite.All`; login con el directorio de H&M y
las cuentas personales como invitados.

- [x] `GraphClient`: token, reintentos ante 429/503/504 con `Retry-After`, `If-Match` con eTag (e `If-None-Match: *` al crear) y sesiones de subida para archivos de más de 4 MB
- [x] `SyncEngine`: baja los cambios con `/delta`, sube los PDFs y lo pendiente del `outbox` (un archivo por registro con su estado actual). Se ejecuta al abrir la app, al recuperar la conexión, al volver a la app, cada 5 minutos y poco después de cada cambio.
- [x] Estructura en SharePoint: `SistemaHM/{tabla}/{id}.json` y `SistemaHM/pdf/{año}/`
- [x] Conflictos: gana el cambio más reciente (`updatedAt`), también si el archivo cambia entre la bajada y la subida (412); aviso al usuario si fue una valorización y si dos dispositivos emitieron el mismo número
- [x] Al emitir, el PDF queda en cola (también sin conexión), se sube y su ruta se guarda en `pdfPath` (P9)
- [x] Estado de la sincronización en la cabecera: "Todo sincronizado", "N cambios por sincronizar", "Sin conexión…", "Sincronizando…", "Inicia sesión de nuevo…"; al tocarlo sincroniza
- [x] Pruebas: `GraphClient` con fetch simulado y `SyncEngine` con un SharePoint simulado de dos dispositivos (subida, bajada, conflictos, 412, sin conexión, datos inválidos, PDF y números duplicados), y el estado en la interfaz
- [x] Verificar
- [x] STOP

## Fase 13: Consulta de RUC ✅ (pendiente publicar el Worker)

Decisión: en lugar del padrón completo de SUNAT (unos 12 millones de RUC, más que el límite gratuito
de D1), un Worker consulta una API de RUC (Decolecta / apis.net.pe) y guarda los resultados en caché.

- [ ] Publicar el Worker en Cloudflare (cuenta gratuita y token de Decolecta; pasos en `worker/ruc/README.md`)
- [x] Cloudflare Worker `GET /ruc/:numero` (`worker/ruc`): valida el RUC, caché de un mes en KV, token secreto, CORS solo para la app; entiende Decolecta y apis.net.pe
- [x] `RucService`: primero valida el RUC, luego busca en la caché local (un mes, también sin conexión), después en el Worker, y si todo falla permite la carga manual
- [x] Autocompletar la razón social y la dirección en el formulario de clientes (al escribir los 11 dígitos o con "Buscar en SUNAT"), con aviso si no está ACTIVO · HABIDO
- [x] Pruebas: el Worker con la API simulada, `RucService` con el Worker simulado y el formulario
- [x] Verificar
- [x] STOP

## Proveedores ✅

- [x] Proveedores como lista aparte de los clientes, con los mismos datos (formulario, validaciones y consulta de RUC compartidos) y código `PRO-001`
- [x] El RUC es único dentro de cada lista: una empresa puede ser cliente y proveedor a la vez
- [x] El dueño de un equipo es un proveedor; los contratos siguen siendo con un cliente
- [x] Menú "Proveedores" en Registros, hoja PROVEEDORES en la exportación a Excel
- [ ] Pendiente de definir: quién aparece como "Del proveedor" en la valorización y el PDF (hoy, el cliente del contrato)

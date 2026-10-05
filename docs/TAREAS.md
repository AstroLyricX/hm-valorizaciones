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

## Fase 2: Configuración de la empresa (primera porción vertical con datos)

- [ ] `src/data/db.ts`: Dexie con la tabla `empresa` y la tabla `outbox`
- [ ] Campos comunes (`id`, `createdAt`, `updatedAt`, `updatedBy`, `deletedAt`, `version`) y su `BaseSchema` en Zod
- [ ] `src/lib/dinero.ts` (centavos y big.js) y `src/lib/fechas.ts` (date-fns en español)
- [ ] `EmpresaSchema`, `EmpresaRepository` y `EmpresaService`
- [ ] Datos iniciales, sacados de la hoja CONFIG: razón social, RUC 20602629903, dirección, teléfono, IGV 18 %
- [ ] Página `/configuracion`: formulario con React Hook Form + Zod; el IGV se edita como porcentaje (P3)
- [ ] `rucValido` en `src/shared/domain`, con pruebas
- [ ] `navigator.storage.persist()` al iniciar la app
- [ ] Pruebas: el repositorio con `fake-indexeddb` y el formulario (guardar y validar el RUC)
- [ ] Verificar
- [ ] STOP

## Fase 3: Clientes

- [ ] `TerceroSchema` (con el tipo según la decisión D1), `TerceroRepository` y `TerceroService`
- [ ] Código automático `CLI-001`, `CLI-002`… (reemplaza `GenerarCodigoCliente` del xlsm)
- [ ] Listado con TanStack Table v9: búsqueda por razón social o RUC, filtro por estado; en celular, tarjetas
- [ ] Formulario de alta y edición (Drawer en celular, Dialog en escritorio). Valida el RUC (11 dígitos y dígito verificador), no permite RUC duplicados y valida el correo.
- [ ] Desactivar en lugar de borrar, con confirmación (P12)
- [ ] Teléfono y RUC guardados como texto (P13)
- [ ] Pruebas: el servicio (alta, RUC duplicado, código correlativo) y Cypress (alta y edición de un cliente)
- [ ] Verificar
- [ ] STOP

## Fase 4: Equipos

- [ ] `EquipoSchema`, `EquipoRepository` y `EquipoService`, con código `EQ-001`
- [ ] Listado con filtros por estado y tipo, y tarjetas en celular
- [ ] Formulario con todos los campos de la hoja EQUIPOS (A:L); el estado sale de una lista cerrada
- [ ] Insignias de estado: OPERATIVO, EN MANTENIMIENTO, INOPERATIVO, BAJA
- [ ] Pruebas: el servicio y Cypress (alta de un equipo)
- [ ] Verificar
- [ ] STOP

## Fase 5: Contratos e ítems

- [ ] `ContratoSchema` y `ContratoItemSchema` (la unidad sale de una lista cerrada: HM, DIA, MES, M3, GLB, UND), con sus repositorios y `ContratoService`
- [ ] Formulario de cabecera. El cliente se elige con un buscador (Command + Popover); hay fechas, moneda, plazo de pago y los porcentajes de gastos generales, utilidad y retenciones. El documento contractual se guarda como texto (P13).
- [ ] Editor de ítems ilimitados (P14), con `useFieldArray` y un equipo opcional por ítem
- [ ] Monto contractual = suma de los parciales de todos los ítems (P2)
- [ ] Detalle del contrato: datos, ítems, resumen y sus valorizaciones (vacío por ahora)
- [ ] Estados ACTIVO, CULMINADO y SUSPENDIDO
- [ ] Pruebas: el monto contractual con varios ítems, el esquema (unidad inválida) y Cypress (contrato con 2 ítems)
- [ ] Verificar
- [ ] STOP

## Fase 6: Valorización (borrador y cálculos)

- [ ] `calcularValorizacion` (función pura con big.js): parcial, anterior, actual, acumulado, subtotal 1, gastos generales, utilidad, subtotal 2, IGV, total, retenciones, neto pagable, saldo y avance %
- [ ] Prueba con el caso real del xlsm: actual 2,501.81, IGV 450.33, total 2,952.14, acumulado 7,878.61, saldo −828.61, avance 111.75 %
- [ ] Cantidad anterior = suma de las cantidades actuales de las valorizaciones EMITIDAS del contrato (P5)
- [ ] `ValorizacionService.crearBorrador` y `actualizarCantidades`
- [ ] Pantalla de la planilla de medición: tabla en escritorio y tarjetas por ítem en celular. Solo se edita la cantidad actual; lo demás se calcula.
- [ ] La cabecera se llena sola con los datos del contrato y de la empresa (P11)
- [ ] Alerta de exceso por ítem y en el resumen (P4)
- [ ] Saldo contractual correcto (P1) y cálculo de retenciones (P10, según la decisión D5)
- [ ] El borrador se guarda solo, también sin conexión
- [ ] Pruebas: `calcularValorizacion` (todos los casos del plan) y Cypress (crear un borrador y ver la alerta de exceso)
- [ ] Verificar
- [ ] STOP

## Fase 7: Emisión, monto en letras e historial

- [ ] `montoEnLetras(centavos, moneda)`, con pruebas (P6)
- [ ] `siguienteNumero`: correlativo `NNNN-YYYY` por año (P7)
- [ ] `ValorizacionService.emitir`: confirmación (con advertencia adicional si hay exceso), número asignado y totales e IGV congelados
- [ ] `ValorizacionService.anular` con motivo, solo para ADMIN (decisión D2)
- [ ] Historial `/valorizaciones` con filtros por contrato, periodo y estado (P8)
- [ ] Detalle en modo lectura de una valorización emitida
- [ ] Pruebas: el número correlativo, que una valorización emitida no se pueda editar, y que la siguiente valorización tome el acumulado anterior
- [ ] Verificar
- [ ] STOP

## Fase 8: PDF de la valorización

- [ ] `ValorizacionPDF` con `@react-pdf/renderer`, cargado solo cuando se necesita (`lazy()`)
- [ ] Mismo diseño que la hoja VALORIZACION: logo, cabecera con contratante y proveedor, planilla, totales, "SON:" y firmas
- [ ] A4 horizontal, con la cabecera repetida en cada página
- [ ] Botones "Descargar PDF" y "Compartir" (Web Share API en celular)
- [ ] Nombre del archivo: `VAL-0002-2026-CTR-001.pdf`
- [ ] Pruebas: el componente se renderiza con datos de ejemplo
- [ ] Verificar
- [ ] STOP

## Fase 9: Inicio con indicadores

- [ ] Indicadores: clientes activos, equipos operativos y contratos activos (como en INICIO), más el monto valorizado del mes
- [ ] Contratos con alerta de exceso o con más del 90 % ejecutado
- [ ] Últimas valorizaciones y borradores pendientes
- [ ] Pruebas: los indicadores con datos de ejemplo
- [ ] Verificar
- [ ] STOP

## Fase 10: Exportar a Excel y migrar desde el xlsm

- [ ] Exportar a Excel con SheetJS: clientes, equipos, contratos e historial de valorizaciones
- [ ] Importar desde `VALORIZACIONES H&M.xlsm`: leer las hojas maestras y crear los registros, con una vista previa antes de confirmar
- [ ] Pruebas: importar el xlsm real (1 cliente) y exportar sin perder datos
- [ ] Verificar
- [ ] STOP

## Fase 11: Login con Microsoft y roles

- [ ] Registrar la app en Azure (Entra ID), con los permisos `User.Read` y `Files.ReadWrite.AppFolder` (tarea del administrador)
- [ ] Reemplazar la sesión de prueba por MSAL (`@azure/msal-react`), con el método Auth Code + PKCE
- [ ] Sesión recordada para trabajar sin conexión; volver a pedir el login solo cuando hay red
- [ ] Roles ADMIN y OPERADOR (decisión D2), con permisos en las rutas y las acciones
- [ ] `updatedBy` con el correo del usuario
- [ ] Pruebas: la protección por rol y Cypress con MSAL simulado
- [ ] Verificar
- [ ] STOP

## Fase 12: Sincronización con OneDrive

- [ ] `graphClient`: token, reintentos ante 429/503 con `Retry-After`, `If-Match` con eTag y sesiones de subida para archivos grandes
- [ ] `syncEngine`: subir lo pendiente del `outbox` y bajar los cambios con `/delta`. Se ejecuta al recuperar la conexión, al volver a la app y cada cierto tiempo.
- [ ] Estructura en OneDrive: `/Apps/SistemaHM/{tabla}/{id}.json` y `/pdf/{año}/`
- [ ] Resolución de conflictos: gana el cambio más reciente, y se avisa al usuario si había un conflicto en una valorización
- [ ] Subir el PDF al emitir y guardar su ruta en `pdfPath` (P9)
- [ ] Estado de la sincronización en la interfaz
- [ ] Pruebas: el `syncEngine` con Graph simulado (subida, bajada, conflicto y sin conexión)
- [ ] Verificar
- [ ] STOP

## Fase 13: Consulta de RUC

- [ ] Cloudflare Worker `GET /ruc/:numero`, con Cloudflare D1 cargado desde el padrón reducido de SUNAT
- [ ] Tarea semanal que actualiza el padrón
- [ ] `RucService`: primero valida el RUC, luego busca en la caché local, después en el Worker, y si todo falla permite la carga manual
- [ ] Autocompletar la razón social y la dirección en el formulario de clientes
- [ ] Pruebas: `RucService` con el Worker simulado
- [ ] Verificar
- [ ] STOP

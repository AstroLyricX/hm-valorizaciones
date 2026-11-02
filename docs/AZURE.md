# Login con Microsoft: registro de la app en Entra ID

Pasos para quien administra Microsoft 365 de H&M. Sin estos datos la app funciona con una
**sesión de prueba** de administrador (se ve el aviso "Modo de prueba" en el login).

## Opción rápida (recomendada): script

Con la cuenta **administradora** de Microsoft 365 de H&M:

```bash
brew install azure-cli                              # una sola vez
az login --allow-no-subscriptions --use-device-code # iniciar sesión con la cuenta de H&M
./scripts/registrar-azure.sh
```

El script hace los pasos 1 a 3 de abajo (registro, direcciones de vuelta, permisos, roles y el rol
ADMIN para quien lo ejecuta), concede el consentimiento, guarda `.env.local` y, si `gh` tiene
sesión, actualiza las variables del repositorio. Después: `gh workflow run deploy -R
AstroLyricX/hm-valorizaciones` para publicar. Se puede volver a ejecutar sin duplicar nada.

Una cuenta de universidad u otra sin permisos de administrador no puede registrar apps
("Insufficient privileges").

## 1. Registrar la aplicación

1. Entrar a <https://entra.microsoft.com> → **Aplicaciones** → **Registros de aplicaciones** → **Nuevo registro**.
2. Nombre: `Valorizaciones H&M`.
3. Tipos de cuenta admitidos: **Solo las cuentas de este directorio organizativo** (H&M). Las
   personas con cuenta personal (Outlook, Hotmail) entran como **invitados** del directorio de H&M:
   así ven los mismos datos en SharePoint y reciben su rol.
4. URI de redirección: plataforma **Aplicación de página única (SPA)** con:
   - `http://localhost:3000/login` (desarrollo)
   - `https://astrolyricx.github.io/hm-valorizaciones/login` (GitHub Pages)
5. Guardar el **Id. de aplicación (cliente)**: es el `VITE_MSAL_CLIENT_ID`.

## 2. Permisos de API

En **Permisos de API** → **Agregar un permiso** → **Microsoft Graph** → **Permisos delegados**:

- `User.Read` (perfil del usuario; es lo único que se pide al iniciar sesión)
- `Sites.ReadWrite.All` (leer y escribir en el sitio de SharePoint donde se sincronizan los datos y los PDFs; se pide recién al sincronizar)

Luego pulsar **Conceder consentimiento de administrador para H&M** (`Sites.ReadWrite.All` lo requiere).

## 3. Roles de la aplicación (ADMIN y OPERADOR)

En **Roles de aplicación** → **Crear rol de aplicación**, dos veces:

| Nombre para mostrar | Tipos de miembros permitidos | Valor | Descripción |
|---|---|---|---|
| Administrador | Usuarios o grupos | `ADMIN` | Configura la empresa y anula valorizaciones |
| Operador | Usuarios o grupos | `OPERADOR` | Registra clientes, equipos, contratos y valorizaciones |

Luego, en **Aplicaciones empresariales** → `Valorizaciones H&M` → **Usuarios y grupos** →
**Agregar usuario o grupo**, asignar a cada persona su rol.

- Quien no tenga rol asignado entra como **OPERADOR**.
- Las **cuentas personales** (Outlook, Hotmail) se invitan como **usuario invitado** en el
  directorio de H&M (**Usuarios** → **Invitar usuario externo**) y se les asigna su rol como a
  cualquier otro usuario.

## 4. Sitio de SharePoint para los datos

1. En <https://www.office.com> → **SharePoint** → **Crear sitio** → **Sitio de grupo**, nombre
   `SistemaHM`. Queda en `https://<empresa>.sharepoint.com/sites/SistemaHM`.
2. Agregar como **miembros** (pueden editar) a todas las personas que usan la app, incluidos los
   invitados.
3. La app crea sola la carpeta `SistemaHM` en **Documentos** con una subcarpeta por tabla
   (`terceros`, `equipos`, `contratos`, `valorizaciones`…), un archivo JSON por registro, y los
   PDFs emitidos en `SistemaHM/pdf/<año>/`. Los documentos adjuntos (contratos firmados, SOAT, facturas…) van en
   `SistemaHM/archivos/<equipos|contratos|valorizaciones>/<id>/`. No hace falta tocar esos archivos.

## 5. Configurar la app

Copiar `.env.example` como `.env.local` (no se sube a Git) y completar:

```
VITE_MSAL_CLIENT_ID=<Id. de aplicación (cliente)>
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/<Id. de directorio (inquilino)>
VITE_MSAL_DOMINIO=<dominio de las cuentas, por ejemplo maquinariashym.com>
VITE_SHAREPOINT_SITIO=<empresa>.sharepoint.com:/sites/SistemaHM
```

En GitHub Pages, los mismos cuatro valores van en el repositorio: **Settings** → **Secrets and
variables** → **Actions** → **Variables**.

Reiniciar `npm start` (o volver a ejecutar `npm run build`) para que tome los valores.

## Cómo funciona

- El login es por redirección (Auth Code + PKCE): funciona en el navegador y en la app instalada.
- La cuenta queda guardada en el dispositivo: sin conexión se sigue trabajando con ella.
- Al cerrar sesión con conexión se cierra también la sesión de Microsoft; sin conexión solo se
  borra la cuenta del dispositivo.
- Cada cambio guarda el correo del usuario (`updatedBy`).
- La sincronización corre al abrir la app, al recuperar la conexión, al volver a la app, cada 30
  segundos mientras la app está a la vista y un segundo después de cada cambio: lo que registra
  una persona lo ven las demás casi al instante.
- En un dispositivo nuevo, la app descarga primero los datos de la empresa y recién entonces
  muestra las páginas.
- Antes de emitir una valorización se trae lo último de SharePoint, para no repetir un número que
  otra persona acaba de emitir. Si dos personas cambian el mismo registro, gana el
  cambio más reciente y la app avisa cuando fue una valorización.

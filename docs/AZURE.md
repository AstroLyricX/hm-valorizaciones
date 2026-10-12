# Login con Microsoft: registro de la app en Entra ID

Pasos para quien administra Microsoft 365 de H&M. Sin estos datos la app funciona con una
**sesión de prueba** de administrador (se ve el aviso "Modo de prueba" en el login).

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

- `User.Read` (perfil del usuario)
- `Sites.ReadWrite.All` (leer y escribir en el sitio de SharePoint donde se sincronizan los datos y los PDFs)

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
   PDFs emitidos en `SistemaHM/pdf/<año>/`. No hace falta tocar esos archivos.

## 5. Configurar la app

Copiar `.env.example` como `.env.local` (no se sube a Git) y completar:

```
VITE_MSAL_CLIENT_ID=<Id. de aplicación (cliente)>
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/<Id. de directorio (inquilino)>
VITE_SHAREPOINT_SITIO=<empresa>.sharepoint.com:/sites/SistemaHM
```

En GitHub Pages, los mismos tres valores van en el repositorio: **Settings** → **Secrets and
variables** → **Actions** → **Variables**.

Reiniciar `npm start` (o volver a ejecutar `npm run build`) para que tome los valores.

## Cómo funciona

- El login es por redirección (Auth Code + PKCE): funciona en el navegador y en la app instalada.
- La cuenta queda guardada en el dispositivo: sin conexión se sigue trabajando con ella.
- Al cerrar sesión con conexión se cierra también la sesión de Microsoft; sin conexión solo se
  borra la cuenta del dispositivo.
- Cada cambio guarda el correo del usuario (`updatedBy`).
- La sincronización corre al abrir la app, al recuperar la conexión, al volver a la app, cada 5
  minutos y poco después de cada cambio. Si dos personas cambian el mismo registro, gana el
  cambio más reciente y la app avisa cuando fue una valorización.

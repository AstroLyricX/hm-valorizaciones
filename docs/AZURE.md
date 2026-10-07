# Login con Microsoft: registro de la app en Entra ID

Pasos para quien administra Microsoft 365 de H&M. Sin estos datos la app funciona con una
**sesión de prueba** de administrador (se ve el aviso "Modo de prueba" en el login).

## 1. Registrar la aplicación

1. Entrar a <https://entra.microsoft.com> → **Aplicaciones** → **Registros de aplicaciones** → **Nuevo registro**.
2. Nombre: `Valorizaciones H&M`.
3. Tipos de cuenta admitidos: **Cuentas en cualquier directorio organizativo y cuentas de Microsoft personales** (empresa y personales).
4. URI de redirección: plataforma **Aplicación de página única (SPA)** con:
   - `http://localhost:3000/login` (desarrollo)
   - `https://<dominio-de-producción>/login` (cuando se publique)
5. Guardar el **Id. de aplicación (cliente)**: es el `VITE_MSAL_CLIENT_ID`.

## 2. Permisos de API

En **Permisos de API** → **Agregar un permiso** → **Microsoft Graph** → **Permisos delegados**:

- `User.Read` (perfil del usuario)
- `Files.ReadWrite.AppFolder` (carpeta propia de la app en OneDrive, para la sincronización de la fase 12)

## 3. Roles de la aplicación (ADMIN y OPERADOR)

En **Roles de aplicación** → **Crear rol de aplicación**, dos veces:

| Nombre para mostrar | Tipos de miembros permitidos | Valor | Descripción |
|---|---|---|---|
| Administrador | Usuarios o grupos | `ADMIN` | Configura la empresa y anula valorizaciones |
| Operador | Usuarios o grupos | `OPERADOR` | Registra clientes, equipos, contratos y valorizaciones |

Luego, en **Aplicaciones empresariales** → `Valorizaciones H&M` → **Usuarios y grupos** →
**Agregar usuario o grupo**, asignar a cada persona su rol.

- Quien no tenga rol asignado entra como **OPERADOR**.
- Las **cuentas personales** (Outlook, Hotmail) no traen roles: entran como OPERADOR. Para que una
  cuenta personal sea ADMIN, invitarla como **usuario invitado** en el directorio de H&M
  (**Usuarios** → **Invitar usuario externo**) y asignarle el rol en el paso anterior.

## 4. Configurar la app

Copiar `.env.example` como `.env.local` (no se sube a Git) y completar:

```
VITE_MSAL_CLIENT_ID=<Id. de aplicación (cliente)>
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/common
```

Para permitir solo cuentas de la empresa, usar
`https://login.microsoftonline.com/<Id. de directorio (inquilino)>`.

Reiniciar `npm start` (o volver a ejecutar `npm run build`) para que tome los valores.

## Cómo funciona

- El login es por redirección (Auth Code + PKCE): funciona en el navegador y en la app instalada.
- La cuenta queda guardada en el dispositivo: sin conexión se sigue trabajando con ella.
- Al cerrar sesión con conexión se cierra también la sesión de Microsoft; sin conexión solo se
  borra la cuenta del dispositivo.
- Cada cambio guarda el correo del usuario (`updatedBy`).

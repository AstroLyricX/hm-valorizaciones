// Al iniciar sesión solo se pide el perfil: así el login funciona aunque el directorio exija
// aprobación del administrador para otros permisos.
export const PERMISOS_LOGIN = ["User.Read"];

// La sincronización pide además el sitio de SharePoint (fase 12). Solo se solicita si hay un
// sitio configurado; el administrador debe aprobarlo una vez para todo el directorio.
export const PERMISOS_SYNC = ["Sites.ReadWrite.All"];

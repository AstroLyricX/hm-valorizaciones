#!/usr/bin/env bash
# Registra la app "Valorizaciones H&M" en Microsoft Entra ID y deja configurado el login.
# Uso (con la cuenta administradora de Microsoft 365 de H&M):
#   az login --allow-no-subscriptions --use-device-code
#   ./scripts/registrar-azure.sh
# Se puede volver a ejecutar: reutiliza la app si ya existe.
set -euo pipefail

NOMBRE="Valorizaciones H&M"
REPO="AstroLyricX/hm-valorizaciones"
REDIRECCIONES='["http://localhost:3000/login","https://astrolyricx.github.io/hm-valorizaciones/login"]'
GRAPH_API="00000003-0000-0000-c000-000000000000"
USER_READ="e1fe6dd8-ba31-4d61-89e7-88639da4683d"
SITES_READWRITE_ALL="89fe6a52-be36-487e-b7d8-d061c450a026"
TEMPORAL="$(mktemp -d)"
trap 'rm -rf "$TEMPORAL"' EXIT

tenant="$(az account show --query tenantId -o tsv)"
cuenta="$(az account show --query user.name -o tsv)"
echo "Directorio: $tenant ($cuenta)"

app_id="$(az ad app list --display-name "$NOMBRE" --query "[0].appId" -o tsv)"
if [[ -z "$app_id" ]]; then
	echo "Registrando la app…"
	cat >"$TEMPORAL/roles.json" <<JSON
[
  {"allowedMemberTypes":["User"],"displayName":"Administrador","value":"ADMIN","isEnabled":true,
   "description":"Configura la empresa y anula valorizaciones","id":"$(uuidgen | tr '[:upper:]' '[:lower:]')"},
  {"allowedMemberTypes":["User"],"displayName":"Operador","value":"OPERADOR","isEnabled":true,
   "description":"Registra clientes, equipos, contratos y valorizaciones","id":"$(uuidgen | tr '[:upper:]' '[:lower:]')"}
]
JSON
	cat >"$TEMPORAL/permisos.json" <<JSON
[{"resourceAppId":"$GRAPH_API","resourceAccess":[
  {"id":"$USER_READ","type":"Scope"},
  {"id":"$SITES_READWRITE_ALL","type":"Scope"}
]}]
JSON
	app_id="$(az ad app create --display-name "$NOMBRE" --sign-in-audience AzureADMyOrg \
		--app-roles "@$TEMPORAL/roles.json" \
		--required-resource-accesses "@$TEMPORAL/permisos.json" \
		--query appId -o tsv)"
else
	echo "La app ya existe: $app_id"
fi
objeto="$(az ad app show --id "$app_id" --query id -o tsv)"

echo "Configurando las direcciones de vuelta del login (SPA)…"
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$objeto" \
	--headers "Content-Type=application/json" \
	--body "{\"spa\":{\"redirectUris\":$REDIRECCIONES}}" >/dev/null

principal="$(az ad sp list --filter "appId eq '$app_id'" --query "[0].id" -o tsv)"
if [[ -z "$principal" ]]; then
	principal="$(az ad sp create --id "$app_id" --query id -o tsv)"
fi

echo "Asignando el rol ADMIN a $cuenta…"
yo="$(az ad signed-in-user show --query id -o tsv)"
rol_admin="$(az ad app show --id "$app_id" --query "appRoles[?value=='ADMIN'].id | [0]" -o tsv)"
ya_asignado="$(az rest --method GET \
	--uri "https://graph.microsoft.com/v1.0/servicePrincipals/$principal/appRoleAssignedTo" \
	--query "value[?principalId=='$yo' && appRoleId=='$rol_admin'] | length(@)" -o tsv)"
if [[ "$ya_asignado" == "0" ]]; then
	az rest --method POST \
		--uri "https://graph.microsoft.com/v1.0/servicePrincipals/$principal/appRoleAssignedTo" \
		--headers "Content-Type=application/json" \
		--body "{\"principalId\":\"$yo\",\"resourceId\":\"$principal\",\"appRoleId\":\"$rol_admin\"}" >/dev/null
fi

echo "Concediendo el consentimiento de administrador (perfil y SharePoint)…"
if ! az ad app permission admin-consent --id "$app_id" 2>/dev/null; then
	echo "  No se pudo conceder: hazlo en Entra → Registros de aplicaciones → $NOMBRE → Permisos de API."
fi

autoridad="https://login.microsoftonline.com/$tenant"
archivo_env=".env.local"
touch "$archivo_env"
for par in "VITE_MSAL_CLIENT_ID=$app_id" "VITE_MSAL_AUTHORITY=$autoridad"; do
	clave="${par%%=*}"
	grep -v "^$clave=" "$archivo_env" >"$TEMPORAL/env" || true
	echo "$par" >>"$TEMPORAL/env"
	mv "$TEMPORAL/env" "$archivo_env"
done
echo "Guardado en $archivo_env."

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
	gh variable set VITE_MSAL_CLIENT_ID -R "$REPO" -b "$app_id"
	gh variable set VITE_MSAL_AUTHORITY -R "$REPO" -b "$autoridad"
	echo "Variables del repositorio actualizadas. Para publicar: gh workflow run deploy -R $REPO"
else
	echo "Agrega en GitHub (Settings → Secrets and variables → Actions → Variables):"
	echo "  VITE_MSAL_CLIENT_ID = $app_id"
	echo "  VITE_MSAL_AUTHORITY = $autoridad"
fi

cat <<FIN

Listo.
  Client ID: $app_id
  Directorio: $tenant
Para dar acceso a otra persona: Entra → Aplicaciones empresariales → $NOMBRE → Usuarios y
grupos → Agregar (ADMIN u OPERADOR). Las cuentas personales se invitan antes como invitados.
FIN

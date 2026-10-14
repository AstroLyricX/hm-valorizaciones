# Worker de consulta de RUC

Cloudflare Worker gratuito que consulta una API de RUC de SUNAT y guarda cada resultado un mes en
caché. El token de la API queda guardado en el Worker: la app nunca lo ve.

`GET /ruc/20602629903` → `{ ruc, razonSocial, estado, condicion, direccion }`

- 400 si el RUC no es válido (no gasta consultas de la API)
- 404 si no figura en SUNAT
- 502 si la API no responde

Mientras no esté publicado, la app sigue con la carga manual de la razón social y la dirección.

## Publicarlo (una sola vez)

1. Crear una cuenta gratuita en <https://dash.cloudflare.com/sign-up>.
2. Crear una cuenta en <https://decolecta.com> (antes apis.net.pe) y copiar el **token** de la API.
3. En una terminal, desde esta carpeta:

   ```bash
   cd worker/ruc
   npx wrangler login
   npx wrangler kv namespace create RUC_CACHE   # copia el "id" que muestra en wrangler.toml
   npx wrangler secret put RUC_API_TOKEN        # pega el token de Decolecta
   npx wrangler deploy
   ```

4. `wrangler deploy` muestra la dirección del Worker, por ejemplo
   `https://hm-ruc.<cuenta>.workers.dev`. Probarla en el navegador:
   `https://hm-ruc.<cuenta>.workers.dev/ruc/20602629903`.

## Conectarlo con la app

- En local: agregar a `.env.local` → `VITE_RUC_API_URL=https://hm-ruc.<cuenta>.workers.dev`
- En GitHub Pages: **Settings** → **Secrets and variables** → **Actions** → **Variables** →
  `VITE_RUC_API_URL`, y volver a desplegar.

Si la app se publica en otra dirección, agregarla a `ORIGENES` en `wrangler.toml` y volver a
ejecutar `npx wrangler deploy`.

Para usar apis.net.pe u otra API compatible, definir `RUC_API_URL` en `wrangler.toml` (la URL
termina en `numero=`); el Worker entiende las respuestas de Decolecta y de apis.net.pe.

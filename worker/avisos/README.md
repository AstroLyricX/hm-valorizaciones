# Worker de avisos por Telegram

Cloudflare Worker gratuito que, todos los días a las 7:00 de Lima, avisa por Telegram los
contratos que vencen en 7 días o menos sin su última valorización emitida. Si no hay
pendientes, no manda nada.

- La app sube los contratos vigentes (código, proyecto, cliente, fecha de fin y si falta
  valorizar) cada vez que cambian y hay conexión. Ningún otro dato sale del dispositivo.
- Se suscribe quien abre el **enlace de invitación** y toca **Iniciar**. Sin el enlace, el bot no
  responde con datos.
- Comandos del bot: `/pendientes` (lista de hoy) y `/salir` (dejar de recibir avisos).
- Si alguien bloquea el bot, se le quita de la lista en el siguiente aviso.

## Publicarlo (una sola vez)

1. En Telegram, abrir **@BotFather** → `/newbot` → nombre (por ejemplo "Avisos H&M") y usuario
   (por ejemplo `hm_avisos_bot`). Copiar el **token** que entrega.
2. Desde esta carpeta:

   ```bash
   cd worker/avisos
   npx wrangler kv namespace create AVISOS     # copia el "id" que muestra en wrangler.toml
   npx wrangler secret put TELEGRAM_TOKEN      # pega el token de @BotFather
   npx wrangler secret put TELEGRAM_WEBHOOK_SECRET   # una clave larga al azar
   npx wrangler secret put INVITACION          # código del enlace de invitación (letras y números)
   npx wrangler deploy
   ```

3. Conectar el bot con el Worker (usa la misma clave de `TELEGRAM_WEBHOOK_SECRET`):

   ```bash
   curl -X POST https://hm-avisos.<cuenta>.workers.dev/instalar -H "X-Instalar: <clave>"
   ```

   Responde con el **enlace de invitación** (`https://t.me/<bot>?start=<código>`). Compartirlo
   solo con las personas que deben recibir los avisos.

## Conectarlo con la app

- En local: agregar a `.env.local` → `VITE_AVISOS_API_URL=https://hm-avisos.<cuenta>.workers.dev`
- En GitHub Pages: **Settings** → **Secrets and variables** → **Actions** → **Variables** →
  `VITE_AVISOS_API_URL`, y volver a desplegar.

## Seguridad

- El token del bot y las claves son secretos del Worker: nunca van en el repositorio ni en la app.
- Telegram firma cada mensaje con `TELEGRAM_WEBHOOK_SECRET`; el Worker rechaza los demás.
- Solo los orígenes de `ORIGENES` pueden subir contratos y el Worker valida cada dato. Como la
  app es pública, esto no impide que alguien con conocimientos técnicos suba datos falsos desde
  fuera del navegador; cuando el login con Microsoft esté activo, el Worker verificará el token
  de la sesión.
- Para cambiar el enlace de invitación: `npx wrangler secret put INVITACION` (los ya suscritos
  siguen recibiendo avisos).

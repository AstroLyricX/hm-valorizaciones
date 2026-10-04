# Valorizaciones H&M

PWA para la gestión de equipos, contratos y valorizaciones de Maquinarias y Contratistas Generales H&M E.I.R.L. Funciona sin conexión.

## Stack

React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 4 · shadcn/ui (Base UI, preset Nova) · vite-plugin-pwa · Jest + Testing Library · Cypress · ESLint (eslint-config-codely)

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` | Verificación de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build en http://localhost:3000 (con service worker) |
| `npm test` / `npm run test:ci` | Pruebas unitarias (Jest) |
| `npm run cy:open` / `npm run cy:run` | Pruebas e2e (Cypress); requiere `npm start` o `npm run preview` |
| `npm run typecheck` | Verificación de tipos de la app y de las pruebas e2e |
| `npm run lint` / `npm run lint:fix` | ESLint + Prettier |

## Notas

- Después de agregar componentes con `npx shadcn@latest add <componente>`, ejecutar `npm run lint:fix` para adaptarlos al formato del proyecto.
- Los íconos de la PWA se generan desde `public/logo.svg` al hacer build (`pwa-assets.config.ts`).
- El service worker solo se activa con `npm run build` + `npm run preview`, no en `npm start`.

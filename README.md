# Gestión de Siniestros — Cloudflare

App móvil/web para gestionar partes, fotos y firmas.

## Archivos
- `src/main.jsx` — interfaz.
- `src/styles.css` — estilos.
- `worker.js` — API de Cloudflare Workers.
- `schema.sql` — tablas D1.
- `wrangler.jsonc` — configuración de Worker/Assets.

## Despliegue
1. Build: `npm run build`
2. Deploy: `npx wrangler deploy`
3. Crear D1 y aplicar `schema.sql`.
4. Crear bucket R2 y vincularlo como `PHOTOS`.
5. Vincular D1 como `DB`.

IMPORTANTE: esta versión usa `demo-user` como identidad por defecto. Antes de compartir el enlace con terceros debe añadirse autenticación.

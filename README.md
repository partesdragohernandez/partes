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

## Mejorar texto (pendiente de activar el secret)

Los dos botones envían exclusivamente `{ "text": "contenido del campo" }` a `POST /api/improve-text`. El Worker llama a `gemini-3.1-flash-lite` mediante REST, sin consultar D1/R2 ni enviar el parte. El texto del campo puede contener datos personales escritos por el usuario: estos sí se enviarían. No se registran textos, respuestas ni claves en el código del endpoint. Máximo 4000 caracteres; timeout de 25 segundos; no hay reintentos automáticos ni cambio a otro modelo.

La propuesta se muestra junto al original y solo se sustituye al aceptar. Después se guarda mediante Guardar. Las instrucciones exigen conservar información y significado, pero la fidelidad semántica requiere revisión humana. Spellcheck del navegador está habilitado en ambos campos.

### Configuración manual, previa autorización del usuario

1. Crear una clave en https://aistudio.google.com/api-keys para un proyecto con nivel gratuito. Comprobar la cuota y el nivel del proyecto, sin activar facturación para este uso gratuito. Tarifas y tratamiento de datos: https://ai.google.dev/gemini-api/docs/pricing y https://ai.google.dev/gemini-api/terms.
2. En Cloudflare: Workers & Pages → partes → Settings → Runtime variables and secrets → Add variable (no la sección Builds). Elegir **Secret**, nombre `GEMINI_API_KEY`, pegar el valor y guardar/aplicar. Alternativamente, desde una terminal privada en el proyecto: `npx wrangler secret put GEMINI_API_KEY`, pegando la clave únicamente en su entrada interactiva.
3. No enviar la clave por chat, guardarla en archivos, usar variables `VITE_*` ni añadirla a `wrangler.jsonc` o GitHub. No hace falta una clave durante el build. Este cambio no configura ni despliega el secret.
4. Tras autorizar el despliegue y activar el secret, probar ambos botones con texto ficticio, aceptar/cancelar y verificar persistencia con Guardar. Sin secret el endpoint devuelve 503 y el original permanece intacto.

La tabla de precios muestra nivel gratuito sujeto a cuotas y condiciones de tratamiento de datos. Revisarlas antes de enviar datos reales. El endpoint hereda la ausencia de autenticación de la aplicación: la comprobación de Origin no sustituye autenticación ni limita el consumo por terceros.

Comprobaciones sin clave: `node --test tests/improve-text.test.mjs` y `npm run build`. Los tests simulan Gemini; no demuestran calidad lingüística ni disponibilidad real de la cuenta.

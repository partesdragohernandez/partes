import { improveText } from './improve-text.js';
import { authenticate, authRoutes, rateLimit, userRoutes } from './backend/auth.js';
import { caseRoutes, readCase } from './backend/cases.js';
import { body, csrf, exactKeys, fail, HttpError, json } from './backend/http.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('x-content-type-options','nosniff'); headers.set('referrer-policy','same-origin');
      headers.set('x-frame-options','DENY'); headers.set('cache-control','no-cache');
      return new Response(response.body,{status:response.status,headers});
    }
    try {
      if (!env.DB) fail(503, 'Base de datos no configurada.');
      csrf(request);
      if (url.pathname.startsWith('/api/auth/')) return await authRoutes(request, env, url.pathname);
      const user = await authenticate(request, env);
      if (url.pathname.startsWith('/api/admin/')) return await userRoutes(request, env, user, url.pathname);
      if (url.pathname === '/api/improve-text') {
        if (request.method !== 'POST') fail(405, 'Usa POST.');
        const data = await body(request, 26000); exactKeys(data, ['caseId','field','text']);
        if (!['description','observations'].includes(data.field) || typeof data.caseId !== 'string') fail(400, 'Indica el parte y campo a mejorar.');
        await readCase(env, user, data.caseId, true);
        if (user.role !== 'admin' && data.field === 'description') fail(403, 'La descripción inicial solo puede modificarla el administrador.');
        await rateLimit(env, `gemini:${user.id}`, 30, 3600);
        const clean = new Request(request.url, { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:data.text}) });
        return await improveText(clean, env);
      }
      if (!env.PHOTOS) fail(503, 'Almacenamiento de imágenes no configurado.');
      return await caseRoutes(request, env, user, url.pathname);
    } catch (error) {
      return json({ error: error instanceof HttpError ? error.message : 'No se pudo completar la operación. Inténtalo más tarde.' }, error instanceof HttpError ? error.status : 500);
    }
  }
};

import { body, exactKeys, fail, json, text } from './http.js';
export const SESSION_SECONDS = 8 * 60 * 60;
const COOKIE = '__Host-session';
export const now = () => Math.floor(Date.now() / 1000);
export async function digest(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export const publicUser = u => ({ id: u.id, username: u.username, displayName: u.display_name, role: u.role, active: !!u.active, mustChangePassword: !!u.must_change_password });
export async function rateLimit(env, key, max, seconds) {
  const t = now();
  const row = await env.DB.prepare(`INSERT INTO auth_attempts(key,attempts,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,
    expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts`).bind(key, t + seconds, t, t).first();
  if (row.attempts > max) fail(429, 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.');
}
export async function audit(env, actor, action, target) {
  await env.DB.prepare('INSERT INTO audit_log(actor_id,action,target_id,created_at) VALUES(?,?,?,?)').bind(actor || null, action, target || null, now()).run();
}
export async function supabase(env, path, { admin = false, method = 'POST', data, token } = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')) fail(503, 'Falta configurar la autenticación en el Worker.');
  let base;
  try { base = new URL(env.SUPABASE_URL); } catch { fail(503, 'URL de autenticación no válida.'); }
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.username || base.password) fail(503, 'URL de autenticación no válida.');
  const headers = { apikey: admin ? env.SUPABASE_SECRET_KEY : env.SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  let response;
  try { response = await fetch(`${base.origin}/auth/v1/${path}`, { method, headers, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000), redirect: 'manual' }); }
  catch { fail(503, 'No se puede contactar con el servicio de acceso.'); }
  if (!response.ok) {
    if (response.status === 429) fail(429, 'Servicio de acceso ocupado. Inténtalo más tarde.');
    if (admin && [400,422].includes(response.status)) {
      const details = await response.json().catch(() => ({}));
      if (details.code === 'weak_password' || details.error_code === 'weak_password' || /password/i.test(details.msg || details.message || '')) fail(400, 'Supabase no acepta esta contraseña con su política actual. El administrador debe revisar la configuración de contraseñas en Supabase.');
    }
    fail(admin ? 502 : 401, admin ? 'No se pudo completar la operación de cuenta. Revisa la configuración de Supabase.' : 'Usuario o contraseña incorrectos.');
  }
  if (response.status === 204) return {};
  return response.json();
}
async function checkPassword(env, user, password) {
  const result = await supabase(env, 'token?grant_type=password', { data: { email: user.email, password } });
  if (!result.access_token || result.user?.id !== user.supabase_id) fail(401, 'Usuario o contraseña incorrectos.');
  const checked = await supabase(env, 'user', { method: 'GET', token: result.access_token });
  if (checked.id !== user.supabase_id) fail(401, 'No se pudo verificar la identidad.');
  // Supabase is used only to establish identity; its tokens never reach storage or the browser.
  await supabase(env, 'logout?scope=local', { token: result.access_token });
}
export async function authenticate(request, env, allowPasswordChange = false) {
  const raw = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) fail(401, 'Inicia sesión para continuar.');
  const tokenHash = await digest(raw);
  const user = await env.DB.prepare(`SELECT u.*,s.token_hash,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>? AND s.auth_epoch=u.auth_epoch AND u.active=1`).bind(tokenHash, now()).first();
  if (!user) fail(401, 'La sesión ha caducado o ha sido revocada.');
  if (user.must_change_password && !allowPasswordChange) fail(403, 'Debes cambiar tu contraseña temporal antes de continuar.');
  return user;
}
export function requireAdmin(user) { if (user.role !== 'admin') fail(403, 'Solo el administrador puede realizar esta acción.'); }
export async function authRoutes(request, env, path) {
  if (path === '/api/auth/login' && request.method === 'POST') {
    const data = await body(request); exactKeys(data, ['username', 'password']);
    const username = text(data.username, 'el usuario', 80).toLowerCase();
    if (typeof data.password !== 'string' || !data.password || data.password.length > 256) fail(401, 'Usuario o contraseña incorrectos.');
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    await rateLimit(env, 'login-ip:' + await digest(ip), 30, 900);
    await rateLimit(env, 'login-user:' + await digest(username), 8, 900);
    const user = await env.DB.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE AND active=1').bind(username).first();
    if (!user) fail(401, 'Usuario o contraseña incorrectos.');
    await checkPassword(env, user, data.password);
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
    const t = now();
    const inserted = await env.DB.prepare(`INSERT INTO sessions(token_hash,user_id,auth_epoch,created_at,expires_at)
      SELECT ?,id,auth_epoch,?,? FROM users WHERE id=? AND active=1 AND auth_epoch=?`).bind(await digest(token), t, t + SESSION_SECONDS, user.id, user.auth_epoch).run();
    if (!inserted.meta.changes) fail(401, 'La cuenta ha cambiado. Vuelve a iniciar sesión.');
    await audit(env, user.id, 'login', user.id);
    return json({ user: publicUser(user) }, 200, { 'set-cookie': `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}` });
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    try { const user = await authenticate(request, env, true); await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(user.token_hash).run(); } catch(e) { if (e.status !== 401) throw e; }
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` });
  }
  const user = await authenticate(request, env, true);
  if (path === '/api/auth/me' && request.method === 'GET') return json({ user: publicUser(user) });
  if (path === '/api/auth/change-password' && request.method === 'POST') {
    const data = await body(request); exactKeys(data, ['currentPassword', 'newPassword']);
    passwordPolicy(data.newPassword, user.role);
    if (data.newPassword === data.currentPassword) fail(400, 'La nueva contraseña debe ser diferente.');
    await rateLimit(env, `password:${user.id}`, 8, 900);
    await checkPassword(env, user, data.currentPassword);
    await revoke(env, user.id);
    await supabase(env, `admin/users/${encodeURIComponent(user.supabase_id)}`, { admin: true, method: 'PUT', data: { password: data.newPassword } });
    const changed = await env.DB.prepare('UPDATE users SET must_change_password=0,updated_at=? WHERE id=? AND active=1 AND auth_epoch=?').bind(now(), user.id, user.auth_epoch + 1).run();
    if (!changed.meta.changes) fail(409, 'La cuenta ha cambiado durante la operación. Vuelve a iniciar sesión.');
    await audit(env, user.id, 'password_changed', user.id);
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` });
  }
  fail(404, 'Ruta no encontrada.');
}
export function passwordPolicy(password, role = 'worker') {
  const min = role === 'admin' ? 15 : 6;
  if (typeof password !== 'string' || password.length < min || password.length > 128) fail(400, `La contraseña debe tener entre ${min} y 128 caracteres.`);
  if (role === 'admin' && (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9\s]/.test(password))) fail(400, 'La contraseña del administrador debe incluir mayúscula, minúscula, número y símbolo.');
}
export async function revoke(env, id) {
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET auth_epoch=auth_epoch+1,updated_at=? WHERE id=?').bind(now(), id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id)
  ]);
}
export async function userRoutes(request, env, user, path) {
  requireAdmin(user);
  if (path === '/api/admin/users' && request.method === 'GET') {
    const result = await env.DB.prepare("SELECT * FROM users WHERE role='worker' ORDER BY display_name").all();
    return json(result.results.map(publicUser));
  }
  if (path === '/api/admin/users' && request.method === 'POST') {
    const data = await body(request); exactKeys(data, ['username', 'displayName', 'password']);
    const username = text(data.username, 'el usuario', 80).toLowerCase(), name = text(data.displayName, 'el nombre');
    if (!/^[a-z0-9._-]{3,80}$/.test(username)) fail(400, 'Usuario no válido.');
    // Encode the username to avoid invalid email local-parts (leading/consecutive dots).
    const local = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/.test(username) && username.length <= 64 ? username : 'u-' + (await digest(username)).slice(0,60);
    const email = `${local}@users.partes.invalid`;
    passwordPolicy(data.password);
    if (await env.DB.prepare('SELECT id FROM users WHERE username=? OR email=?').bind(username, email).first()) fail(409, 'El usuario o correo ya existe.');
    await rateLimit(env, `admin:${user.id}`, 40, 3600);
    const account = await supabase(env, 'admin/users', { admin: true, data: { email, password: data.password, email_confirm: true } });
    const supaId = account.id || account.user?.id;
    if (!supaId) fail(502, 'No se pudo verificar la nueva cuenta.');
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare("INSERT INTO users(id,supabase_id,username,email,display_name,role,active,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,'worker',1,1,?,?)").bind(id, supaId, username, email, name, now(), now()).run();
    } catch {
      // A partially created Auth account cannot access the app without a matching D1 user.
      fail(503, 'La cuenta no pudo vincularse. Contacta con el administrador técnico antes de repetir el alta.');
    }
    await audit(env, user.id, 'worker_created', id); return json({ id }, 201);
  }
  const match = path.match(/^\/api\/admin\/users\/([^/]+)\/(status|password)$/);
  if (match && request.method === 'POST') {
    const target = await env.DB.prepare("SELECT * FROM users WHERE id=? AND role='worker'").bind(match[1]).first();
    if (!target) fail(404, 'Trabajador no encontrado.');
    const data = await body(request);
    if (match[2] === 'status') {
      exactKeys(data, ['active']); if (typeof data.active !== 'boolean') fail(400, 'Estado no válido.');
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET active=?,auth_epoch=auth_epoch+1,updated_at=? WHERE id=?').bind(data.active ? 1 : 0, now(), target.id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id)
      ]);
      await audit(env, user.id, data.active ? 'worker_enabled' : 'worker_disabled', target.id);
    } else {
      exactKeys(data, ['password']); passwordPolicy(data.password);
      await rateLimit(env, `admin:${user.id}`, 40, 3600);
      // Revoke first: even a provider error cannot leave an old app session authenticated.
      await revoke(env, target.id);
      await env.DB.prepare('UPDATE users SET must_change_password=1 WHERE id=?').bind(target.id).run();
      await supabase(env, `admin/users/${encodeURIComponent(target.supabase_id)}`, { admin: true, method: 'PUT', data: { password: data.password } });
      await audit(env, user.id, 'worker_password_reset', target.id);
    }
    return json({ ok: true });
  }
  fail(404, 'Ruta no encontrada.');
}

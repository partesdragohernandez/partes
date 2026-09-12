import { body, canaryDay, exactKeys, fail, json } from './http.js';
import { now, requireAdmin } from './auth.js';
import { asDataURL, imageBytes, validSignature } from './media.js';
const fields = ['name','surname','dni','phone','address','company','insurer','claimNo','time','description','observations','hasDamage','damageWhere','trades','sqm','injuredPhone','housingNo','injuredDamage','signerName','signerDni','status','visitDate','assignedUserId'];
const reserved = ['name','surname','dni','phone','address','company','insurer','claimNo','time','description','visitDate','assignedUserId'];
const col = key => key.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
export function canEdit(user, row) { return user.role === 'admin' || row.assigned_user_id === user.id && row.visit_date === canaryDay(); }
export async function readCase(env, user, id, edit = false) {
  const live = liveSession(user);
  const row = await env.DB.prepare(`SELECT c.*,u.display_name AS assigned_name FROM cases c LEFT JOIN users u ON u.id=c.assigned_user_id
    WHERE c.id=? AND c.deleted_at IS NULL AND (?='admin' OR c.assigned_user_id=?) AND ${live.sql}`).bind(id, user.role, user.id, ...live.args).first();
  if (!row) fail(404, 'Parte no encontrado.');
  if (edit && !canEdit(user, row)) fail(403, 'Solo puedes editar tus partes con fecha de visita de hoy (Canarias).');
  return row;
}
function liveSession(user) {
  return { sql: 'EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.id=? AND u.active=1 AND u.must_change_password=0 AND s.auth_epoch=u.auth_epoch AND s.expires_at>?)', args: [user.token_hash, user.id, now()] };
}
export async function detail(env, user, id) {
  const row = await readCase(env, user, id);
  const photos = await env.DB.prepare('SELECT object_key,name FROM case_photos WHERE case_id=? ORDER BY id').bind(id).all();
  const result = [];
  for (const photo of photos.results) {
    await readCase(env, user, id);
    const object = await env.PHOTOS.get(photo.object_key);
    if (object) result.push({ key: photo.object_key, name: photo.name, data: await asDataURL(object) });
  }
  let signature = '';
  if (row.signature_key) {
    await readCase(env, user, id);
    const object = await env.PHOTOS.get(row.signature_key); if (object) signature = await asDataURL(object);
  }
  await readCase(env, user, id);
  const { user_id, last_mutation, deleted_at, signature_key, ...safe } = row;
  return { ...safe, photos: result, signature, can_edit: canEdit(user, row) };
}
export async function saveCase(request, env, user, importing = false) {
  if (importing) requireAdmin(user);
  const data = await body(request, 60000000);
  exactKeys(data, [...fields, 'id', 'version', 'photos', 'signature']);
  if (typeof data.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.id)) fail(400, 'Identificador no válido.');
  const exists = await env.DB.prepare('SELECT id FROM cases WHERE id=?').bind(data.id).first();
  if (!exists) requireAdmin(user);
  const old = exists ? await readCase(env, user, data.id, true) : null;
  if (old && data.version !== old.version) fail(409, 'El parte ha cambiado. Vuelve a abrirlo antes de guardar.');
  if (user.role !== 'admin' && reserved.some(key => Object.hasOwn(data, key))) fail(403, 'No puedes modificar los datos iniciales ni la asignación del parte.');
  const values = Object.fromEntries(fields.map(key => [key, Object.hasOwn(data, key) ? data[key] : old?.[col(key)] ?? (key === 'assignedUserId' ? null : '')]));
  for (const key of fields.filter(k => k !== 'assignedUserId')) if (typeof values[key] !== 'string' || values[key].length > 20000) fail(400, 'Hay un campo con formato o longitud no válido.');
  if (!values.company.trim()) fail(400, 'Escribe el nombre de la empresa.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.visitDate) || Number.isNaN(Date.parse(values.visitDate)) || new Date(values.visitDate).toISOString().slice(0,10) !== values.visitDate) fail(400, 'Fecha de visita no válida.');
  if (values.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) fail(400, 'Hora de visita no válida.');
  if (!['BORRADOR','PENDIENTE','COMPLETADO'].includes(values.status)) fail(400, 'Estado no válido.');
  const assigned = values.assignedUserId || null;
  if (assigned !== null && (typeof assigned !== 'string' || assigned.length > 100)) fail(400, 'Trabajador no válido.');
  const assignmentChanged = !old || assigned !== old.assigned_user_id;
  if (!old && !assigned) fail(400, 'Selecciona un trabajador activo para el nuevo parte.');
  if (assignmentChanged && assigned && !await env.DB.prepare("SELECT id FROM users WHERE id=? AND role='worker' AND active=1").bind(assigned).first()) fail(400, 'El trabajador asignado debe estar activo.');
  if (old && old.assigned_user_id && !assigned) fail(400, 'Selecciona un trabajador activo para reasignar el parte.');
  values.assignedUserId = assigned;
  const photos = data.photos;
  if (photos !== undefined && (!Array.isArray(photos) || photos.length > 40)) fail(400, 'Máximo 40 fotos por parte.');
  const existingPhotos = old ? (await env.DB.prepare('SELECT object_key,name FROM case_photos WHERE case_id=?').bind(data.id).all()).results : [];
  const prepared = photos?.map(photo => {
    if (!photo || typeof photo.name !== 'string' || photo.name.length > 200) fail(400, 'Nombre de foto no válido.');
    if (photo.key) {
      if (!existingPhotos.some(p => p.object_key === photo.key)) fail(403, 'La foto no pertenece al parte.');
      return { name: photo.name, key: photo.key };
    }
    return { name: photo.name, ...imageBytes(photo.data) };
  });
  let sig = null;
  if (data.signature !== undefined && data.signature !== '') { sig = imageBytes(data.signature, true); await validSignature(sig.bytes); }
  let signatureKey = data.signature === '' ? '' : old?.signature_key || '';
  if (values.status === 'COMPLETADO') {
    const missing = [];
    if (!values.signerName.trim()) missing.push('Nombre del firmante');
    if (!values.signerDni.trim()) missing.push('DNI del firmante');
    if (!sig && !signatureKey) missing.push('firma manuscrita');
    if (missing.length) fail(400, 'Para COMPLETADO falta: ' + missing.join(', ') + '.');
    if (!sig && signatureKey) {
      await readCase(env, user, data.id, true);
      const object = await env.PHOTOS.get(signatureKey); if (!object) fail(400, 'Falta la firma manuscrita guardada.');
      await validSignature(new Uint8Array(await object.arrayBuffer()));
    }
  }
  const mutation = crypto.randomUUID(), newVersion = (old?.version ?? -1) + 1, stamp = new Date().toISOString();
  // Unique immutable keys ensure a failed save cannot overwrite existing R2 objects.
  for (const photo of prepared || []) if (!photo.key) {
    if (old) await readCase(env, user, data.id, true);
    photo.key = `cases/${data.id}/${mutation}/photo-${crypto.randomUUID()}`;
    await env.PHOTOS.put(photo.key, photo.bytes, { httpMetadata: { contentType: photo.contentType } });
  }
  if (sig) {
    if (old) await readCase(env, user, data.id, true);
    signatureKey = `cases/${data.id}/${mutation}/signature.png`;
    await env.PHOTOS.put(signatureKey, sig.bytes, { httpMetadata: { contentType: 'image/png' } });
  }
  const live = liveSession(user);
  const assignGuard = assignmentChanged && assigned ? " AND EXISTS(SELECT 1 FROM users WHERE id=? AND role='worker' AND active=1)" : '';
  const assignArgs = assignmentChanged && assigned ? [assigned] : [];
  const permission = user.role === 'admin' ? '' : ' AND assigned_user_id=? AND visit_date=?';
  const permissionArgs = user.role === 'admin' ? [] : [user.id, canaryDay()];
  const sqls = [];
  if (old) {
    sqls.push(env.DB.prepare(`UPDATE cases SET ${fields.map(k => `${col(k)}=?`).join(',')},signature_key=?,updated_at=?,version=?,last_mutation=?
      WHERE id=? AND version=? AND deleted_at IS NULL${permission} AND ${live.sql}${assignGuard}`)
      .bind(...fields.map(k => values[k]), signatureKey, stamp, newVersion, mutation, data.id, old.version, ...permissionArgs, ...live.args, ...assignArgs));
  } else {
    sqls.push(env.DB.prepare(`INSERT INTO cases(id,user_id,${fields.map(col).join(',')},signature_key,created_at,updated_at,version,last_mutation)
      SELECT ?,?,${fields.map(() => '?').join(',')},?,?,?,?,? WHERE ${live.sql}${assignGuard}`)
      .bind(data.id, user.id, ...fields.map(k => values[k]), signatureKey, stamp, stamp, newVersion, mutation, ...live.args, ...assignArgs));
  }
  const won = 'EXISTS(SELECT 1 FROM cases WHERE id=? AND last_mutation=?)';
  if (prepared) {
    sqls.push(env.DB.prepare(`DELETE FROM case_photos WHERE case_id=? AND ${won}`).bind(data.id, data.id, mutation));
    sqls.push(env.DB.prepare(`INSERT INTO case_photos(case_id,object_key,name)
      SELECT ?,json_extract(value,'$.key'),json_extract(value,'$.name') FROM json_each(?) WHERE ${won}`)
      .bind(data.id, JSON.stringify(prepared.map(p => ({key:p.key,name:p.name}))), data.id, mutation));
  }
  sqls.push(env.DB.prepare(`INSERT INTO audit_log(actor_id,action,target_id,created_at) SELECT ?,?,?,? WHERE ${won}`).bind(user.id, assignmentChanged ? 'case_assigned' : 'case_saved', data.id, now(), data.id, mutation));
  const result = await env.DB.batch(sqls);
  if (!result[0].meta.changes) fail(409, 'La sesión, la asignación o el parte han cambiado. Vuelve a abrirlo.');
  return json({ id: data.id, version: newVersion }, old ? 200 : 201);
}
export async function caseRoutes(request, env, user, path) {
  if (['/api/cases','/api/export'].includes(path) && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT c.id,c.name,c.surname,c.address,c.claim_no,c.time,c.status,c.visit_date,c.company,c.created_at,c.updated_at,c.assigned_user_id,c.version,u.display_name AS assigned_name
      FROM cases c LEFT JOIN users u ON u.id=c.assigned_user_id WHERE c.deleted_at IS NULL AND (?='admin' OR c.assigned_user_id=?) ORDER BY c.visit_date DESC,c.time ASC,c.id`).bind(user.role, user.id).all();
    return json(result.results);
  }
  if ((path === '/api/cases' || path === '/api/import') && request.method === 'POST') return saveCase(request, env, user, path === '/api/import');
  const match = path.match(/^\/api\/cases\/([a-zA-Z0-9_-]{1,100})$/);
  if (match && request.method === 'GET') return json(await detail(env, user, match[1]));
  if (match && request.method === 'DELETE') {
    requireAdmin(user); const row = await readCase(env, user, match[1], true); const live = liveSession(user);
    const changed = await env.DB.prepare(`UPDATE cases SET deleted_at=?,version=version+1 WHERE id=? AND version=? AND ${live.sql}`).bind(new Date().toISOString(), row.id, row.version, ...live.args).run();
    if (!changed.meta.changes) fail(409, 'El parte ha cambiado.');
    return json({ ok: true });
  }
  fail(404, 'Ruta no encontrada.');
}

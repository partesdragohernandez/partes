const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

function userId(request) {
  // Single-user MVP. Replace with authenticated identity before sharing with others.
  return request.headers.get("X-User-Id") || "demo-user";
}

function dataUrlToBytes(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.*)$/s);
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
  return { contentType: m[1], bytes };
}

function safeName(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (!env.DB || !env.PHOTOS) return json({ error: "Cloud storage is not configured yet." }, 503);
    const uid = userId(request);

    try {
      if (request.method === "GET" && url.pathname === "/api/cases") {
        const r = await env.DB.prepare(
          "SELECT id,name,surname,address,claim_no,time,status,visit_date,created_at,updated_at FROM cases WHERE user_id=? ORDER BY updated_at DESC"
        ).bind(uid).all();
        return json(r.results || []);
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/cases/")) {
        const id = decodeURIComponent(url.pathname.split("/").pop());
        const r = await env.DB.prepare("SELECT * FROM cases WHERE id=? AND user_id=?").bind(id, uid).first();
        if (!r) return json({ error: "not found" }, 404);
        const p = await env.DB.prepare("SELECT object_key,name FROM case_photos WHERE case_id=? ORDER BY id").bind(id).all();
        const photos = [];
        for (const x of p.results || []) {
          const o = await env.PHOTOS.get(x.object_key);
          if (!o) continue;
          const b = new Uint8Array(await o.arrayBuffer());
          let s = ""; for (const n of b) s += String.fromCharCode(n);
          photos.push({ name: x.name, data: `data:${o.httpMetadata?.contentType || "image/jpeg"};base64,${btoa(s)}` });
        }
        let signature = "";
        if (r.signature_key) {
          const o = await env.PHOTOS.get(r.signature_key);
          if (o) {
            const b = new Uint8Array(await o.arrayBuffer()); let s = "";
            for (const n of b) s += String.fromCharCode(n);
            signature = `data:${o.httpMetadata?.contentType || "image/png"};base64,${btoa(s)}`;
          }
        }
        return json({ ...r, photos, signature });
      }

      if (request.method === "DELETE" && url.pathname.startsWith("/api/cases/")) {
        const id = decodeURIComponent(url.pathname.split("/").pop());
        const row = await env.DB.prepare("SELECT signature_key FROM cases WHERE id=? AND user_id=?").bind(id, uid).first();
        const p = await env.DB.prepare("SELECT object_key FROM case_photos WHERE case_id=?").bind(id).all();
        for (const x of p.results || []) await env.PHOTOS.delete(x.object_key);
        if (row?.signature_key) await env.PHOTOS.delete(row.signature_key);
        await env.DB.prepare("DELETE FROM case_photos WHERE case_id=?").bind(id).run();
        await env.DB.prepare("DELETE FROM cases WHERE id=? AND user_id=?").bind(id, uid).run();
        return json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/api/cases") {
        const d = await request.json();
        const id = d.id || crypto.randomUUID();
        const now = new Date().toISOString();
        const keys = ["name","surname","dni","phone","address","insurer","claimNo","time","description","observations","hasDamage","damageWhere","trades","sqm","injuredPhone","housingNo","injuredDamage","signerDni","status","visitDate"];
        const cols = keys.map(k => k.replace(/[A-Z]/g, m => "_" + m.toLowerCase()));
        const vals = keys.map(k => d[k] ?? "");
        const existing = await env.DB.prepare("SELECT id,signature_key FROM cases WHERE id=? AND user_id=?").bind(id, uid).first();
        if (existing) {
          await env.DB.prepare(`UPDATE cases SET ${cols.map(c => `${c}=?`).join(",")},updated_at=?,signature_key=? WHERE id=? AND user_id=?`)
            .bind(...vals, now, existing.signature_key || "", id, uid).run();
        } else {
          await env.DB.prepare(`INSERT INTO cases(id,user_id,${cols.join(",")},signature_key,created_at,updated_at) VALUES(?, ?, ${cols.map(() => "?").join(",")}, ?, ?, ?)`)
            .bind(id, uid, ...vals, "", now, now).run();
        }

        const oldPhotos = await env.DB.prepare("SELECT object_key FROM case_photos WHERE case_id=?").bind(id).all();
        for (const x of oldPhotos.results || []) await env.PHOTOS.delete(x.object_key);
        await env.DB.prepare("DELETE FROM case_photos WHERE case_id=?").bind(id).run();

        for (let i = 0; i < (d.photos || []).length; i++) {
          const p = d.photos[i]; const parsed = dataUrlToBytes(p.data); if (!parsed) continue;
          const key = `${uid}/${id}/photo-${i}-${safeName(p.name || "foto.jpg")}`;
          await env.PHOTOS.put(key, parsed.bytes, { httpMetadata: { contentType: parsed.contentType } });
          await env.DB.prepare("INSERT INTO case_photos(case_id,object_key,name) VALUES(?,?,?)").bind(id,key,p.name || "foto.jpg").run();
        }

        let signatureKey = existing?.signature_key || "";
        if (d.signature) {
          const parsed = dataUrlToBytes(d.signature);
          if (parsed) {
            if (signatureKey) await env.PHOTOS.delete(signatureKey);
            signatureKey = `${uid}/${id}/signature.png`;
            await env.PHOTOS.put(signatureKey, parsed.bytes, { httpMetadata: { contentType: parsed.contentType || "image/png" } });
            await env.DB.prepare("UPDATE cases SET signature_key=? WHERE id=? AND user_id=?").bind(signatureKey,id,uid).run();
          }
        } else if (signatureKey) {
          await env.PHOTOS.delete(signatureKey);
          await env.DB.prepare("UPDATE cases SET signature_key='' WHERE id=? AND user_id=?").bind(id,uid).run();
        }
        return json({ id });
      }

      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: "server_error", message: String(e?.message || e) }, 500);
    }
  }
};

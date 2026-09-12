let accountGeneration = 0;
export async function api(path, options = {}) {
  const generation = accountGeneration;
  const response = await fetch(path, { ...options, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-requested-with': 'partes', ...options.headers } });
  const data = await response.json();
  if (generation !== accountGeneration) throw new Error('La sesión ha cambiado.');
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login') window.dispatchEvent(new Event('session-expired'));
    throw new Error(data.error || 'No se pudo completar la operación.');
  }
  return data;
}
export function setupAccount({ onUser, onWorkersChanged, notify }) {
  const panel = document.createElement('section'); panel.id = 'authPanel'; panel.className = 'auth-panel';
  panel.innerHTML = '<form id="loginForm" class="auth-card"><h1>Acceso a partes</h1><label>Usuario<input name="username" autocomplete="username" required maxlength="80"></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><p class="auth-error" role="alert"></p><button class="btn secondary" type="submit">Entrar</button><p>Las cuentas las crea el administrador. No hay registro público.</p></form><form id="passwordForm" class="auth-card hidden"><h1>Cambiar contraseña</h1><p>La contraseña temporal debe cambiarse antes de acceder a los partes.</p><label>Contraseña actual<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>Nueva contraseña (mínimo 15 caracteres: mayúscula, minúscula, número y símbolo)<input name="newPassword" type="password" autocomplete="new-password" minlength="15" maxlength="128" required></label><label>Repite la nueva contraseña<input name="repeat" type="password" autocomplete="new-password" minlength="15" maxlength="128" required></label><p class="auth-error" role="alert"></p><button class="btn secondary" type="submit">Cambiar contraseña</button><button class="btn ghost" type="button" id="cancelPassword">Cerrar sesión</button></form>';
  document.body.append(panel);
  const login = panel.querySelector('#loginForm'), password = panel.querySelector('#passwordForm');
  let currentUser;
  const show = user => {
    currentUser = user;
    document.body.classList.toggle('signed-out', !user || user.mustChangePassword);
    panel.classList.toggle('hidden', !!user && !user.mustChangePassword);
    login.classList.toggle('hidden', !!user?.mustChangePassword);
    password.classList.toggle('hidden', !user?.mustChangePassword);
    if (!user) { login.reset(); password.reset(); }
  };
  const enter = async user => {
    accountGeneration++;
    for (const modal of document.querySelectorAll('dialog[open]')) modal.close();
    document.querySelector('#workersList')?.replaceChildren();
    document.querySelector('#workerForm')?.reset();
    show(user); await onUser(user && !user.mustChangePassword ? user : null);
  };
  show(null);
  login.onsubmit = async event => {
    event.preventDefault(); const button = login.querySelector('button'); button.disabled = true;
    const error = login.querySelector('.auth-error'); error.textContent = '';
    try { const result = await api('/api/auth/login', { method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(login))) }); login.reset(); await enter(result.user); }
    catch(e) { error.textContent = e.message; } finally { button.disabled = false; }
  };
  password.onsubmit = async event => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(password)), error = password.querySelector('.auth-error'); error.textContent = '';
    if (data.newPassword !== data.repeat) { error.textContent = 'Las contraseñas nuevas no coinciden.'; return; }
    const button = password.querySelector('button'); button.disabled = true;
    try { await api('/api/auth/change-password', {method:'POST',body:JSON.stringify({currentPassword:data.currentPassword,newPassword:data.newPassword})}); await enter(null); notify('Contraseña cambiada. Inicia sesión con la nueva contraseña.'); }
    catch(e) { error.textContent = e.message; } finally { button.disabled = false; }
  };
  const logout = async () => { try { await api('/api/auth/logout', {method:'POST',body:'{}'}); await enter(null); } catch(e) { notify(e.message); } };
  document.getElementById('logoutBtn').onclick = logout;
  panel.querySelector('#cancelPassword').onclick = logout;
  document.getElementById('passwordBtn').onclick = () => { show({...currentUser,mustChangePassword:true}); };
  window.addEventListener('session-expired', () => { enter(null).catch(()=>{}); });
  const dialog = document.createElement('dialog'); dialog.className = 'workers-dialog'; dialog.id = 'workersDialog';
  dialog.innerHTML = '<h2>Trabajadores</h2><form id="workerForm"><label>Nombre visible<input name="displayName" required maxlength="200"></label><label>Usuario<input name="username" required pattern="[a-zA-Z0-9._-]{3,80}" autocomplete="off"></label><label>Correo<input name="email" type="email" required></label><label>Contraseña temporal (mínimo 15 caracteres: mayúscula, minúscula, número y símbolo)<input name="password" type="password" autocomplete="new-password" required minlength="15" maxlength="128"></label><button class="btn secondary" type="submit">Crear trabajador</button></form><p role="alert" id="workersError"></p><div id="workersList"></div><button class="btn ghost" id="closeWorkers" type="button">Cerrar</button>';
  document.body.append(dialog);
  const refreshWorkers = async () => {
    const users = await api('/api/admin/users'); const list = dialog.querySelector('#workersList'); list.replaceChildren();
    for (const user of users) {
      const row = document.createElement('div'); row.className = 'worker-row';
      const title = document.createElement('p'); title.textContent = `${user.displayName} · ${user.username} · ${user.active ? 'Activo' : 'Desactivado'}`; row.append(title);
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'btn ghost'; toggle.textContent = user.active ? 'Desactivar' : 'Reactivar';
      toggle.onclick = async () => { toggle.disabled = true; try { await api(`/api/admin/users/${user.id}/status`,{method:'POST',body:JSON.stringify({active:!user.active})}); await refreshWorkers(); await onWorkersChanged(); } catch(e) { dialog.querySelector('#workersError').textContent=e.message; toggle.disabled=false; } };
      const resetForm = document.createElement('form');
      resetForm.innerHTML='<label>Nueva contraseña temporal (15–128 caracteres, mayúscula, minúscula, número y símbolo)<input type="password" autocomplete="new-password" minlength="15" maxlength="128" required></label><button class="btn secondary" type="submit">Restablecer contraseña</button>';
      resetForm.onsubmit=async event=>{event.preventDefault();const button=resetForm.querySelector('button');button.disabled=true;try{await api(`/api/admin/users/${user.id}/password`,{method:'POST',body:JSON.stringify({password:resetForm.querySelector('input').value})});resetForm.reset();notify('Contraseña restablecida y sesiones revocadas.')}catch(e){dialog.querySelector('#workersError').textContent=e.message}finally{button.disabled=false}};
      row.append(toggle,resetForm); list.append(row);
    }
  };
  document.getElementById('workersBtn').onclick=async()=>{dialog.showModal();try{await refreshWorkers()}catch(e){dialog.querySelector('#workersError').textContent=e.message}};
  dialog.querySelector('#closeWorkers').onclick=()=>dialog.close();
  const workerForm=dialog.querySelector('#workerForm');
  workerForm.onsubmit=async event=>{event.preventDefault();const button=workerForm.querySelector('button');button.disabled=true;dialog.querySelector('#workersError').textContent='';try{await api('/api/admin/users',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(workerForm)))});workerForm.reset();await refreshWorkers();await onWorkersChanged();notify('Trabajador creado. Deberá cambiar su contraseña al entrar.')}catch(e){dialog.querySelector('#workersError').textContent=e.message}finally{button.disabled=false}};
  api('/api/auth/me').then(result=>enter(result.user)).catch(()=>enter(null));
}

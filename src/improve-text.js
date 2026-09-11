export function setupTextImprovement({ getCaseId, isReadOnly, notify }) {
  for (const id of ['descripcionQueHacer', 'observaciones']) {
    const field = document.getElementById(id);
    field.spellcheck = true;
    field.lang = 'es';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn secondary improve-text-button';
    button.textContent = '✨ Mejorar texto';
    field.parentElement.insertAdjacentElement('afterend', button);
    let busy = false;
    const sync = () => { button.disabled = busy || field.disabled || isReadOnly() || !field.value.trim(); };
    field.addEventListener('input', sync);
    new MutationObserver(sync).observe(field, { attributes: true, attributeFilter: ['disabled'] });
    sync();
    button.onclick = async () => {
      if (busy || field.disabled || isReadOnly()) return;
      const original = field.value, caseId = getCaseId();
      if (!original.trim()) return;
      if (original.length > 4000) return notify('Máximo 4000 caracteres para mejorar texto.');
      busy = true; sync(); button.textContent = 'Mejorando…';
      const unchanged = () => getCaseId() === caseId && field.value === original && !field.disabled && !isReadOnly();
      try {
        const response = await fetch('/api/improve-text', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: original }), signal: AbortSignal.timeout(30000)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo mejorar el texto.');
        if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('No se recibió una propuesta válida.');
        if (!unchanged()) return notify('El parte o el texto ha cambiado. Vuelve a solicitar la mejora.');
        const dialog = document.createElement('dialog');
        dialog.className = 'improve-text-dialog';
        dialog.setAttribute('aria-labelledby', 'improve-text-title');
        dialog.innerHTML = '<h2 id="improve-text-title">Revisar texto mejorado</h2><p>Comprueba que conserva todos los datos y el significado antes de aceptarlo.</p><h3>Original</h3><pre class="original"></pre><h3>Propuesta</h3><pre class="proposal"></pre><div class="improve-text-actions"><button type="button" class="btn ghost" autofocus>Conservar original</button><button type="button" class="btn secondary">Aceptar mejora</button></div>';
        dialog.querySelector('.original').textContent = original;
        dialog.querySelector('.proposal').textContent = result.text;
        const [cancel, accept] = dialog.querySelectorAll('button');
        cancel.onclick = () => dialog.close();
        accept.onclick = () => {
          if (!unchanged()) { notify('El parte o el texto ha cambiado. No se ha sustituido.'); dialog.close(); return; }
          field.value = result.text;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          dialog.close(); notify('Texto aceptado. Pulsa Guardar para guardar el parte.');
        };
        document.body.append(dialog);
        dialog.showModal();
        await new Promise(resolve => dialog.addEventListener('close', resolve, { once: true }));
        dialog.remove();
        button.focus();
      } catch (error) { notify(error.name === 'TimeoutError' ? 'La solicitud ha tardado demasiado. Se conserva el original.' : error.message); }
      finally { busy = false; button.textContent = '✨ Mejorar texto'; sync(); }
    };
  }
}

// Run against Vite on localhost. PLAYWRIGHT_MODULE may point to a bundled Playwright module.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let sent, saved, mode = 'ok', release;
    await page.route('https://**/*', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.route('**/api/cases**', route => {
      if (route.request().method() === 'POST') saved = route.request().postDataJSON();
      return route.fulfill({ json: route.request().method() === 'GET' ? [] : { id: 'test' } });
    });
    await page.route('**/api/improve-text', async route => {
      sent = route.request().postDataJSON();
      if (mode === 'delay') await new Promise(resolve => { release = resolve; });
      await route.fulfill(mode === 'error' ? { status: 429, json: { error: 'Cuota agotada' } } : { json: { text: 'Hay humedad. No se ha reparado.' } });
    });
    await page.goto('http://127.0.0.1:5173');
    if (await page.locator('#mobileMenuBtn').isVisible()) await page.locator('#mobileMenuBtn').click();
    await page.locator('#roleBtn').click();
    await page.locator('#emptyNew').click();
    await page.locator('#empresa').fill('Empresa ficticia');
    await page.locator('#dni').fill('DATO-NO-ENVIAR');
    const buttons = page.locator('.improve-text-button');
    assert.equal(await buttons.count(), 2);
    for (const [index, id] of ['descripcionQueHacer', 'observaciones'].entries()) {
      const field = page.locator('#' + id), button = buttons.nth(index);
      assert.equal(await field.getAttribute('spellcheck'), 'true');
      assert.equal(await button.isDisabled(), true);
      await field.fill('hay umedad no se a reparado');
      await button.click();
      await page.locator('dialog[open]').waitFor();
      assert.deepEqual(sent, { text: 'hay umedad no se a reparado' });
      assert.equal(await field.inputValue(), sent.text);
      await page.getByRole('button', { name: 'Conservar original' }).click();
      assert.equal(await field.inputValue(), sent.text);
      await button.click();
      await page.getByRole('button', { name: 'Aceptar mejora' }).click();
      assert.equal(await field.inputValue(), 'Hay humedad. No se ha reparado.');
      await button.click();
      await page.locator('dialog[open]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('dialog').waitFor({ state: 'detached' });
      mode = 'error'; await button.click();
      await page.waitForFunction(() => document.querySelector('#toast').textContent === 'Cuota agotada');
      assert.equal(await field.inputValue(), 'Hay humedad. No se ha reparado.');
      mode = 'delay'; await button.click();
      await page.waitForTimeout(100);
      await field.fill('Edición nueva');
      release();
      await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('ha cambiado'));
      assert.equal(await field.inputValue(), 'Edición nueva');
      assert.equal(await page.locator('dialog').count(), 0);
      mode = 'ok';
    }
    assert.equal(await page.locator('#dni').inputValue(), 'DATO-NO-ENVIAR');
    await buttons.nth(1).click();
    await page.getByRole('button', { name: 'Aceptar mejora' }).click();
    await page.locator('#saveBtn').click();
    await page.waitForTimeout(100);
    assert.equal(saved.observations, 'Hay humedad. No se ha reparado.');
    assert.equal(saved.dni, 'DATO-NO-ENVIAR');
    mode = 'delay'; await buttons.nth(1).click();
    await page.waitForTimeout(100);
    if (await page.locator('#mobileMenuBtn').isVisible()) await page.locator('#mobileMenuBtn').click();
    await page.locator('#newBtn').click();
    release();
    await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('ha cambiado'));
    assert.equal(await page.locator('#observaciones').inputValue(), '');
    await page.evaluate(() => { window.currentCase.visitDate = '2000-01-01'; window.currentCase.observaciones = 'Texto antiguo'; });
    if (await page.locator('#mobileMenuBtn').isVisible()) await page.locator('#mobileMenuBtn').click();
    await page.locator('#roleBtn').click();
    assert.equal(await page.locator('#observaciones').isDisabled(), true);
    assert.equal(await buttons.nth(1).isDisabled(), true);

    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: ambos campos, aceptar, conservar, Escape, cuota, edición concurrente, cambio de parte, guardar, solo lectura, privacidad y ancho móvil`);
    await page.close();
  }
} finally { await browser.close(); }

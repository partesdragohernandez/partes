import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
 const page = await browser.newPage();
 await page.route('https://**/*',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/cases**',r=>r.fulfill({json:r.request().method()==='GET'?[]:{id:'test'}}));
 await page.goto('http://127.0.0.1:5174');
 const menu=page.locator('#mobileMenuBtn'), actions=page.locator('.top-actions');
 for(const width of [320,375,390,768,850]) {
  await page.setViewportSize({width,height:844});
  assert.ok(await menu.isVisible()); assert.ok(!(await actions.isVisible()));
  await menu.click(); assert.ok(await actions.isVisible());
  assert.equal(await menu.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape'); assert.ok(!(await actions.isVisible()));
  await menu.click(); await page.locator('.brand').click(); assert.ok(!(await actions.isVisible()));
  await menu.click(); await page.locator('#roleBtn').click(); assert.ok(!(await actions.isVisible()));
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(el=>el.id||el.className));
  assert.deepEqual(overflow,[],`overflow at ${width}`);
  await menu.click();
  if(width===390) await page.screenshot({path:'.wrangler/mobile-menu.png'});
  await page.setViewportSize({width:1280,height:844});
  assert.ok(!(await menu.isVisible()));assert.ok(await actions.isVisible());
  await page.setViewportSize({width,height:844});assert.ok(!(await actions.isVisible()));
  console.log(`PASS menu ${width}px, cierre, Escape, escritorio y desbordamiento`);
 }
 // Open the editor with synthetic data without accessing real cases.
 await page.setViewportSize({width:390,height:844});
 if((await page.locator('#roleBtn').textContent()).includes('trabajador')){await menu.click();await page.locator('#roleBtn').click()}
 await page.locator('#emptyNew').click();
 for(const width of [320,375,390]) {
  await page.setViewportSize({width,height:844});
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(el=>el.id||el.className));
  assert.deepEqual(overflow,[],`editor overflow at ${width}`);
 }
 console.log('PASS editor móvil sin desbordamiento');
} finally {await browser.close()}

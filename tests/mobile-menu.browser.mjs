import assert from 'node:assert/strict';
import {browserFixture} from './browser-fixture.mjs';
const b=await browserFixture();const {page}=b;
try {
 await b.login('admin');
 const menu=page.locator('#mobileMenuBtn'),actions=page.locator('.top-actions');
 for(const width of [320,375,390,768,850]){
  await page.setViewportSize({width,height:844});assert.ok(await menu.isVisible());assert.ok(!await actions.isVisible());
  await menu.click();assert.ok(await actions.isVisible());assert.equal(await menu.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');assert.ok(!await actions.isVisible());
  await menu.click();await page.locator('.brand').click();assert.ok(!await actions.isVisible());
  await menu.click();await page.locator('#newBtn').click();assert.ok(!await actions.isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(el=>el.id||el.className));assert.deepEqual(overflow,[],`overflow ${width}`);
  if(width===390){await menu.click();await page.screenshot({path:'.wrangler/mobile-auth-menu.png'});await page.keyboard.press('Escape')}
  await page.setViewportSize({width:1280,height:844});assert.ok(!await menu.isVisible());assert.ok(await actions.isVisible());
  console.log(`PASS móvil ${width}px: menú, selección, fuera, Escape, editor y desbordamiento; escritorio visible`);
 }
 assert.deepEqual(b.errors,[]);
}finally{await b.close()}

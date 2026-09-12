import assert from 'node:assert/strict';
import {browserFixture} from './browser-fixture.mjs';
for(const width of [1280,390]){
 const b=await browserFixture(width);const {page,f}=b;
 try{
  await b.login('admin');await b.action('newBtn');
  await page.locator('#assignedUserId').selectOption(f.users.a.id);await page.locator('#empresa').fill('Empresa ficticia');await page.locator('#dni').fill('DATO-NO-ENVIAR');await page.locator('#saveBtn').click();
  await page.waitForFunction(()=>window.currentCase?.version===0);
  let sent,mode='ok',release;
  await page.route('**/api/improve-text',async route=>{sent=route.request().postDataJSON();if(mode==='delay')await new Promise(r=>release=r);await route.fulfill(mode==='error'?{status:429,json:{error:'Cuota agotada'}}:{json:{text:'Hay humedad. No se ha reparado.'}})});
  const buttons=page.locator('.improve-text-button');assert.equal(await buttons.count(),2);
  for(const [i,id] of ['descripcionQueHacer','observaciones'].entries()){
   const field=page.locator('#'+id),button=buttons.nth(i);assert.equal(await field.getAttribute('spellcheck'),'true');assert.ok(await button.isDisabled());
   await field.fill('hay umedad no se a reparado');await button.click();await page.locator('.improve-text-dialog[open]').waitFor();
   assert.deepEqual(Object.keys(sent).sort(),['caseId','field','text']);assert.equal(sent.field,i?'observations':'description');assert.equal(await field.inputValue(),sent.text);
   await page.getByRole('button',{name:'Conservar original'}).click();assert.equal(await field.inputValue(),sent.text);
   await button.click();await page.getByRole('button',{name:'Aceptar mejora'}).click();assert.equal(await field.inputValue(),'Hay humedad. No se ha reparado.');
   await button.click();await page.locator('.improve-text-dialog[open]').waitFor();await page.keyboard.press('Escape');await page.locator('.improve-text-dialog').waitFor({state:'detached'});
   mode='error';await button.click();await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Cuota agotada');assert.equal(await field.inputValue(),'Hay humedad. No se ha reparado.');
   mode='delay';await button.click();await page.waitForTimeout(50);await field.fill('Edición nueva');release();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('ha cambiado'));assert.equal(await field.inputValue(),'Edición nueva');mode='ok';
  }
  await page.locator('#saveBtn').click();await page.waitForFunction(()=>window.currentCase?.version===1);
  assert.equal(b.requests.filter(r=>r.path==='/api/cases'&&r.method==='POST').at(-1).data.dni,'DATO-NO-ENVIAR');
  await b.action('logoutBtn');await page.locator('#loginForm').waitFor();assert.equal(await page.locator('#dni').inputValue(),'');
  assert.deepEqual(b.errors,[]);console.log(`PASS mejorar texto ${width}px: privacidad, ambos campos, aceptar/conservar, errores, cambios concurrentes, guardar y logout`);
 }finally{await b.close()}
}

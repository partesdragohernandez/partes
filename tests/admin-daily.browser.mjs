import assert from 'node:assert/strict';
import {browserFixture} from './browser-fixture.mjs';
import {canaryDay} from '../backend/http.js';
const b=await browserFixture(390),{page,f}=b;
try{
 const today=canaryDay();const offset=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const rows=[['a-late',f.users.a.id,'16:00',today],['b-early',f.users.b.id,'08:00',today],['done-late',f.users.a.id,'17:00',today],['done-early',f.users.b.id,'09:00',today],['past',f.users.b.id,'10:00',offset(-1)],['future',f.users.a.id,'11:00',offset(1)]];
 for(const [id,assignedUserId,time,visitDate] of rows){assert.equal((await f.request('admin','/api/cases','POST',{id,assignedUserId,time,visitDate,status:'PENDIENTE',company:'Empresa ficticia',address:id})).status,201);}
 // Seed legacy states only in the isolated fixture; API completion validation remains tested separately.
 f.sqlite.exec("UPDATE cases SET status='COMPLETADO' WHERE id LIKE 'done-%'");
 f.sqlite.prepare("INSERT INTO cases(id,user_id,status,company,visit_date,time,created_at,updated_at) VALUES('legacy','old','PENDIENTE','Empresa ficticia',?,'12:00',?,?)").run(today,today,today);
 await b.login('admin');await page.locator('.record[data-id="legacy"]').waitFor();
 assert.equal(await page.locator('#selectedDayLabel').textContent(),today.split('-').reverse().join('/'));
 assert.deepEqual(await page.locator('.pending-group .record').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),['b-early','legacy','a-late']);
 assert.deepEqual(await page.locator('.completed-group .record').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),['done-early','done-late']);
 assert.equal(await page.locator('[data-id="legacy"] .record-assigned').textContent(),'SIN ASIGNAR');assert.equal(await page.locator('[data-id="b-early"] .record-assigned').textContent(),'b');
 await page.locator('#prevDayBtn').click();await page.locator('.record[data-id="past"]').waitFor();assert.equal(await page.locator('.record').count(),1);await page.locator('.record').click();await page.waitForFunction(()=>window.currentCase?.id==='past');assert.ok(!await page.locator('#nombre').isDisabled());assert.ok(!await page.locator('#assignedUserId').isDisabled());
 await page.locator('#observaciones').fill('Edición administrativa del pasado');await page.locator('#saveBtn').click();await page.waitForFunction(()=>window.currentCase?.version===1);
 await page.locator('#nextDayBtn').click();await page.locator('[data-id="legacy"]').waitFor();await page.locator('#nextDayBtn').click();await page.locator('[data-id="future"]').waitFor();assert.equal(await page.locator('.record').count(),1);
 await b.action('newBtn');assert.equal(await page.locator('#fechaVisita').inputValue(),offset(1));
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.setViewportSize({width:390,height:844});await page.locator('#prevDayBtn').click();await page.locator('[data-id="legacy"]').waitFor();await page.locator('#search').fill('b-early');await page.waitForFunction(()=>document.querySelectorAll('.record').length===1);assert.equal(await page.locator('.record').getAttribute('data-id'),'b-early');await page.locator('#search').fill('');await page.locator('[data-id="legacy"]').waitFor();
 await page.screenshot({path:'.wrangler/admin-daily.png'});
 await b.action('logoutBtn');await page.locator('#loginForm').waitFor();await b.login('a');await page.locator('[data-id="a-late"]').waitFor();assert.equal(await page.locator('.record').count(),2);await page.locator('#nextDayBtn').click();await page.locator('[data-id="future"]').waitFor();await page.locator('.record').click();await page.waitForFunction(()=>window.currentCase?.id==='future');assert.ok(await page.locator('#observaciones').isDisabled());assert.ok(!await page.locator('#newBtn').isVisible());
 assert.deepEqual(b.errors,[]);console.log('PASS vista diaria: fecha DD/MM/AAAA, flechas, grupos por hora, todos los trabajadores, SIN ASIGNAR, edición administrativa pasada, nuevo con fecha seleccionada, búsqueda, móvil y aislamiento del trabajador');
}finally{await b.close()}

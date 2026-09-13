import assert from 'node:assert/strict';
import {browserFixture} from './browser-fixture.mjs';
import {canaryDay} from '../backend/http.js';
const b=await browserFixture(390),{page,f}=b;
try{
 for(let i=0;i<12;i++)assert.equal((await f.request('admin','/api/cases','POST',{id:'existing-'+i,assignedUserId:f.users.a.id,visitDate:canaryDay(),company:'Empresa ficticia',status:'PENDIENTE',address:'Dirección ficticia '+i})).status,201);
 await b.login('a');await page.locator('[data-id="existing-0"]').click();await page.locator('#editor').waitFor();assert.ok(await page.locator('#nombre').isDisabled());
 await b.action('logoutBtn');await page.locator('#loginForm').waitFor();await b.login('admin');await page.waitForFunction(()=>document.querySelectorAll('.record').length===12);
 const count=f.sqlite.prepare('SELECT COUNT(*) AS n FROM cases').get().n;
 await b.action('newBtn');await page.waitForTimeout(150);
 const box=await page.locator('#editor').boundingBox();console.log(JSON.stringify({editorTop:box.y,viewportHeight:844,editable:!await page.locator('#nombre').isDisabled(),toast:await page.locator('#toast').textContent()}));
 assert.ok(box.y>=0&&box.y<300,'El formulario nuevo debe abrirse dentro de la vista móvil');
 assert.ok(!await page.locator('#toast').evaluate(el=>el.classList.contains('show')),'No debe mostrar validación al abrir');
 assert.equal(await page.locator('#nombre').inputValue(),'');assert.ok(!await page.locator('#nombre').isDisabled());assert.ok(!await page.locator('#assignedUserId').isDisabled());
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cases').get().n,count);
 await page.locator('#saveBtn').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('empresa'));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cases').get().n,count);
 await page.locator('#empresa').fill('Empresa nueva ficticia');await page.locator('#saveBtn').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('trabajador activo'));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cases').get().n,count);
 await page.locator('#nombre').fill('Nuevo ficticio');await page.locator('#assignedUserId').selectOption(f.users.b.id);await page.locator('#saveBtn').click();await page.waitForFunction(()=>window.currentCase?.version===0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM cases').get().n,count+1);
 assert.deepEqual(b.errors,[]);console.log('PASS trabajador → logout → administrador → formulario vacío visible y editable; solo Guardar valida empresa/asignación y crea el parte');
}finally{await b.close()}

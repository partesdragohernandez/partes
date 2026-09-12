import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import { fixture } from './auth-fixture.mjs';
import { canaryDay } from '../backend/http.js';
import { digest } from '../backend/auth.js';
function png(blank=false){
 const chunk=(type,data)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);return b};
 const header=Buffer.alloc(13);header.writeUInt32BE(16);header.writeUInt32BE(16,4);header[8]=8;header[9]=6;
 const pixels=Buffer.alloc(16*65);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const p=y*65+1+x*4;pixels[p]=pixels[p+1]=pixels[p+2]=blank?255:0;pixels[p+3]=255}
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
test('Autenticación, permisos, asignación y datos protegidos con SQLite real y proveedores simulados',async t=>{
 const f=await fixture();try{
 const base={id:'today-a',assignedUserId:f.users.a.id,visitDate:canaryDay(),company:'Empresa ficticia',status:'PENDIENTE',time:'09:30',name:'Asegurado ficticio',description:'Descripción inicial',photos:[]};
 const check=async(as,path,method,data,status,headers)=>{const r=await f.request(as,path,method,data,headers);assert.equal(r.status,status,await r.clone().text());return r.json()};
 await t.test('sin sesión, cabeceras falsas y CSRF',async()=>{
  await check(null,'/api/cases','GET',undefined,401,{'X-User-Id':f.users.admin.id});
  await check('admin','/api/cases','POST',base,403,{origin:'https://attacker.test'});
  await check(null,'/api/improve-text','POST',{text:'texto'},401);
 });
 await t.test('alta requiere administrador y trabajador activo; preserva datos iniciales',async()=>{
  await check('a','/api/cases','POST',base,403);
  await check('admin','/api/cases','POST',{...base,assignedUserId:null},400);
  await check('admin','/api/cases','POST',base,201);
  await check('admin','/api/cases','POST',{...base,id:'today-b',assignedUserId:f.users.b.id},201);
  await check('admin','/api/cases','POST',{...base,id:'past-a',visitDate:'2000-01-01'},201);
  await check('admin','/api/cases','POST',{...base,id:'future-a',visitDate:'2099-01-01'},201);
  f.sqlite.prepare("INSERT INTO cases(id,user_id,status,company,visit_date,created_at,updated_at) VALUES('legacy','demo-user','BORRADOR','Original','2000-01-01','2000-01-01','2000-01-01')").run();
 });
 await t.test('aislamiento de lectura, exportación y R2',async()=>{
  const admin=await check('admin','/api/cases','GET',undefined,200);assert.equal(admin.length,5);
  const a=await check('a','/api/cases','GET',undefined,200);assert.equal(a.length,3);assert.ok(a.every(c=>c.assigned_user_id===f.users.a.id));
  assert.equal((await check('b','/api/export','GET',undefined,200)).length,1);
  const calls=f.mediaCalls.length;
  await check('a','/api/cases/today-b','GET',undefined,404);await check('a','/api/cases/legacy','GET',undefined,404);
  await check('a','/api/cases','POST',{id:'today-b',version:0,photos:[{name:'bad',data:png()}]},404);
  assert.equal(f.mediaCalls.length,calls);
 });
 await t.test('campos iniciales, asignación, roles y fecha protegidos',async()=>{
  for(const key of ['name','surname','dni','phone','address','company','insurer','claimNo','time','description','visitDate','assignedUserId'])await check('a','/api/cases','POST',{id:'today-a',version:0,[key]:'manipulado'},403);
  await check('a','/api/admin/users','GET',undefined,403);
  await check('a','/api/admin/users','POST',{role:'admin'},403);
  await check('a','/api/cases','POST',{id:'today-a',version:0,role:'admin'},400);
  for(const id of ['past-a','future-a']){await check('a',`/api/cases/${id}`,'GET',undefined,200);await check('a','/api/cases','POST',{id,version:0,observations:'prohibido'},403)}
 });
 await t.test('completado exige nombre, DNI y firma no vacía; sigue editable hoy',async()=>{
  await check('a','/api/cases','POST',{id:'today-a',version:0,status:'COMPLETADO'},400);
  await check('a','/api/cases','POST',{id:'today-a',version:0,status:'COMPLETADO',signerName:'Firmante ficticio',signerDni:'TEST',signature:png(true)},400);
  await check('a','/api/cases','POST',{id:'today-a',version:0,status:'COMPLETADO',signerName:'Firmante ficticio',signerDni:'TEST',signature:png(),photos:[{name:'prueba.png',data:png()}]},200);
  const detail=await check('a','/api/cases/today-a','GET',undefined,200);assert.equal(detail.signer_name,'Firmante ficticio');assert.ok(detail.signature);assert.equal(detail.photos.length,1);
  await check('a','/api/cases','POST',{id:'today-a',version:1,observations:'Se amplía información'},200);
  await check('a','/api/cases','POST',{id:'today-a',version:2,signerName:''},400);
  await check('a','/api/cases','POST',{id:'today-a',version:2,status:'PENDIENTE'},200);
 });
 await t.test('optimismo y reasignación revocan permiso de guardar, también sobre fotos',async()=>{
  await check('a','/api/cases','POST',{id:'today-a',version:0,observations:'obsoleto'},409);
  await check('admin','/api/cases','POST',{id:'today-a',version:3,assignedUserId:f.users.b.id},200);
  const before=f.mediaCalls.length;await check('a','/api/cases/today-a','GET',undefined,404);assert.equal(f.mediaCalls.length,before);
  await check('a','/api/cases','POST',{id:'today-a',version:4,observations:'otro'},404);
  const own=await check('b','/api/cases/today-a','GET',undefined,200);assert.equal(own.photos.length,1);assert.ok(own.signature);
  await check('admin','/api/cases','POST',{id:'past-a',version:0,observations:'Administrador cualquier fecha'},200);
 });
 await t.test('Gemini requiere parte, edición y campo permitidos',async()=>{
  await check('a','/api/improve-text','POST',{caseId:'today-a',field:'observations',text:'umeda'},404);
  await check('a','/api/improve-text','POST',{caseId:'past-a',field:'observations',text:'umeda'},403);
  await check('b','/api/improve-text','POST',{caseId:'today-b',field:'description',text:'umeda'},403);
  assert.equal(f.geminiCalls,0);
  const result=await check('b','/api/improve-text','POST',{caseId:'today-b',field:'observations',text:'umeda'},200);assert.equal(result.text,'Hay humedad.');assert.equal(f.geminiCalls,1);
 });
 await t.test('gestión, desactivación y sesión HttpOnly de ocho horas',async()=>{
  await check('admin',`/api/admin/users/${f.users.a.id}/status`,'POST',{active:false},200);
  await check('a','/api/cases','GET',undefined,401);
  await check('admin','/api/cases','POST',{...base,id:'disabled'},400);
  await check('admin',`/api/admin/users/${f.users.a.id}/status`,'POST',{active:true},200);
  await check('a','/api/cases','GET',undefined,401);
  const response=await f.request(null,'/api/auth/login','POST',{username:'a',password:f.users.a.password});assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie');for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=28800'])assert.ok(cookie.includes(flag));
  const logged={cookie:cookie.split(';')[0]};await check(logged,'/api/cases','GET',undefined,200);
  await check(logged,'/api/auth/logout','POST',{},200);await check(logged,'/api/cases','GET',undefined,401);
 });
 await t.test('contraseña temporal bloquea datos, cambio y reset revocan sesiones',async()=>{
  const temporary=('Aa1!'+randomBytes(24).toString('base64url'));
  await check('admin',`/api/admin/users/${f.users.b.id}/password`,'POST',{password:temporary},200);
  await check('b','/api/cases','GET',undefined,401);
  const response=await f.request(null,'/api/auth/login','POST',{username:'b',password:temporary});assert.equal(response.status,200);
  const b={cookie:response.headers.get('set-cookie').split(';')[0]};await check(b,'/api/cases','GET',undefined,403);
  await check(b,'/api/auth/change-password','POST',{currentPassword:temporary,newPassword:('Aa1!'+randomBytes(24).toString('base64url'))},200);
  await check(b,'/api/cases','GET',undefined,401);
 });
 await t.test('bootstrap solo una vez, UTC/Canarias y objetos anteriores intactos',async()=>{
  assert.throws(()=>f.sqlite.prepare("INSERT INTO users(id,supabase_id,username,email,display_name,role,created_at,updated_at) VALUES('new','new','new','new','new','admin',0,0)").run());
  assert.equal(canaryDay(new Date('2026-07-01T23:30:00Z')),'2026-07-02');
  assert.equal(canaryDay(new Date('2026-01-01T23:30:00Z')),'2026-01-01');
  assert.ok(f.objects.size>=2);
  assert.equal(f.sqlite.prepare("SELECT user_id FROM cases WHERE id='legacy'").get().user_id,'demo-user');
 });
 }finally{f.close()}
});

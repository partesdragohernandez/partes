import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './auth-fixture.mjs';
import {passwordPolicy} from '../backend/auth.js';
test('trabajadores sin correo visible, seis caracteres, cambio obligatorio y administrador intacto',async()=>{
 const f=await fixture();try{
 const adminBefore=f.sqlite.prepare("SELECT * FROM users WHERE role='admin'").get();
 const send=async(as,path,method,data,status)=>{const r=await f.request(as,path,method,data);assert.equal(r.status,status);return r;};
 const data={username:'Operario',displayName:'Operario ficticio',password:'abcdef'};
 await send('admin','/api/admin/users','POST',{...data,password:'abcde'},400);
 await send('admin','/api/admin/users','POST',{...data,password:'x'.repeat(129)},400);
 await send('admin','/api/admin/users','POST',{...data,email:'otra@example.test'},400);
 await send('a','/api/admin/users','POST',data,403);
 await send('admin','/api/admin/users','POST',data,201);
 const user=f.sqlite.prepare("SELECT * FROM users WHERE username='operario'").get();assert.equal(user.email,'operario@users.partes.invalid');assert.equal(user.must_change_password,1);assert.equal(user.role,'worker');
 const listed=await(await send('admin','/api/admin/users','GET',undefined,200)).json();assert.ok(listed.every(u=>!Object.hasOwn(u,'email')));
 const login=await send(null,'/api/auth/login','POST',{username:'operario',password:data.password},200);const session={cookie:login.headers.get('set-cookie').split(';')[0]};
 assert.ok(!(await login.text()).includes('@users.partes.invalid'));
 await send(session,'/api/cases','GET',undefined,403);
 await send(session,'/api/auth/change-password','POST',{currentPassword:data.password,newPassword:'ghijkl'},200);
 await send(session,'/api/cases','GET',undefined,401);
 const access=await send(null,'/api/auth/login','POST',{username:'operario',password:'ghijkl'},200);const active={cookie:access.headers.get('set-cookie').split(';')[0]};await send(active,'/api/cases','GET',undefined,200);
 await send('admin',`/api/admin/users/${user.id}/password`,'POST',{password:'mnopqr'},200);await send(active,'/api/cases','GET',undefined,401);
 assert.equal(f.sqlite.prepare('SELECT must_change_password FROM users WHERE id=?').get(user.id).must_change_password,1);
 for(const value of ['abcdef','ABCDEF','123456','!!!!!!'])assert.doesNotThrow(()=>passwordPolicy(value));
 assert.throws(()=>passwordPolicy('abcdef','admin'));
 assert.deepEqual(f.sqlite.prepare("SELECT * FROM users WHERE role='admin'").get(),adminBefore);
 await send('admin','/api/admin/users','POST',{...data,username:'.raro..'},201);const special=f.sqlite.prepare("SELECT email FROM users WHERE username='.raro..'").get();assert.match(special.email,/^u-[a-f0-9]+@users\.partes\.invalid$/);
 }finally{f.close()}
});

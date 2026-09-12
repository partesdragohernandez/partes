// Private one-time provisioning through an authenticated Cloudflare CLI.
// No passwords, API keys or session tokens are requested, generated or stored.
import {createInterface} from 'node:readline/promises';
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
async function verifyWithSupabase(root,id,email){
 const temporary=path.join(root,'.wrangler','bootstrap-private');fs.mkdirSync(temporary,{recursive:true});
 const config=path.join(temporary,'wrangler.json');
 fs.writeFileSync(config,JSON.stringify({name:'partes',main:path.join(root,'scripts','bootstrap-verifier.js'),compatibility_date:'2026-09-09',workers_dev:false}));
 const listener=net.createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
 const child=spawn(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--remote','--config',config,'--port',String(port),'--ip','127.0.0.1'],{cwd:root,windowsHide:true,stdio:'ignore'});
 let failed=false;child.on('error',()=>{failed=true});
 try{
  console.log('Verificando UUID y correo en Supabase mediante una previsualización privada de Cloudflare...');
  for(let i=0;i<60;i++){
   if(failed||child.exitCode!==null)break;
   let response;try{response=await fetch(`http://127.0.0.1:${port}/verify-identity`,{method:'POST',headers:{'content-type':'application/json','x-requested-with':'partes-bootstrap'},body:JSON.stringify({id,email}),signal:AbortSignal.timeout(2000)})}catch{}
   if(response){if(!response.ok||!(await response.json()).verified)throw new Error('UUID/correo no verificado o cuenta sin confirmar en Supabase. D1 no se ha modificado.');return;}
   await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new Error('No se pudo verificar Supabase. Comprueba la sesión de Wrangler y los Runtime Secrets. D1 no se ha modificado.');
 }finally{child.kill();}
}
export function bootstrapSQL({username,email,displayName,supabaseId}){
 if(!/^[a-z0-9._-]{3,80}$/.test(username)||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!displayName.trim()||displayName.length>200||!/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(supabaseId))throw new Error('Revisa usuario, correo, nombre y UUID de Supabase.');
 const quote=v=>"'"+v.replaceAll("'","''")+"'",t=Math.floor(Date.now()/1000);
 return `INSERT INTO users(id,supabase_id,username,email,display_name,role,active,must_change_password,created_at,updated_at) SELECT ${[randomUUID(),supabaseId,username,email,displayName.trim()].map(quote).join(',')},'admin',1,0,${t},${t} WHERE NOT EXISTS(SELECT 1 FROM bootstrap_state) AND NOT EXISTS(SELECT 1 FROM users WHERE role='admin');`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const prompt=createInterface({input:process.stdin,output:process.stdout});
 try{
  console.log('Crea primero tu cuenta en Supabase Auth con tu contraseña privada y correo confirmado. Este programa solo vincula su UUID a D1. Nunca introduzcas una contraseña aquí.');
  const username=(await prompt.question('Usuario de acceso (3–80 letras, números, punto, guion): ')).trim().toLowerCase();
  const email=(await prompt.question('Correo exacto de esa cuenta de Supabase: ')).trim().toLowerCase();
  const displayName=(await prompt.question('Nombre visible: ')).trim();
  const supabaseId=(await prompt.question('User UID copiado de Supabase Auth: ')).trim();
  const sql=bootstrapSQL({username,email,displayName,supabaseId});
  if((await prompt.question('¿Vincular esta cuenta como único primer administrador? Escribe CREAR: ')).trim()!=='CREAR')process.exitCode=1;
  else{
   const root=fileURLToPath(new URL('../',import.meta.url));
   await verifyWithSupabase(root,supabaseId,email);
   const result=spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'d1','execute','partes-db','--remote','--command',sql,'--json'],{cwd:root,encoding:'utf8',windowsHide:true});
   if(result.status!==0)throw new Error('No se pudo vincular la cuenta. Comprueba el acceso de Wrangler y si ya existe un administrador. No se ha cambiado ninguna contraseña.');
   let output;try{output=JSON.parse(result.stdout)}catch{throw new Error('No se pudo confirmar el resultado. Comprueba el usuario en D1 antes de repetir.');}
   if(!output.some(r=>r.meta?.changes>=1))throw new Error('La creación inicial ya se completó; no se ha creado otro administrador.');
   console.log('Primer administrador vinculado. Inicia sesión en la aplicación con el usuario elegido y tu contraseña de Supabase.');
  }
 }catch(e){console.error(e.message);process.exitCode=1}finally{prompt.close()}
}

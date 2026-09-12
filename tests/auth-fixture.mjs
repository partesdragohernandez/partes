import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { digest, now } from '../backend/auth.js';
import worker from '../worker.js';
export async function fixture() {
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url),'utf8'));
  sqlite.exec("ALTER TABLE cases ADD COLUMN visit_date TEXT; ALTER TABLE cases ADD COLUMN company TEXT DEFAULT '';");
  sqlite.exec(fs.readFileSync(new URL('../migrations/0001_auth_assignment.sql',import.meta.url),'utf8'));
  function prepare(sql, args = []) {
    return { sql, args, bind(...values) { return prepare(sql,values); },
      async first() { return sqlite.prepare(sql).get(...args) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...args) }; },
      async run() { const result=sqlite.prepare(sql).run(...args); return {meta:{changes:Number(result.changes)}}; }
    };
  }
  const objects=new Map(), mediaCalls=[];
  const env={DB:{prepare,async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}},
    PHOTOS:{async get(key){mediaCalls.push(['get',key]);const o=objects.get(key);return o?{httpMetadata:o.httpMetadata,arrayBuffer:async()=>o.bytes.slice().buffer}:null},async put(key,bytes,options){mediaCalls.push(['put',key]);objects.set(key,{bytes:new Uint8Array(bytes),...options})}},
    SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+randomBytes(12).toString('hex'),SUPABASE_SECRET_KEY:'sb_secret_'+randomBytes(24).toString('hex'),GEMINI_API_KEY:randomBytes(24).toString('hex')};
  const accounts=new Map(),tokens=new Map();let geminiCalls=0;
  const realFetch=globalThis.fetch;
  globalThis.fetch=async(url,options={})=>{
    if(String(url).startsWith('https://generativelanguage.googleapis.com/')){geminiCalls++;const data=JSON.parse(options.body);if(data.contents.length!==1||Object.keys(data.contents[0].parts[0]).join()!=='text')throw Error('Unexpected Gemini payload');return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Hay humedad.'}]}}]})}
    if(!String(url).startsWith(env.SUPABASE_URL))return realFetch(url,options);
    const path=new URL(url).pathname, data=options.body?JSON.parse(options.body):{};
    if(path.endsWith('/token')){const account=[...accounts.values()].find(a=>a.email===data.email&&a.password===data.password);if(!account)return Response.json({}, {status:400});const token=randomBytes(24).toString('hex');tokens.set(token,account.id);return Response.json({access_token:token,user:{id:account.id}})}
    if(path.endsWith('/user')){const id=tokens.get(options.headers.authorization?.slice(7));return id?Response.json({id}):Response.json({},{status:401})}
    if(path.endsWith('/logout'))return new Response(null,{status:204});
    if(options.headers.apikey!==env.SUPABASE_SECRET_KEY)return Response.json({},{status:403});
    if(path.endsWith('/admin/users')){const id=crypto.randomUUID();accounts.set(id,{id,...data});return Response.json({id})}
    const id=path.split('/').pop();if(accounts.has(id)){Object.assign(accounts.get(id),data);return Response.json({id})}
    return Response.json({},{status:404});
  };
  const users={};
  for(const roleName of ['admin','a','b']) {
    const id=crypto.randomUUID(),supaId=crypto.randomUUID(),email=`${roleName}@example.test`,password=randomBytes(24).toString('base64url');
    accounts.set(supaId,{id:supaId,email,password});
    sqlite.prepare('INSERT INTO users(id,supabase_id,username,email,display_name,role,active,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,1,0,?,?)').run(id,supaId,roleName,email,roleName,roleName==='admin'?'admin':'worker',now(),now());
    const token=randomBytes(32).toString('hex');
    sqlite.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(await digest(token),id,0,now(),now()+28800);
    users[roleName]={id,supaId,email,password,username:roleName,cookie:`__Host-session=${token}`};
  }
  async function request(as,path,method='GET',data,headers={}) {
    return worker.fetch(new Request('https://partes.test'+path,{method,headers:{origin:'https://partes.test','content-type':'application/json','x-requested-with':'partes',...(as?{cookie:typeof as==='string'?users[as].cookie:as.cookie}:{}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})}),env);
  }
  return {env,sqlite,users,request,objects,mediaCalls,accounts,get geminiCalls(){return geminiCalls},close(){globalThis.fetch=realFetch;sqlite.close()}};
}

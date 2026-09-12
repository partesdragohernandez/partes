import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {bootstrapSQL} from '../scripts/bootstrap-admin.mjs';
test('bootstrap privado, SQL escapado y segundo intento sin efecto',()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec(fs.readFileSync('schema.sql','utf8'));db.exec("ALTER TABLE cases ADD COLUMN visit_date TEXT; ALTER TABLE cases ADD COLUMN company TEXT;");db.exec(fs.readFileSync('migrations/0001_auth_assignment.sql','utf8'));
 const data={username:'admin.test',email:'ficticio@example.test',displayName:"Nombre ' ficticio",supabaseId:crypto.randomUUID()};
 db.exec(bootstrapSQL(data));assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,1);assert.equal(db.prepare('SELECT count(*) AS n FROM bootstrap_state').get().n,1);
 db.exec(bootstrapSQL({...data,username:'other',supabaseId:crypto.randomUUID()}));assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,1);
 assert.throws(()=>bootstrapSQL({...data,supabaseId:'no UUID'}));assert.equal(db.prepare('SELECT display_name FROM users').get().display_name,data.displayName);
 }finally{db.close()}
});

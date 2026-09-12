// Never prints database contents. Backups must stay outside Git/public assets.
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
const [file,compare]=process.argv.slice(2);
if(!file)throw new Error('Uso: node scripts/verify-backup.mjs backup.sql [backup-posterior.sql]');
const hash=v=>createHash('sha256').update(v).digest('hex');
function restore(file){const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=OFF');db.exec(fs.readFileSync(file,'utf8'));db.exec('PRAGMA foreign_keys=ON');if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Backup no íntegro');return db;}
const before=restore(file), after=compare?restore(compare):null;
const report={file,sha256:hash(fs.readFileSync(file)),integrity:'ok',tables:{}};
for(const table of ['cases','case_photos']){
 const columns=before.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
 const query=`SELECT ${columns.map(c=>'"'+c+'"').join(',')} FROM ${table} ORDER BY id`;
 const rows=before.prepare(query).all(),digest=hash(JSON.stringify(rows));
 report.tables[table]={rows:rows.length,columns,sha256:digest};
 if(after&&hash(JSON.stringify(after.prepare(query).all()))!==digest)throw new Error('Los datos originales difieren: '+table);
}
if(!compare){
 before.exec(fs.readFileSync(new URL('../migrations/0001_auth_assignment.sql',import.meta.url),'utf8'));
 if(before.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Referencias inválidas tras migración');
 report.migrationRestoreTest='ok';
}else report.originalDataUnchanged=true;
fs.writeFileSync(file+(compare?'.comparison.json':'.manifest.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,tables:Object.fromEntries(Object.entries(report.tables).map(([k,v])=>[k,{rows:v.rows,sha256:v.sha256}]))},null,2));
before.close();after?.close();

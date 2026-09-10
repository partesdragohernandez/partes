import './styles.css';

const jszipScript = document.createElement('script');
jszipScript.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
jszipScript.async = true;
document.head.appendChild(jszipScript);
const uiStyle=document.createElement("style");uiStyle.textContent=`.history-panel{display:grid;gap:8px;margin:8px 0}.history-panel label{font-size:12px;font-weight:700}.history-btn{width:100%;margin:8px 0}.readonly-note{margin-top:6px;padding:8px 10px;border-radius:8px;background:#f3f4f6;color:#374151;font-size:12px}.hidden{display:none!important}.photo img{cursor:zoom-in}`;document.head.appendChild(uiStyle);

document.body.innerHTML = `
<header class="topbar">
<div class="brand"><div class="logo">GS</div><div><strong>Gestion de Siniestros</strong><span>Partes, fotos y firmas</span></div></div>
<div class="top-actions">
<button class="btn primary" id="newBtn">+ Nuevo siniestro</button>
<button class="btn ghost" id="roleBtn">Modo trabajador</button>
<button class="btn ghost" id="exportBackupBtn">Exportar copia</button>
<label class="btn ghost file-btn">Importar copia<input accept=".json" id="importBackup" type="file"/></label>
</div>
</header>
<main class="layout">
<aside class="sidebar">
<div class="side-title"><span id="listTitle">PARTES DE HOY</span><span id="count">0</span></div>
<div class="today-search"><input id="search" placeholder="Buscar en los partes de hoy..."/></div>
<button class="btn ghost history-btn" id="historyBtn" type="button">Buscar Buscar parte anterior</button>
<div id="historyPanel" class="history-panel hidden">
<label>Fecha del parte<input id="historyDate" type="date"/></label>
<input id="historyText" placeholder="Direccion, nombre o no de parte..."/>
<button class="btn secondary" id="historySearchBtn" type="button">Buscar</button>
<button class="btn ghost" id="todayBtn" type="button"><- Volver a partes de hoy</button>
</div>
<div class="records" id="recordsList"></div>
<div class="storage-note">Los datos se guardan en la nube.</div>
</aside>
<section class="content">
<div class="empty" id="empty"><div class="empty-icon"></div><h1>Gestion de partes de siniestro</h1><p>Crea un parte, anade los datos, las fotografias y la firma.</p><button class="btn primary" id="emptyNew">Crear primer siniestro</button></div>
<div class="editor hidden" id="editor">
<div class="editor-head"><div><div class="eyebrow" id="statusLabel">BORRADOR</div><h1 id="editorTitle">Nuevo siniestro</h1><div class="meta" id="editorMeta"></div><div class="readonly-note hidden" id="readonlyNote"> Consulta: este parte es de un dia anterior y esta en solo lectura.</div></div><div class="head-actions"><button class="btn primary" id="saveBtn">Guardar</button></div></div>
<form id="caseForm">
<section class="card">
<div class="section-title"><span class="num">1</span><div><h2>Datos del Asegurado</h2><p>Informacion principal del parte.</p></div></div>
<div class="grid">
<label>Nombre<input id="nombre" placeholder="Nombre"/></label>
<label>Apellido<input id="apellido" placeholder="Apellido"/></label>
<label>DNI / NIF<input id="dni" placeholder="DNI / NIF"/></label>
<label>Telefono<input id="telefono" placeholder="Telefono" type="tel"/></label>
<label class="wide">Direccion<input id="direccion" placeholder="Direccion del siniestro"/></label>
<label>Compania Aseguradora<input id="aseguradora" placeholder="Compania"/></label>
<label>No de Parte<input id="numParte" placeholder="No de parte"/></label>
<label>Hora<input id="hora" type="time"/></label>
<label class="wide">Descripcion / Que Hacer<textarea id="descripcionQueHacer" placeholder="Describe el siniestro y que hay que hacer..." rows="4"></textarea></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">2</span><div><h2>Comentarios y Fotos</h2><p>Observaciones generales y fotografias de los danos.</p></div></div>
<label>Observaciones<textarea id="observaciones" placeholder="Escribe aqui cualquier detalle relevante..." rows="5"></textarea></label>
<div class="upload-zone" id="dropZone"><div class="upload-icon"></div><h3>Fotos de los Danos</h3><p>Selecciona todas las fotos necesarias de una sola vez o arrastralas aqui.</p><label class="btn secondary">Anadir fotos<input accept="image/*" id="photos" multiple="" type="file"/></label><small id="photoCount">0 fotografias</small></div>
<div class="photo-grid" id="photoGrid"></div>
</section>
<section class="card">
<div class="section-title"><span class="num">3</span><div><h2>Evaluacion de Danos</h2><p>Indica donde estan los danos y los trabajos necesarios.</p></div></div>
<div class="grid">
<label class="wide">Hay Danos?<select id="hayDanios"><option value="">Seleccionar...</option><option>Si</option><option>No</option></select></label>
<label class="wide">Donde estan los danos?<input id="dondeDanios" placeholder="Indica la zona, estancia o ubicacion"/></label>
<label>Gremios Solicitar<input id="gremiosSolicitar" placeholder="Albanileria, pintura, fontaneria..."/></label>
<label>m2 correspondientes<input id="metros" min="0" placeholder="0" step="0.01" type="number"/></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">4</span><div><h2>Datos del Perjudicado</h2><p>Informacion de la vivienda o persona perjudicada.</p></div></div>
<div class="grid">
<label>Telefono Perjudicado<input id="telefonoPerjudicado" placeholder="Telefono" type="tel"/></label>
<label>No Vivienda<input id="numeroVivienda" placeholder="No de vivienda"/></label>
<label class="wide">Danos Perjudicado<textarea id="daniosPerjudicado" placeholder="Describe los danos ocasionados al perjudicado..." rows="4"></textarea></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">5</span><div><h2>Conformidad y Firma</h2><p>Identificacion del firmante y firma manuscrita.</p></div></div>
<label>DNI Firmante<input id="dniFirmante" placeholder="DNI / NIF del firmante"/></label>
<div class="signature-wrap"><div class="signature-label">Firma Manuscrita (Dibuja aqui)</div><canvas height="260" id="signature" width="900"></canvas><div class="signature-actions"><button class="btn ghost" id="clearSignature" type="button">Borrar firma</button><span id="signatureState">Sin firma</span></div></div>
</section>
<section class="card final-card"><div><h2>Finalizar parte</h2><p>Cuando este completo, marcalo como terminado para revisarlo.</p></div><button class="btn success" id="finishBtn" type="button">[OK] Marcar como completado</button></section>
</form>
<div class="bottom-actions"><button class="btn secondary" id="downloadPhotosBtn">Descargar fotografias</button><button class="btn secondary" id="printBtn">Imprimir / Guardar PDF</button><button class="btn danger" id="deleteBtn">Eliminar siniestro</button></div>
</div>
</section></main>
<div class="toast" id="toast"></div>


`;


const DB_NAME="gestion_siniestros_db",STORE="cases";let db,currentId=null,photos=[],signatureData="";let appMode="worker",listMode="today";
const $=id=>document.getElementById(id);
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function nowDate(){return new Date().toISOString().slice(0,10)} function nowTime(){return new Date().toTimeString().slice(0,5)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function openDB(){return Promise.resolve()}
function fromApi(r){return {id:r.id||uid(),nombre:r.name||"",apellido:r.surname||"",dni:r.dni||"",telefono:r.phone||"",direccion:r.address||"",aseguradora:r.insurer||"",numParte:r.claim_no||"",hora:r.time||"",descripcionQueHacer:r.description||"",observaciones:r.observations||"",hayDanios:r.has_damage||"",dondeDanios:r.damage_where||"",gremiosSolicitar:r.trades||"",metros:r.sqm||"",telefonoPerjudicado:r.injured_phone||"",numeroVivienda:r.housing_no||"",daniosPerjudicado:r.injured_damage||"",dniFirmante:r.signer_dni||"",status:r.status||"BORRADOR",createdAt:r.created_at?new Date(r.created_at).getTime():Date.now(),updatedAt:r.updated_at?new Date(r.updated_at).getTime():Date.now(),fecha:r.created_at?String(r.created_at).slice(0,10):nowDate(),photos:r.photos||[],signature:r.signature||""}}
async function allCases(){const r=await fetch('/api/cases');if(!r.ok)throw new Error('No se pudieron cargar los siniestros');return (await r.json()).map(fromApi)}
async function getCase(id){const r=await fetch('/api/cases/'+encodeURIComponent(id));if(!r.ok)throw new Error('No se pudo abrir el siniestro');return fromApi(await r.json())}
async function putCase(c){const payload={id:c.id,name:c.nombre,surname:c.apellido,dni:c.dni,phone:c.telefono,address:c.direccion,insurer:c.aseguradora,claimNo:c.numParte,time:c.hora,description:c.descripcionQueHacer,observations:c.observaciones,hasDamage:c.hayDanios,damageWhere:c.dondeDanios,trades:c.gremiosSolicitar,sqm:c.metros,injuredPhone:c.telefonoPerjudicado,housingNo:c.numeroVivienda,injuredDamage:c.daniosPerjudicado,signerDni:c.dniFirmante,status:c.status,photos:c.photos||[],signature:c.signature||""};const r=await fetch('/api/cases',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error((await r.text())||'No se pudo guardar');return c}
async function delCase(id){const r=await fetch('/api/cases/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw new Error('No se pudo eliminar')}
function blankCase(){return{id:uid(),createdAt:Date.now(),updatedAt:Date.now(),status:"BORRADOR",fecha:nowDate(),hora:nowTime(),nombre:"",apellido:"",dni:"",telefono:"",direccion:"",aseguradora:"",numParte:"",descripcionQueHacer:"",observaciones:"",photos:[],hayDanios:"",dondeDanios:"",gremiosSolicitar:"",metros:"",telefonoPerjudicado:"",numeroVivienda:"",daniosPerjudicado:"",dniFirmante:"",signature:""}}
const fields=["hora","nombre","apellido","dni","telefono","direccion","aseguradora","numParte","descripcionQueHacer","observaciones","hayDanios","dondeDanios","gremiosSolicitar","metros","telefonoPerjudicado","numeroVivienda","daniosPerjudicado","dniFirmante"];
function collect(){let c={...(window.currentCase||blankCase())};fields.forEach(k=>c[k]=$(k).value);c.photos=photos;c.signature=signatureData;c.updatedAt=Date.now();return c}
function fill(c){window.currentCase=c;fields.forEach(k=>$(k).value=c[k]||"");photos=c.photos||[];signatureData=c.signature||"";$("statusLabel").textContent=c.status;$("editorTitle").textContent=c.direccion||"Nuevo siniestro";$("editorMeta").textContent=`Creado ${new Date(c.createdAt).toLocaleString("es-ES")} - Ultima modificacion ${new Date(c.updatedAt).toLocaleString("es-ES")}`;renderPhotos();renderSignature();setReadOnly();renderList()}
function showEditor(c){currentId=c.id;$("empty").classList.add("hidden");$("editor").classList.remove("hidden");fill(c)}
function renderList(){allCases().then(cs=>{let q=appMode==="admin"?$("search").value.toLowerCase():$("search").value.toLowerCase();let f;if(appMode==="admin"){f=cs}else if(listMode==="today"){f=cs.filter(c=>c.fecha===nowDate())}else{let d=$("historyDate").value,t=$("historyText").value.toLowerCase();f=cs.filter(c=>c.fecha!==nowDate() && (!d||c.fecha===d) && (!t||(c.direccion+" "+c.nombre+" "+c.apellido+" "+c.numParte+" "+c.aseguradora).toLowerCase().includes(t)))}if(q && appMode==="admin")f=f.filter(c=>(c.direccion+" "+c.nombre+" "+c.apellido+" "+c.numParte+" "+c.aseguradora).toLowerCase().includes(q));$("count").textContent=f.length;$("listTitle").textContent=appMode==="admin"?"TODOS LOS PARTES":(listMode==="today"?"PARTES DE HOY":"PARTES ANTERIORES");$("recordsList").innerHTML=f.map(c=>`<div class="record ${c.id===currentId?"active":""}" data-id="${c.id}"><strong>${esc(c.direccion||"Sin direccion")}</strong><small>${esc(c.fecha||"")} ${esc(c.hora||"")} - ${esc((c.nombre+" "+c.apellido).trim()||"Sin asegurado")}</small><div class="status">${esc(c.status)}${appMode==="worker"&&c.fecha===nowDate()?" - EDITABLE HOY":""}</div></div>`).join("");document.querySelectorAll(".record").forEach(e=>e.onclick=()=>getCase(e.dataset.id).then(showEditor))})}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
async function save(show=true){let c=collect();await putCase(c);window.currentCase=c;currentId=c.id;fill(c);if(show)toast("Siniestro guardado")}
function renderPhotos(){$("photoCount").textContent=`${photos.length} fotografia${photos.length===1?"":"s"}`;$("photoGrid").innerHTML=photos.map((p,i)=>`<div class="photo"><img src="${p.data}" alt="Foto ${i+1}" data-photo-view="${i}">${isReadOnly()?"" : `<button type="button" data-photo="${i}">x</button>`}</div>`).join("");document.querySelectorAll("[data-photo]").forEach(b=>b.onclick=()=>{photos.splice(+b.dataset.photo,1);renderPhotos()});document.querySelectorAll("[data-photo-view]").forEach(img=>img.onclick=()=>{let i=+img.dataset.photoView;let w=window.open("","_blank");w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh"><img src="${photos[i].data}" style="max-width:98%;max-height:98%;object-fit:contain"></body></html>`);w.document.close()})}
function isReadOnly(){return appMode==="worker" && window.currentCase && window.currentCase.fecha!==nowDate()}
function setReadOnly(){let ro=isReadOnly();$("readonlyNote").classList.toggle("hidden",!ro);$("saveBtn").classList.toggle("hidden",ro);$("finishBtn").classList.toggle("hidden",ro);$("deleteBtn").classList.toggle("hidden",ro);$("downloadPhotosBtn").classList.remove("hidden");$("printBtn").classList.remove("hidden");document.querySelectorAll("#caseForm input,#caseForm textarea,#caseForm select").forEach(el=>{el.disabled=ro});$("dropZone").classList.toggle("hidden",ro);$("clearSignature").classList.toggle("hidden",ro);$("signature").style.pointerEvents=ro?"none":"auto"}
async function addFiles(files){const list=[...(files||[])];if(!list.length)return;let n=0;for(const f of list){if(!f.type.startsWith("image/"))continue;try{let data=await new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("No se pudo leer la foto"));r.readAsDataURL(f)});photos.push({name:f.name,type:f.type,data,addedAt:Date.now()});n++}catch(e){console.error(e)}}renderPhotos();$("photos").value="";if(n)toast(`${n} fotografia${n===1?"":"s"} anadida${n===1?"":"s"}`);else toast("No se pudo anadir la fotografia")}
$("photos").onchange=e=>{addFiles(e.target.files)};$("dropZone").ondragover=e=>{e.preventDefault()};$("dropZone").ondrop=e=>{e.preventDefault();addFiles(e.dataTransfer.files)};
const canvas=$("signature"),ctx=canvas.getContext("2d");let drawing=false;
function resizeCanvas(){let r=devicePixelRatio||1,rect=canvas.getBoundingClientRect(),old=signatureData;canvas.width=rect.width*r;canvas.height=260*r;ctx.scale(r,r);ctx.lineWidth=2;ctx.lineCap="round";ctx.strokeStyle="#111827";if(old){let img=new Image();img.onload=()=>ctx.drawImage(img,0,0,rect.width,260);img.src=old}}
function point(e){let r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}function start(e){e.preventDefault();drawing=true;let p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y)}function move(e){if(!drawing)return;e.preventDefault();let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()}function end(){if(drawing){drawing=false;signatureData=canvas.toDataURL("image/png");$("signatureState").textContent="Firma capturada"}}
canvas.onpointerdown=start;canvas.onpointermove=move;window.onpointerup=end;
function renderSignature(){resizeCanvas();$("signatureState").textContent=signatureData?"Firma capturada":"Sin firma"}
$("clearSignature").onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);signatureData="";$("signatureState").textContent="Sin firma"}
window.onresize=()=>{if(!$("editor").classList.contains("hidden"))renderSignature()};
$("newBtn").onclick=$("emptyNew").onclick=async()=>{if(appMode!=="admin"){toast("Los partes los prepara administracion");return}let c=blankCase();await putCase(c);showEditor(c);toast("Nuevo siniestro creado")};
$("roleBtn").onclick=()=>{appMode=appMode==="worker"?"admin":"worker";listMode="today";if(window.currentCase){fill(window.currentCase);}$("roleBtn").textContent=appMode==="worker"?"Modo trabajador":"Modo administracion";$("newBtn").classList.toggle("hidden",appMode!=="admin");$("historyBtn").classList.toggle("hidden",appMode==="admin");$("historyPanel").classList.add("hidden");renderList();toast(appMode==="worker"?"Modo trabajador":"Modo administracion")};
$("historyBtn").onclick=()=>{$("historyPanel").classList.toggle("hidden");if(!$("historyPanel").classList.contains("hidden")){listMode="history";renderList()}};
$("historySearchBtn").onclick=()=>{listMode="history";renderList()};
$("todayBtn").onclick=()=>{listMode="today";$("historyPanel").classList.add("hidden");renderList()};
$("historyDate").onchange=()=>{listMode="history";renderList()};
$("historyText").oninput=()=>{listMode="history";renderList()};
$("saveBtn").onclick=()=>save();
$("finishBtn").onclick=async()=>{let c=collect();c.status="COMPLETADO";await putCase(c);showEditor(c);toast("Parte marcado como completado")};
$("deleteBtn").onclick=async()=>{if(currentId&&confirm("Eliminar este siniestro y sus fotografias?")){await delCase(currentId);currentId=null;$("editor").classList.add("hidden");$("empty").classList.remove("hidden");renderList();toast("Siniestro eliminado")}};
$("search").oninput=renderList;
function safe(s=""){return s.replace(/[^\w\daeiouunAEIOUUN-]+/g,"-").replace(/^-|-$/g,"")||"sin-datos"}
function downloadBlob(b,n){let a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("downloadPhotosBtn").onclick=async()=>{await save(false);let c=window.currentCase;if(!c.photos.length)return toast("No hay fotografias");if(typeof JSZip==="undefined"){c.photos.forEach((p,i)=>{let a=document.createElement("a");a.href=p.data;a.download=p.name||`foto-${i+1}.jpg`;a.click()});return}let z=new JSZip();c.photos.forEach((p,i)=>z.file(p.name||`foto-${i+1}.jpg`,p.data.split(",")[1],{base64:true}));let b=await z.generateAsync({type:"blob"});downloadBlob(b,`${safe(c.fecha)}_${safe(c.hora)}_${safe(c.direccion)}_fotos.zip`);toast("ZIP de fotografias preparado")};
$("printBtn").onclick=async()=>{await save(false);let c=window.currentCase,ph=c.photos.map((p,i)=>`<img src="${p.data}" style="width:220px;height:165px;object-fit:cover;margin:5px;border:1px solid #ddd">`).join(""),sig=c.signature?`<img src="${c.signature}" style="max-width:420px;max-height:130px">`:"Sin firma";let item=(l,v)=>`<div class="item"><div class="label">${l}</div>${esc(v||"-")}</div>`;let w=open("","_blank");w.document.write(`<html><head><title>Parte ${esc(c.direccion)}</title><style>body{font-family:Arial;padding:35px;color:#111}h1{font-size:25px}h2{font-size:17px;border-bottom:1px solid #ddd;padding-bottom:6px;margin-top:25px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item{padding:8px;border:1px solid #ddd}.label{font-size:10px;color:#666;text-transform:uppercase}.photos{display:flex;flex-wrap:wrap}</style></head><body><h1>Parte de siniestro</h1><p>${esc(c.fecha)} ${esc(c.hora)} - ${esc(c.direccion)}</p><h2>1. Datos del Asegurado</h2><div class="row">${item("Nombre",c.nombre)}${item("Apellido",c.apellido)}${item("DNI/NIF",c.dni)}${item("Telefono",c.telefono)}${item("Direccion",c.direccion)}${item("Compania",c.aseguradora)}${item("No de parte",c.numParte)}${item("Hora",c.hora)}</div><p><b>Descripcion / Que Hacer:</b> ${esc(c.descripcionQueHacer)}</p><h2>2. Comentarios y Fotos</h2><p>${esc(c.observaciones)}</p><div class="photos">${ph}</div><h2>3. Evaluacion de Danos</h2><div class="row">${item("Hay danos?",c.hayDanios)}${item("Donde estan",c.dondeDanios)}${item("Gremios solicitar",c.gremiosSolicitar)}${item("m2 correspondientes",c.metros)}</div><h2>4. Datos del Perjudicado</h2><div class="row">${item("Telefono perjudicado",c.telefonoPerjudicado)}${item("No vivienda",c.numeroVivienda)}</div><p><b>Danos perjudicado:</b> ${esc(c.daniosPerjudicado)}</p><h2>5. Conformidad y Firma</h2>${item("DNI firmante",c.dniFirmante)}<p>${sig}</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()};
$("exportBackupBtn").onclick=async()=>{let cs=await allCases();downloadBlob(new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),cases:cs})],{type:"application/json"}),`backup_siniestros_${nowDate()}.json`);toast("Copia de seguridad exportada")};
$("importBackup").onchange=async e=>{try{let d=JSON.parse(await e.target.files[0].text());for(let c of d.cases||[])await putCase(c);renderList();toast("Copia importada")}catch{alert("No se pudo importar la copia")}};
(async()=>{await openDB();renderList();let cs=await allCases();if(cs[0])showEditor(cs[0])})();

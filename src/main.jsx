import './styles.css';

const jszipScript = document.createElement('script');
jszipScript.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
jszipScript.async = true;
document.head.appendChild(jszipScript);

document.body.innerHTML = `
<header class="topbar">
<div class="brand"><div class="logo">GS</div><div><strong>Gestión de Siniestros</strong><span>Partes, fotos y firmas</span></div></div>
<div class="top-actions">
<button class="btn primary" id="newBtn">+ Preparar parte</button>
<button class="btn ghost" id="exportBackupBtn">Exportar copia</button><button class="btn ghost" id="modeBtn">👷 Modo trabajador</button>
<label class="btn ghost file-btn">Importar copia<input accept=".json" id="importBackup" type="file"/></label>
</div>
</header>
<main class="layout">
<aside class="sidebar">
<div class="today-title"><h2 id="listTitle">PARTES DE HOY</h2><div class="mode-note" id="modeNote">Pendientes y completados de hoy</div></div><div class="search"><input id="search" placeholder="Buscar por dirección, asegurado, nº parte..."/></div><div class="side-title"><span>Pendientes</span><span id="count">0</span></div><div class="records" id="recordsList"></div><div class="side-title"><span>Completados</span></div><div class="records" id="completedList"></div><button class="btn ghost full" id="previousBtn">🔎 Buscar parte anterior</button>
<div class="storage-note">Los datos se guardan en este dispositivo. Haz una copia de seguridad periódicamente.</div>
</aside>
<section class="content"><div class="previous-panel hidden" id="previousPanel"><div class="previous-head"><h2>Buscar partes anteriores</h2><button class="btn ghost" id="closePrevious">Cerrar</button></div><div class="grid previous-filters"><label>Fecha<input id="previousDate" type="date"></label><label>Buscar<input id="previousQuery" placeholder="Dirección, cliente o nº de parte"></label></div><div class="records previous-results" id="previousResults"></div></div>
<div class="empty" id="empty"><div class="empty-icon">📋</div><h1>Gestión de partes de siniestro</h1><p>Crea un parte, añade los datos, las fotografías y la firma.</p><button class="btn primary" id="emptyNew">Crear primer siniestro</button></div>
<div class="editor hidden" id="editor">
<div class="editor-head"><div><div class="eyebrow" id="statusLabel">BORRADOR</div><h1 id="editorTitle">Nuevo siniestro</h1><div class="meta" id="editorMeta"></div></div><div class="head-actions"><button class="btn primary" id="saveBtn">Guardar</button></div></div><div class="readonly-banner hidden" id="readonlyBanner">👁️ Parte anterior — solo lectura. Puedes consultar datos, fotos y firma.</div>
<form id="caseForm">
<section class="card">
<div class="section-title"><span class="num">1</span><div><h2>Datos del Asegurado</h2><p>Información principal del parte.</p></div></div>
<div class="grid">
<label>Nombre<input id="nombre" placeholder="Nombre"/></label>
<label>Apellido<input id="apellido" placeholder="Apellido"/></label>
<label>DNI / NIF<input id="dni" placeholder="DNI / NIF"/></label>
<label>Teléfono<input id="telefono" placeholder="Teléfono" type="tel"/></label>
<label class="wide">Dirección<input id="direccion" placeholder="Dirección del siniestro"/></label>
<label>Compañía Aseguradora<input id="aseguradora" placeholder="Compañía"/></label>
<label>Nº de Parte<input id="numParte" placeholder="Nº de parte"/></label>
<label>Hora<input id="hora" type="time"/></label>
<label class="wide">Descripción / Qué Hacer<textarea id="descripcionQueHacer" placeholder="Describe el siniestro y qué hay que hacer..." rows="4"></textarea></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">2</span><div><h2>Comentarios y Fotos</h2><p>Observaciones generales y fotografías de los daños.</p></div></div>
<label>Observaciones<textarea id="observaciones" placeholder="Escribe aquí cualquier detalle relevante..." rows="5"></textarea></label>
<div class="upload-zone" id="dropZone"><div class="upload-icon">📷</div><h3>Fotos de los Daños</h3><p>Selecciona todas las fotos necesarias de una sola vez o arrástralas aquí.</p><label class="btn secondary">Añadir fotos<input accept="image/*" id="photos" multiple="" type="file"/></label><small id="photoCount">0 fotografías</small></div>
<div class="photo-grid" id="photoGrid"></div>
</section>
<section class="card">
<div class="section-title"><span class="num">3</span><div><h2>Evaluación de Daños</h2><p>Indica dónde están los daños y los trabajos necesarios.</p></div></div>
<div class="grid">
<label class="wide">¿Hay Daños?<select id="hayDanios"><option value="">Seleccionar...</option><option>Sí</option><option>No</option></select></label>
<label class="wide">¿Dónde están los daños?<input id="dondeDanios" placeholder="Indica la zona, estancia o ubicación"/></label>
<label>Gremios Solicitar<input id="gremiosSolicitar" placeholder="Albañilería, pintura, fontanería..."/></label>
<label>m² correspondientes<input id="metros" min="0" placeholder="0" step="0.01" type="number"/></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">4</span><div><h2>Datos del Perjudicado</h2><p>Información de la vivienda o persona perjudicada.</p></div></div>
<div class="grid">
<label>Teléfono Perjudicado<input id="telefonoPerjudicado" placeholder="Teléfono" type="tel"/></label>
<label>Nº Vivienda<input id="numeroVivienda" placeholder="Nº de vivienda"/></label>
<label class="wide">Daños Perjudicado<textarea id="daniosPerjudicado" placeholder="Describe los daños ocasionados al perjudicado..." rows="4"></textarea></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">5</span><div><h2>Conformidad y Firma</h2><p>Identificación del firmante y firma manuscrita.</p></div></div>
<label>DNI Firmante<input id="dniFirmante" placeholder="DNI / NIF del firmante"/></label>
<div class="signature-wrap"><div class="signature-label">Firma Manuscrita (Dibuja aquí)</div><canvas height="260" id="signature" width="900"></canvas><div class="signature-actions"><button class="btn ghost" id="clearSignature" type="button">Borrar firma</button><span id="signatureState">Sin firma</span></div></div>
</section>
<section class="card final-card"><div><h2>Finalizar parte</h2><p>Cuando esté completo, márcalo como terminado para revisarlo.</p></div><button class="btn success" id="finishBtn" type="button">✓ Marcar como completado</button></section>
</form>
<div class="bottom-actions"><button class="btn secondary" id="downloadPhotosBtn">Descargar fotografías</button><button class="btn secondary" id="printBtn">Imprimir / Guardar PDF</button><button class="btn danger" id="deleteBtn">Eliminar siniestro</button></div>
</div>
</section></main>
<div class="toast" id="toast"></div><style>.hidden{display:none!important}.full{width:100%;margin-top:12px}.readonly-banner{margin:12px 0;padding:10px 14px;border-radius:10px;background:#eef2ff;color:#3730a3}.today-title{padding:12px 0}.today-title h2{margin:0}.mode-note{font-size:12px;opacity:.7;margin-top:3px}.previous-panel{padding:16px;border:1px solid #ddd;border-radius:14px;margin-bottom:14px;background:#fff}.previous-head{display:flex;justify-content:space-between;align-items:center}.previous-head h2{margin:0}.previous-results{max-height:50vh;overflow:auto}</style></div>


`;


const DB_NAME="gestion_siniestros_db",STORE="cases";let db,currentId=null,photos=[],signatureData="";
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
let readOnly=false;
let appMode=localStorage.getItem("partes_mode")||"worker";
function sameDay(c){return String(c.fecha||"").slice(0,10)===nowDate()}
function applyReadOnly(){document.querySelectorAll("#caseForm input,#caseForm textarea,#caseForm select").forEach(x=>x.disabled=readOnly);["saveBtn","finishBtn","deleteBtn","clearSignature","photos"].forEach(id=>{let x=$(id);if(x)x.disabled=readOnly});$("readonlyBanner").classList.toggle("hidden",!readOnly);$("downloadPhotosBtn").disabled=false;$("printBtn").disabled=false}
function fill(c){window.currentCase=c;fields.forEach(k=>$(k).value=c[k]||"");photos=c.photos||[];signatureData=c.signature||"";$("statusLabel").textContent=c.status;$("editorTitle").textContent=c.direccion||"Nuevo siniestro";$("editorMeta").textContent=`Creado ${new Date(c.createdAt).toLocaleString("es-ES")} · Última modificación ${new Date(c.updatedAt).toLocaleString("es-ES")}`;renderPhotos();renderSignature();applyReadOnly();renderList()}
function renderList(){allCases().then(cs=>{let q=$(appMode==="worker"?"search":"search").value.toLowerCase();let matches=cs.filter(c=>(c.direccion+" "+c.nombre+" "+c.apellido+" "+c.numParte+" "+c.aseguradora).toLowerCase().includes(q));let today=matches.filter(sameDay),old=matches.filter(c=>!sameDay(c));let pending=today.filter(c=>c.status!=="COMPLETADO"),done=today.filter(c=>c.status==="COMPLETADO");$("count").textContent=pending.length;$("recordsList").innerHTML=pending.map(recordHtml).join("");$("completedList").innerHTML=done.map(recordHtml).join("");document.querySelectorAll(".record").forEach(e=>e.onclick=()=>getCase(e.dataset.id).then(c=>showEditor(c,false)));$("completedList").previousElementSibling.style.display=done.length?"flex":"none";if(appMode==="admin"){$("listTitle").textContent="TODOS LOS PARTES";$("modeNote").textContent="Modo administración";$("recordsList").innerHTML=matches.map(recordHtml).join("");$("completedList").innerHTML="";$("completedList").previousElementSibling.style.display="none";document.querySelectorAll(".record").forEach(e=>e.onclick=()=>getCase(e.dataset.id).then(c=>showEditor(c,false)));$("count").textContent=matches.length}})}
function recordHtml(c){return `<div class="record" data-id="${esc(c.id)}"><strong>${esc(c.direccion||"Sin dirección")}</strong><small>${esc(c.fecha||"")} ${esc(c.hora||"")} · ${esc((c.nombre+" "+c.apellido).trim()||"Sin asegurado")}</small><div class="status">${esc(c.status)}</div></div>`}
function showEditor(c,forceReadOnly=false){currentId=c.id;readOnly=forceReadOnly|| (appMode==="worker"&&!sameDay(c));$("empty").classList.add("hidden");$("editor").classList.remove("hidden");fill(c)}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
async function save(show=true){let c=collect();await putCase(c);window.currentCase=c;currentId=c.id;fill(c);if(show)toast("Siniestro guardado")}
function renderPhotos(){$("photoCount").textContent=`${photos.length} fotografía${photos.length===1?"":"s"}`;$("photoGrid").innerHTML=photos.map((p,i)=>`<div class="photo"><img src="${p.data}" alt="Foto ${i+1}"><button type="button" data-photo="${i}">×</button></div>`).join("");document.querySelectorAll("[data-photo]").forEach(b=>b.onclick=()=>{photos.splice(+b.dataset.photo,1);renderPhotos()})}
async function addFiles(files){const list=[...(files||[])];if(!list.length)return;let n=0;for(const f of list){if(!f.type.startsWith("image/"))continue;try{let data=await new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("No se pudo leer la foto"));r.readAsDataURL(f)});photos.push({name:f.name,type:f.type,data,addedAt:Date.now()});n++}catch(e){console.error(e)}}renderPhotos();$("photos").value="";if(n)toast(`${n} fotografía${n===1?"":"s"} añadida${n===1?"":"s"}`);else toast("No se pudo añadir la fotografía")}
$("photos").onchange=e=>{addFiles(e.target.files)};$("dropZone").ondragover=e=>{e.preventDefault()};$("dropZone").ondrop=e=>{e.preventDefault();addFiles(e.dataTransfer.files)};
const canvas=$("signature"),ctx=canvas.getContext("2d");let drawing=false;
function resizeCanvas(){let r=devicePixelRatio||1,rect=canvas.getBoundingClientRect(),old=signatureData;canvas.width=rect.width*r;canvas.height=260*r;ctx.scale(r,r);ctx.lineWidth=2;ctx.lineCap="round";ctx.strokeStyle="#111827";if(old){let img=new Image();img.onload=()=>ctx.drawImage(img,0,0,rect.width,260);img.src=old}}
function point(e){let r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}function start(e){e.preventDefault();drawing=true;let p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y)}function move(e){if(!drawing)return;e.preventDefault();let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()}function end(){if(drawing){drawing=false;signatureData=canvas.toDataURL("image/png");$("signatureState").textContent="Firma capturada"}}
canvas.onpointerdown=start;canvas.onpointermove=move;window.onpointerup=end;
function renderSignature(){resizeCanvas();$("signatureState").textContent=signatureData?"Firma capturada":"Sin firma"}
$("clearSignature").onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);signatureData="";$("signatureState").textContent="Sin firma"}
window.onresize=()=>{if(!$("editor").classList.contains("hidden"))renderSignature()};
$("newBtn").onclick=$("emptyNew").onclick=async()=>{if(appMode!=="admin")return toast("Solo administración puede preparar partes");let c=blankCase();await putCase(c);showEditor(c,false);toast("Nuevo parte preparado")};
$("saveBtn").onclick=()=>save();
$("finishBtn").onclick=async()=>{let c=collect();c.status="COMPLETADO";await putCase(c);showEditor(c);toast("Parte marcado como completado")};
$("deleteBtn").onclick=async()=>{if(currentId&&confirm("¿Eliminar este siniestro y sus fotografías?")){await delCase(currentId);currentId=null;$("editor").classList.add("hidden");$("empty").classList.remove("hidden");renderList();toast("Siniestro eliminado")}};
$("search").oninput=renderList;
function safe(s=""){return s.replace(/[^\w\dáéíóúüñÁÉÍÓÚÜÑ-]+/g,"-").replace(/^-|-$/g,"")||"sin-datos"}
function downloadBlob(b,n){let a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("downloadPhotosBtn").onclick=async()=>{await save(false);let c=window.currentCase;if(!c.photos.length)return toast("No hay fotografías");if(typeof JSZip==="undefined"){c.photos.forEach((p,i)=>{let a=document.createElement("a");a.href=p.data;a.download=p.name||`foto-${i+1}.jpg`;a.click()});return}let z=new JSZip();c.photos.forEach((p,i)=>z.file(p.name||`foto-${i+1}.jpg`,p.data.split(",")[1],{base64:true}));let b=await z.generateAsync({type:"blob"});downloadBlob(b,`${safe(c.fecha)}_${safe(c.hora)}_${safe(c.direccion)}_fotos.zip`);toast("ZIP de fotografías preparado")};
$("printBtn").onclick=async()=>{await save(false);let c=window.currentCase,ph=c.photos.map((p,i)=>`<img src="${p.data}" style="width:220px;height:165px;object-fit:cover;margin:5px;border:1px solid #ddd">`).join(""),sig=c.signature?`<img src="${c.signature}" style="max-width:420px;max-height:130px">`:"Sin firma";let item=(l,v)=>`<div class="item"><div class="label">${l}</div>${esc(v||"—")}</div>`;let w=open("","_blank");w.document.write(`<html><head><title>Parte ${esc(c.direccion)}</title><style>body{font-family:Arial;padding:35px;color:#111}h1{font-size:25px}h2{font-size:17px;border-bottom:1px solid #ddd;padding-bottom:6px;margin-top:25px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item{padding:8px;border:1px solid #ddd}.label{font-size:10px;color:#666;text-transform:uppercase}.photos{display:flex;flex-wrap:wrap}</style></head><body><h1>Parte de siniestro</h1><p>${esc(c.fecha)} ${esc(c.hora)} · ${esc(c.direccion)}</p><h2>1. Datos del Asegurado</h2><div class="row">${item("Nombre",c.nombre)}${item("Apellido",c.apellido)}${item("DNI/NIF",c.dni)}${item("Teléfono",c.telefono)}${item("Dirección",c.direccion)}${item("Compañía",c.aseguradora)}${item("Nº de parte",c.numParte)}${item("Hora",c.hora)}</div><p><b>Descripción / Qué Hacer:</b> ${esc(c.descripcionQueHacer)}</p><h2>2. Comentarios y Fotos</h2><p>${esc(c.observaciones)}</p><div class="photos">${ph}</div><h2>3. Evaluación de Daños</h2><div class="row">${item("¿Hay daños?",c.hayDanios)}${item("Dónde están",c.dondeDanios)}${item("Gremios solicitar",c.gremiosSolicitar)}${item("m² correspondientes",c.metros)}</div><h2>4. Datos del Perjudicado</h2><div class="row">${item("Teléfono perjudicado",c.telefonoPerjudicado)}${item("Nº vivienda",c.numeroVivienda)}</div><p><b>Daños perjudicado:</b> ${esc(c.daniosPerjudicado)}</p><h2>5. Conformidad y Firma</h2>${item("DNI firmante",c.dniFirmante)}<p>${sig}</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()};
$("exportBackupBtn").onclick=async()=>{let cs=await allCases();downloadBlob(new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),cases:cs})],{type:"application/json"}),`backup_siniestros_${nowDate()}.json`);toast("Copia de seguridad exportada")};
$("importBackup").onchange=async e=>{try{let d=JSON.parse(await e.target.files[0].text());for(let c of d.cases||[])await putCase(c);renderList();toast("Copia importada")}catch{alert("No se pudo importar la copia")}};
\n$("previousBtn").onclick=async()=>{$("previousPanel").classList.remove("hidden");$("previousDate").value="";$("previousQuery").value="";await renderPrevious()};\n$("closePrevious").onclick=()=>$("previousPanel").classList.add("hidden");\nasync function renderPrevious(){let date=$("previousDate").value,q=$("previousQuery").value.toLowerCase();let cs=await allCases();let old=cs.filter(c=>!sameDay(c)).filter(c=>(!date||String(c.fecha).slice(0,10)===date)&&(!q||(c.direccion+" "+c.nombre+" "+c.apellido+" "+c.numParte).toLowerCase().includes(q)));$("previousResults").innerHTML=old.map(recordHtml).join("")||"<p>No se encontraron partes anteriores.</p>";document.querySelectorAll(".previous-results .record").forEach(e=>e.onclick=()=>getCase(e.dataset.id).then(c=>showEditor(c,true)))}\n$("previousDate").onchange=renderPrevious;$("previousQuery").oninput=renderPrevious;\n$("modeBtn").onclick=()=>{if(appMode==="worker"){let pin=prompt("PIN de administración");if(pin!=="2468")return toast("PIN incorrecto");appMode="admin";localStorage.setItem("partes_mode","admin");$("modeBtn").textContent="👤 Modo administración"}else{appMode="worker";localStorage.setItem("partes_mode","worker");$("modeBtn").textContent="👷 Modo trabajador"}renderList()};\nif(appMode==="admin")$("modeBtn").textContent="👤 Modo administración";\n(async()=>{await openDB();renderList();let cs=await allCases();if(cs[0])showEditor(cs[0])})();

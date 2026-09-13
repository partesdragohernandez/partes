import './styles.css';
import { api, setupAccount } from './account.js';
import { setupTextImprovement } from './improve-text.js';

const jszipScript = document.createElement('script');
jszipScript.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
jszipScript.async = true;
document.head.appendChild(jszipScript);
const ocrScript=document.createElement('script');ocrScript.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';ocrScript.async=true;const ocrReady=new Promise((resolve,reject)=>{ocrScript.onload=resolve;ocrScript.onerror=reject});document.head.appendChild(ocrScript);
const uiStyle=document.createElement("style");uiStyle.textContent=`.history-panel{display:grid;gap:8px;margin:8px 0}.history-panel label{font-size:12px;font-weight:700}.history-btn{width:100%;margin:8px 0}.readonly-note{margin-top:6px;padding:8px 10px;border-radius:8px;background:#f3f4f6;color:#374151;font-size:12px}.hidden{display:none!important}.photo img{cursor:zoom-in}.worker-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.worker-tabs .tab{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:9px 6px;font-size:11px;font-weight:800;cursor:pointer}.worker-tabs .tab.active{background:#111827;color:#fff;border-color:#111827}.worker-tabs .tab span{font-weight:700;margin-left:3px}.ocr-btn{margin-bottom:8px}.ocr-box{display:grid;gap:8px}.ocr-status{font-size:12px;color:#4b5563}.ocr-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999}.ocr-card{background:#fff;border-radius:14px;padding:18px;max-width:520px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.25)}.ocr-card h2{margin:0 0 8px}.ocr-preview{max-height:180px;max-width:100%;object-fit:contain;border:1px solid #ddd;border-radius:8px}.ocr-actions{display:flex;gap:8px;justify-content:flex-end}`;document.head.appendChild(uiStyle);

document.body.innerHTML = `
<header class="topbar">
<div class="brand"><div class="logo">GS</div><div><strong>Gesti&oacute;n de Siniestros</strong><span>Partes, fotos y firmas</span></div></div>
<button class="btn ghost mobile-menu-btn" id="mobileMenuBtn">☰ Menú</button><div class="top-actions">
<button class="btn primary" id="newBtn">+ Nuevo siniestro</button>
<button class="btn secondary" id="ocrBtn">Importar parte desde foto</button>
<span id="sessionUser"></span><button class="btn ghost hidden" id="workersBtn">Trabajadores</button><button class="btn ghost" id="passwordBtn">Cambiar contraseña</button><button class="btn ghost" id="logoutBtn">Cerrar sesión</button>
<button class="btn ghost" id="exportBackupBtn">Exportar copia</button>
<label class="btn ghost file-btn">Importar copia<input accept=".json" id="importBackup" type="file"/></label>
</div>
</header>
<main class="layout">
<aside class="sidebar">
<div class="side-title"><span id="listTitle">PARTES DE HOY</span><span id="count">0</span></div>
<nav class="day-navigation" aria-label="Día seleccionado"><button type="button" class="btn ghost" id="prevDayBtn" aria-label="Día anterior">←</button><div><span>DÍA SELECCIONADO</span><strong id="selectedDayLabel" aria-live="polite"></strong></div><button type="button" class="btn ghost" id="nextDayBtn" aria-label="Día siguiente">→</button></nav>
<div class="today-search"><input id="search" placeholder="Buscar en el día seleccionado..."/></div>
<div id="workerTabs" class="worker-tabs" aria-label="Resumen de partes de hoy">
<div class="worker-summary pending-summary">PENDIENTES <span id="pendingCount">0</span></div>
<div class="worker-summary completed-summary">COMPLETADOS <span id="completedCount">0</span></div>
</div>
<button class="btn ghost history-btn" id="historyBtn" type="button">Consultar otro día</button>
<div id="historyPanel" class="history-panel hidden">
<label>Fecha del parte<input id="historyDate" type="date"/></label>
<input id="historyText" placeholder="Direcci&oacute;n, nombre o n&ordm; de parte..."/>
<button class="btn secondary" id="historySearchBtn" type="button">Buscar</button>
<button class="btn ghost" id="todayBtn" type="button"><- Volver a partes de hoy</button>
</div>
<div class="records" id="recordsList"></div>
<div class="storage-note">Los datos se guardan en la nube.</div>
</aside>
<section class="content">
<div class="empty" id="empty"><div class="empty-icon"></div><h1>Gesti&oacute;n de partes de siniestro</h1><p>Crea un parte, a&ntilde;ade los datos, las fotograf\u00edas y la firma.</p><button class="btn primary" id="emptyNew">Crear primer siniestro</button></div>
<div class="editor hidden" id="editor">
<div class="editor-head"><div><div class="eyebrow" id="statusLabel">BORRADOR</div><h1 id="editorTitle">Nuevo siniestro</h1><div class="meta" id="editorMeta"></div><div class="readonly-note hidden" id="readonlyNote"> Consulta: este parte no corresponde a hoy y está en solo lectura.</div></div><div class="head-actions"><button class="btn primary" id="saveBtn">Guardar</button></div></div>
<form id="caseForm">
<section class="card">
<div class="section-title"><span class="num">1</span><div><h2>Datos del Asegurado</h2><p>Informaci&oacute;n principal del parte.</p></div></div>
<div class="grid">
<label class="wide" id="assignmentLabel">Trabajador asignado<select id="assignedUserId" required><option value="">Selecciona un trabajador</option></select></label>
<label>Nombre<input id="nombre" placeholder="Nombre"/></label>
<label>Apellido<input id="apellido" placeholder="Apellido"/></label>
<label>DNI / NIF<input id="dni" placeholder="DNI / NIF"/></label>
<label>Tel&eacute;fono<input id="telefono" placeholder="Tel&eacute;fono" type="tel"/></label>
<label class="wide">Direccion<input id="direccion" placeholder="Direcci&oacute;n del siniestro"/></label>
<label>Compa&ntilde;&iacute;a Aseguradora<input id="aseguradora" placeholder="Compa&ntilde;&iacute;a"/></label>
<label>N&ordm; de Parte<input id="numParte" placeholder="N&ordm; de parte"/></label>
<label>Empresa<input id="empresa" placeholder="Drago, Hernández, Allianz..." required/></label>
<label>Fecha de visita<input id="fechaVisita" type="date"/></label>
<label>Hora<input id="hora" type="time"/></label>
<label class="wide">Descripci&oacute;n / Qu&eacute; Hacer<textarea id="descripcionQueHacer" placeholder="Describe el siniestro y qu&eacute; hay que hacer..." rows="4"></textarea></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">2</span><div><h2>Comentarios y Fotos</h2><p>Observaciones generales y fotograf\u00edas de los da&ntilde;os.</p></div></div>
<label>Observaciones<textarea id="observaciones" placeholder="Escribe aqui cualquier detalle relevante..." rows="5"></textarea></label>
<div class="upload-zone" id="dropZone"><div class="upload-icon"></div><h3>Fotos de los Da&ntilde;os</h3><p>Selecciona todas las fotos necesarias de una sola vez o arr&aacute;stralas aqu&iacute;.</p><label class="btn secondary">A&ntilde;adir fotos<input accept="image/*" id="photos" multiple="" type="file"/></label><small id="photoCount">0 fotograf\u00edas</small></div>
<div class="photo-grid" id="photoGrid"></div>
</section>
<section class="card">
<div class="section-title"><span class="num">3</span><div><h2>Evaluaci&oacute;n de Da&ntilde;os</h2><p>Indica d&oacute;nde est&aacute;n los da&ntilde;os y los trabajos necesarios.</p></div></div>
<div class="grid">
<label class="wide">Hay Da&ntilde;os?<select id="hayDanios"><option value="">Seleccionar...</option><option>Si</option><option>No</option></select></label>
<label class="wide">D&oacute;nde est&aacute;n los da&ntilde;os?<input id="dondeDanios" placeholder="Indica la zona, estancia o ubicaci&oacute;n"/></label>
<label>Gremios a Solicitar<input id="gremiosSolicitar" placeholder="Alba&ntilde;iler&iacute;a, pintura, fontaner&iacute;a..."/></label>
<label>m2 correspondientes<input id="metros" min="0" placeholder="0" step="0.01" type="number"/></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">4</span><div><h2>Datos del Perjudicado</h2><p>Informaci&oacute;n de la vivienda o persona perjudicada.</p></div></div>
<div class="grid">
<label>Tel&eacute;fono Perjudicado<input id="telefonoPerjudicado" placeholder="Tel&eacute;fono" type="tel"/></label>
<label>N&ordm; Vivienda<input id="numeroVivienda" placeholder="N&ordm; de vivienda"/></label>
<label class="wide">Da&ntilde;os Perjudicado<textarea id="daniosPerjudicado" placeholder="Describe los da&ntilde;os ocasionados al perjudicado..." rows="4"></textarea></label>
</div>
</section>
<section class="card">
<div class="section-title"><span class="num">5</span><div><h2>Conformidad y Firma</h2><p>Identificaci&oacute;n del firmante y firma manuscrita.</p></div></div>
<label>Nombre del firmante<input id="nombreFirmante" placeholder="Nombre de quien firma"/></label>
<label>DNI Firmante<input id="dniFirmante" placeholder="DNI / NIF del firmante"/></label>
<div class="signature-wrap"><div class="signature-label">Firma Manuscrita (Dibuja aqu&iacute;)</div><canvas height="260" id="signature" width="900"></canvas><div class="signature-actions"><button class="btn ghost" id="clearSignature" type="button">Borrar firma</button><span id="signatureState">Sin firma</span></div></div>
</section>
<section class="card final-card"><div><h2>Finalizar parte</h2><p>Cuando est&eacute; completo, m&aacute;rcalo como terminado para revisarlo.</p></div><button class="btn success" id="finishBtn" type="button">[OK] Marcar como completado</button></section>
</form>
<div class="bottom-actions"><button class="btn secondary" id="downloadPhotosBtn">Descargar fotograf\u00edas</button><button class="btn secondary" id="printBtn">Imprimir / Guardar PDF</button><button class="btn danger" id="deleteBtn">Eliminar siniestro</button></div>
</div>
</section></main>
<div class="toast" id="toast"></div>
<div id="ocrModal" class="ocr-modal hidden"><div class="ocr-card"><h2>Importar parte desde foto</h2><p>Sube una captura o foto del parte. Extraeremos los datos y podr&aacute;s revisarlos antes de guardar.</p><div class="ocr-box"><input id="ocrFile" type="file" accept="image/*"/><img id="ocrPreview" class="ocr-preview hidden" alt="Vista previa"/><div id="ocrStatus" class="ocr-status">Esperando una imagen...</div></div><div class="ocr-actions"><button class="btn ghost" id="ocrCancel" type="button">Cancelar</button><button class="btn primary" id="ocrRun" type="button">Extraer datos</button></div></div></div>


`;


const DB_NAME="gestion_siniestros_db",STORE="cases";let db,currentId=null,photos=[],signatureData="";let appMode="worker",listMode="today",dayTab="pending",authUser=null,workers=[],selectedDay=nowDate();
const $=id=>document.getElementById(id);
const mobileMenuBtn=$("mobileMenuBtn"),topActions=document.querySelector(".top-actions");
if(mobileMenuBtn&&topActions){
  const mobileViewport=matchMedia('(max-width:850px)');
  topActions.id='topActions';mobileMenuBtn.type='button';
  mobileMenuBtn.setAttribute('aria-controls','topActions');
  const setMenuOpen=open=>{topActions.classList.toggle('mobile-open',open);mobileMenuBtn.setAttribute('aria-expanded',String(open))};
  setMenuOpen(false);
  mobileMenuBtn.onclick=()=>setMenuOpen(!topActions.classList.contains('mobile-open'));
  document.addEventListener('click',e=>{if(!topActions.contains(e.target)&&!mobileMenuBtn.contains(e.target))setMenuOpen(false)});
  topActions.addEventListener('click',e=>{if(e.target.closest('button,label,input'))setMenuOpen(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&topActions.classList.contains('mobile-open')){setMenuOpen(false);mobileMenuBtn.focus()}});
  mobileViewport.addEventListener('change',()=>setMenuOpen(false));
}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function nowDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Atlantic/Canary",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())} function nowTime(){return new Intl.DateTimeFormat("en-GB",{timeZone:"Atlantic/Canary",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date())}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function openDB(){return Promise.resolve()}
function fromApi(r){return {version:r.version,assignedUserId:r.assigned_user_id||"",assignedName:r.assigned_name||"",nombreFirmante:r.signer_name||"",canEdit:r.can_edit,id:r.id||uid(),nombre:r.name||"",apellido:r.surname||"",dni:r.dni||"",telefono:r.phone||"",direccion:r.address||"",aseguradora:r.insurer||"",empresa:r.company||"",numParte:r.claim_no||"",hora:r.time||"",descripcionQueHacer:r.description||"",observaciones:r.observations||"",hayDanios:r.has_damage||"",dondeDanios:r.damage_where||"",gremiosSolicitar:r.trades||"",metros:r.sqm||"",telefonoPerjudicado:r.injured_phone||"",numeroVivienda:r.housing_no||"",daniosPerjudicado:r.injured_damage||"",dniFirmante:r.signer_dni||"",status:r.status||"BORRADOR",visitDate:r.visit_date|| (r.created_at?String(r.created_at).slice(0,10):nowDate()),createdAt:r.created_at?new Date(r.created_at).getTime():Date.now(),updatedAt:r.updated_at?new Date(r.updated_at).getTime():Date.now(),fecha:r.created_at?String(r.created_at).slice(0,10):nowDate(),photos:r.photos||[],signature:r.signature||""}}
async function allCases(){return (await api('/api/cases')).map(fromApi)}
async function getCase(id){return fromApi(await api('/api/cases/'+encodeURIComponent(id)))}
async function putCase(c,importing=false){const payload={id:c.id,version:c.version,assignedUserId:c.assignedUserId||null,signerName:c.nombreFirmante||"",name:c.nombre,surname:c.apellido,dni:c.dni,phone:c.telefono,address:c.direccion,insurer:c.aseguradora,claimNo:c.numParte,company:c.empresa||"",time:c.hora,visitDate:c.visitDate||c.fecha||nowDate(),description:c.descripcionQueHacer,observations:c.observaciones,hasDamage:c.hayDanios,damageWhere:c.dondeDanios,trades:c.gremiosSolicitar,sqm:c.metros,injuredPhone:c.telefonoPerjudicado,housingNo:c.numeroVivienda,injuredDamage:c.daniosPerjudicado,signerDni:c.dniFirmante,status:c.status,photos:(c.photos||[]).map(p=>p.key?{key:p.key,name:p.name}:p),signature:c.signature||""};if(authUser?.role!=="admin")for(const k of ["name","surname","dni","phone","address","company","insurer","claimNo","time","description","visitDate","assignedUserId"])delete payload[k];if(!importing&&c.version!==undefined&&c.signature===window.currentCase?.signature)delete payload.signature;const result=await api(importing?'/api/import':'/api/cases',{method:'POST',body:JSON.stringify(payload)});c.version=result.version;return c}
async function delCase(id){await api('/api/cases/'+encodeURIComponent(id),{method:'DELETE',body:'{}'})}
function blankCase(){return{id:uid(),createdAt:Date.now(),updatedAt:Date.now(),status:"BORRADOR",fecha:nowDate(),visitDate:selectedDay,hora:nowTime(),nombre:"",apellido:"",dni:"",telefono:"",direccion:"",aseguradora:"",numParte:"",descripcionQueHacer:"",observaciones:"",photos:[],hayDanios:"",dondeDanios:"",gremiosSolicitar:"",metros:"",telefonoPerjudicado:"",numeroVivienda:"",daniosPerjudicado:"",dniFirmante:"",signature:""}}
const fields=["assignedUserId","nombreFirmante","fechaVisita","empresa","hora","nombre","apellido","dni","telefono","direccion","aseguradora","numParte","descripcionQueHacer","observaciones","hayDanios","dondeDanios","gremiosSolicitar","metros","telefonoPerjudicado","numeroVivienda","daniosPerjudicado","dniFirmante"];
function collect(){let c={...(window.currentCase||blankCase())};fields.forEach(k=>c[k]=$(k).value);c.visitDate=$("fechaVisita").value||c.visitDate||c.fecha||nowDate();c.photos=photos;c.signature=signatureData;c.updatedAt=Date.now();return c}
function fill(c){window.currentCase=c;fillAssignments(c.assignedUserId);fields.forEach(k=>$(k).value=c[k]||"");photos=c.photos||[];signatureData=c.signature||"";$("fechaVisita").value=c.visitDate||c.fecha||nowDate();$("statusLabel").textContent=c.status;$("editorTitle").textContent=c.direccion||"Nuevo siniestro";$("editorMeta").textContent=`Creado ${new Date(c.createdAt).toLocaleString("es-ES")} - Ultima modificacion ${new Date(c.updatedAt).toLocaleString("es-ES")}`;renderPhotos();renderSignature();setReadOnly();renderList()}
function showEditor(c){currentId=c.id;$("empty").classList.add("hidden");$("editor").classList.remove("hidden");fill(c)}
function visitDay(c){return c.visitDate||c.fecha||""}
function formatVisitDay(value){const parts=String(value||"").split("-");return parts.length===3?`${parts[2]}/${parts[1]}/${parts[0]}`:value||"Sin fecha"}
function stateLabel(c){return c.status==="COMPLETADO"?"COMPLETADO":"PENDIENTE"}
function cardMarkup(c){const state=stateLabel(c).toLowerCase(),company=String(c.empresa||c.company||"").trim();return `<button class="record ${state} ${c.id===currentId?"active":""}" data-id="${c.id}" type="button"><div class="record-top"><span class="record-date">${esc(formatVisitDay(visitDay(c)))}</span><span class="record-time">${esc(c.hora||"--:--")}</span></div><div class="record-address">${esc(c.direccion||"Sin dirección")}</div><div class="record-bottom">${appMode==="admin"?`<span class="record-assigned">${esc(c.assignedName||"SIN ASIGNAR")}</span>`:""}${company?`<span class="record-company">${esc(company)}</span>`:""}<span class="record-status">${stateLabel(c)}</span></div></button>`}
function recordsMarkup(items){return items.map(cardMarkup).join("")}
function bindRecordClicks(){document.querySelectorAll(".record").forEach(e=>e.onclick=()=>getCase(e.dataset.id).then(showEditor))}
function sortByVisitTime(items){return [...items].sort((a,b)=>String(a.hora||"99:99").localeCompare(String(b.hora||"99:99")))}
function selectDay(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return;
 selectedDay=day;$("historyDate").value=day;$("selectedDayLabel").textContent=formatVisitDay(day);
 if(window.currentCase&&visitDay(window.currentCase)!==day){$("editor").classList.add("hidden");$("empty").classList.remove("hidden");}
 return renderList();
}
function shiftDay(delta){const date=new Date(selectedDay+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+delta);return selectDay(date.toISOString().slice(0,10));}
let listRequest=0;
function renderList(){if(!authUser)return;const generation=++listRequest;return allCases().then(cs=>{
 if(generation!==listRequest||!authUser)return;
 const query=[$("search").value,$("historyText").value].map(v=>v.trim().toLowerCase()).filter(Boolean);
 const matching=cs.filter(c=>visitDay(c)===selectedDay&&query.every(q=>(c.direccion+' '+c.nombre+' '+c.apellido+' '+c.numParte+' '+c.aseguradora+' '+c.empresa+' '+c.assignedName).toLowerCase().includes(q)));
 const pending=sortByVisitTime(matching.filter(c=>c.status!=="COMPLETADO")),completed=sortByVisitTime(matching.filter(c=>c.status==="COMPLETADO"));
 $("selectedDayLabel").textContent=formatVisitDay(selectedDay);$("count").textContent=matching.length;
 $("listTitle").textContent=appMode==="admin"?"PARTES DEL DÍA":"MIS PARTES DEL DÍA";
 $("pendingCount").textContent=pending.length;$("completedCount").textContent=completed.length;
 $("workerTabs").classList.remove('hidden');$("workerTabs").setAttribute('aria-label','Resumen del día seleccionado');
 $("recordsList").innerHTML='<section class="record-group pending-group"><div class="record-group-title">PENDIENTES <span>'+pending.length+'</span></div>'+(pending.length?recordsMarkup(pending):'<p class="group-empty">No hay partes pendientes para este día.</p>')+'</section><section class="record-group completed-group"><div class="record-group-title">COMPLETADOS <span>'+completed.length+'</span></div>'+(completed.length?recordsMarkup(completed):'<p class="group-empty">No hay partes completados para este día.</p>')+'</section>';
 bindRecordClicks();
 }).catch(e=>toast(e.message))}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function validateCompany(){if($("empresa").value.trim())return true;$("empresa").focus();toast("Escribe el nombre de la empresa");return false}
async function save(show=true){if(!validateCompany())return false;let c=collect();await putCase(c);c=await getCase(c.id);window.currentCase=c;currentId=c.id;fill(c);if(show)toast("Siniestro guardado");return true}
function renderPhotos(){$("photoCount").textContent=`${photos.length} fotograf\u00eda${photos.length===1?"":"s"}`;$("photoGrid").innerHTML=photos.map((p,i)=>`<div class="photo"><img src="${p.data}" alt="Foto ${i+1}" data-photo-view="${i}">${isReadOnly()?"" : `<button type="button" data-photo="${i}">x</button>`}</div>`).join("");document.querySelectorAll("[data-photo]").forEach(b=>b.onclick=()=>{photos.splice(+b.dataset.photo,1);renderPhotos()});document.querySelectorAll("[data-photo-view]").forEach(img=>img.onclick=()=>{let i=+img.dataset.photoView;let w=window.open("","_blank");w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh"><img src="${photos[i].data}" style="max-width:98%;max-height:98%;object-fit:contain"></body></html>`);w.document.close()})}
function isReadOnly(){return !authUser || (appMode==="worker" && (!window.currentCase || window.currentCase.assignedUserId!==authUser.id || visitDay(window.currentCase)!==nowDate()))}
function setReadOnly(){let ro=isReadOnly();$("readonlyNote").classList.toggle("hidden",!ro);$("saveBtn").classList.toggle("hidden",ro);$("finishBtn").classList.toggle("hidden",ro);$("deleteBtn").classList.toggle("hidden",ro||appMode!=="admin");$("downloadPhotosBtn").classList.remove("hidden");$("printBtn").classList.remove("hidden");document.querySelectorAll("#caseForm input,#caseForm textarea,#caseForm select").forEach(el=>{el.disabled=ro||(appMode!=="admin"&&["assignedUserId","nombre","apellido","dni","telefono","direccion","aseguradora","empresa","numParte","fechaVisita","hora","descripcionQueHacer"].includes(el.id))});$("dropZone").classList.toggle("hidden",ro);$("clearSignature").classList.toggle("hidden",ro);$("signature").style.pointerEvents=ro?"none":"auto"}
async function addFiles(files){const list=[...(files||[])];if(!list.length)return;let n=0;for(const f of list){if(!f.type.startsWith("image/"))continue;try{let data=await new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("No se pudo leer la foto"));r.readAsDataURL(f)});photos.push({name:f.name,type:f.type,data,addedAt:Date.now()});n++}catch(e){console.error(e)}}renderPhotos();$("photos").value="";if(n)toast(`${n} fotograf\u00eda${n===1?"":"s"} a\u00f1adida${n===1?"":"s"}`);else toast("No se pudo a\u00f1adir la fotograf\u00eda")}
$("photos").onchange=e=>{addFiles(e.target.files)};$("dropZone").ondragover=e=>{e.preventDefault()};$("dropZone").ondrop=e=>{e.preventDefault();addFiles(e.dataTransfer.files)};

let ocrImageFile=null;
function normText(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9n\u00fc:#/ .-]/g," ").replace(/\s+/g," ").trim()}
function lineValue(lines,labels){for(let i=0;i<lines.length;i++){let n=normText(lines[i]);for(const label of labels){let idx=n.indexOf(label);if(idx>=0){let raw=lines[i].slice(Math.min(lines[i].length,idx+label.length)).replace(/^\s*[:=-]?\s*/,"").trim();if(raw)return raw;let next=(lines[i+1]||"").trim();if(next)return next}}}return ""}
function cleanOcrValue(v){return String(v||'').replace(/\s+/g,' ').replace(/^[\s:=-]+|[\s]+$/g,'').trim()}
function valueAfterLabel(lines, labels){
 const normalized=lines.map(x=>normText(x));
 for(let i=0;i<lines.length;i++){
  for(const label of labels){
   const pos=normalized[i].indexOf(label);
   if(pos<0) continue;
   let raw=lines[i].slice(Math.min(lines[i].length,pos+label.length));
   raw=cleanOcrValue(raw);
   if(raw) return raw;
   if(lines[i+1]) return cleanOcrValue(lines[i+1]);
  }
 }
 return '';
}
function valueBlockAfterLabel(lines, labels){
 const normalized=lines.map(x=>normText(x));
 const stopLabels=['poliza','gremio','fecha cita','fecha fin prevista cita','fecha inicio','implicado','telefono 1 implicado','telefono 2 implicado','direccion','poblacion','codigo postal','provincia','reclamacion','descripcion'];
 for(let i=0;i<lines.length;i++){
  if(!labels.some(label=>normalized[i].indexOf(label)>=0)) continue;
  const label=labels.find(label=>normalized[i].indexOf(label)>=0);
  const pos=normalized[i].indexOf(label);
  let out=cleanOcrValue(lines[i].slice(Math.min(lines[i].length,pos+label.length)));
  for(let j=i+1;j<lines.length;j++){
   if(stopLabels.some(x=>normalized[j].indexOf(x)>=0)) break;
   out=cleanOcrValue((out+' '+lines[j]).trim());
  }
  if(out) return out;
 }
 return '';
}
function extractOcrFields(text){
const lines=text.split(/\r?\n/);
 const all=lines.join(' ');
 const out={};
 out.dni=(all.match(/\b\d{8}[A-Za-z]\b/)||[''])[0];
 const phoneMatches=all.match(/\b(?:6|7|8|9)\d{8}\b/g)||[];
 out.telefono=phoneMatches[0]||'';
 out.numParte=valueAfterLabel(lines,['poliza','n de parte','numero de parte','numero parte','parte']);
 out.aseguradora=valueAfterLabel(lines,['compania aseguradora','compania','aseguradora','seguro']);
 out.nombre=valueAfterLabel(lines,['nombre']);
 const implicado=valueAfterLabel(lines,['implicado','asegurado']);
 if(implicado){
  const parts=implicado.split(/\s+/).filter(Boolean);
  if(!out.nombre || normText(out.nombre)===normText(implicado)){out.nombre=parts.shift()||implicado;out.apellido=parts.join(' ')}
 }
 if(!out.apellido) out.apellido=valueAfterLabel(lines,['apellido','apellidos']);
 out.telefono=valueAfterLabel(lines,['telefono 1 implicado','telefono implicado','telefono'])||out.telefono;
 out.direccion=valueBlockAfterLabel(lines,['direccion','domicilio']);
 const poblacion=valueAfterLabel(lines,['poblacion','localidad','municipio']);
 const postal=valueAfterLabel(lines,['codigo postal','c.p.']);
 if(poblacion && normText(out.direccion).indexOf(normText(poblacion))<0) out.direccion=cleanOcrValue((out.direccion+' '+poblacion).trim());
 if(postal && normText(out.direccion).indexOf(normText(postal))<0) out.direccion=cleanOcrValue((out.direccion+' '+postal).trim());
 out.descripcionQueHacer=valueBlockAfterLabel(lines,['descripcion','que hacer','trabajos']);
 out.gremiosSolicitar=valueAfterLabel(lines,['gremio','gremios']);
 const cita=valueAfterLabel(lines,['fecha cita','cita']);
 const dm=(cita+' '+all).match(/\b(0?[1-9]|[12]\d|3[01])[\/-](0?[1-9]|1[0-2])[\/-](20\d{2})\b/);
 if(dm) out.fechaVisita=dm[3]+'-'+dm[2].padStart(2,'0')+'-'+dm[1].padStart(2,'0');
 const tm=(cita+' '+all).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
 if(tm) out.hora=tm[1].padStart(2,'0')+':'+tm[2];
 return out;
}
function applyOcrFields(data){
 const map={nombre:"nombre",apellido:"apellido",dni:"dni",telefono:"telefono",direccion:"direccion",aseguradora:"aseguradora",numParte:"numParte",hora:"hora",descripcionQueHacer:"descripcionQueHacer"};
 let n=0;for(const [a,b] of Object.entries(map)){if(data[a]&&$(b)&&!$(b).disabled){$(b).value=data[a];n++}}
 if(data.fechaVisita&&$("fechaVisita")) $("fechaVisita").value=data.fechaVisita;
 return n;
}
async function runOcr(){
 const f=$("ocrFile").files[0]; if(!f)return toast("Selecciona una imagen");
 if(!window.Tesseract){toast("Cargando lector de texto...");try{await ocrReady}catch(e){return toast("No se pudo cargar el lector de texto")}}
 if(!window.Tesseract)return toast("No se pudo cargar el lector de texto");
 $("ocrStatus").textContent="Leyendo el parte...";
 try{const result=await Tesseract.recognize(f,"spa",{logger:m=>{if(m.status&&typeof m.progress==="number")$("ocrStatus").textContent=`${m.status} ${Math.round(m.progress*100)}%`;}});const data=extractOcrFields(result.data.text||"");const n=applyOcrFields(data);$("ocrStatus").textContent=`Listo. Se han rellenado ${n} campos. Revisa los datos antes de guardar.`;$("ocrModal").classList.add("hidden");renderList();toast(`Parte leido: ${n} campos rellenados`);}catch(e){console.error(e);$("ocrStatus").textContent="No se pudo leer la imagen. Prueba con una captura mas clara.";}}
$("ocrBtn").onclick=async()=>{if(appMode!=="admin"){toast("Los partes los prepara administracion");return}let c=blankCase();showEditor(c);$("ocrModal").classList.remove("hidden");$("ocrFile").value="";$("ocrPreview").classList.add("hidden");$("ocrStatus").textContent="Esperando una imagen...";};
$("ocrCancel").onclick=()=>$("ocrModal").classList.add("hidden");
$("ocrFile").onchange=e=>{let f=e.target.files[0];if(!f)return;ocrImageFile=f;let r=new FileReader();r.onload=()=>{$("ocrPreview").src=r.result;$("ocrPreview").classList.remove("hidden")};r.readAsDataURL(f)};
$("ocrRun").onclick=runOcr;
const canvas=$("signature"),ctx=canvas.getContext("2d");let drawing=false;
function resizeCanvas(){let r=devicePixelRatio||1,rect=canvas.getBoundingClientRect(),old=signatureData;canvas.width=rect.width*r;canvas.height=260*r;ctx.scale(r,r);ctx.lineWidth=2;ctx.lineCap="round";ctx.strokeStyle="#111827";if(old){let img=new Image();img.onload=()=>ctx.drawImage(img,0,0,rect.width,260);img.src=old}}
function point(e){let r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}function start(e){e.preventDefault();drawing=true;let p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y)}function move(e){if(!drawing)return;e.preventDefault();let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()}function end(){if(drawing){drawing=false;signatureData=canvas.toDataURL("image/png");$("signatureState").textContent="Firma capturada"}}
canvas.onpointerdown=start;canvas.onpointermove=move;window.onpointerup=end;
function renderSignature(){resizeCanvas();$("signatureState").textContent=signatureData?"Firma capturada":"Sin firma"}
$("clearSignature").onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);signatureData="";$("signatureState").textContent="Sin firma"}
window.onresize=()=>{if(!$("editor").classList.contains("hidden"))renderSignature()};
$("ocrBtn").classList.add("hidden");
$("newBtn").onclick=$("emptyNew").onclick=async()=>{if(appMode!=="admin"){toast("Los partes los prepara administracion");return}let c=blankCase();showEditor(c);toast("Completa los datos y asigna un trabajador antes de guardar.")};
$("prevDayBtn").onclick=()=>shiftDay(-1);
$("nextDayBtn").onclick=()=>shiftDay(1);
$("historyBtn").onclick=()=>{$("historyPanel").classList.toggle("hidden");$("historyDate").value=selectedDay;};
$("historySearchBtn").onclick=()=>selectDay($("historyDate").value||selectedDay);
$("todayBtn").onclick=()=>{$("historyPanel").classList.add("hidden");$("historyText").value="";$("search").value="";selectDay(nowDate());};
$("historyDate").onchange=()=>selectDay($("historyDate").value||selectedDay);
$("historyText").oninput=renderList;
$("saveBtn").onclick=()=>save().catch(e=>toast(e.message));
$("finishBtn").onclick=async()=>{try{if(!validateCompany())return;let c=collect();const missing=[];if(!c.nombreFirmante?.trim())missing.push("Nombre del firmante");if(!c.dniFirmante?.trim())missing.push("DNI firmante");if(!c.signature)missing.push("firma");if(missing.length)return toast("Falta: "+missing.join(", "));c.status="COMPLETADO";await putCase(c);showEditor(await getCase(c.id));toast("Parte marcado como completado")}catch(e){toast(e.message)}};
$("deleteBtn").onclick=async()=>{if(currentId&&confirm("Eliminar este siniestro y sus fotograf\u00edas?")){await delCase(currentId);currentId=null;$("editor").classList.add("hidden");$("empty").classList.remove("hidden");renderList();toast("Siniestro eliminado")}};
$("search").oninput=renderList;
function safe(s=""){return s.replace(/[^\w\daeiouunAEIOUUN-]+/g,"-").replace(/^-|-$/g,"")||"sin-datos"}
function downloadBlob(b,n){let a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("downloadPhotosBtn").onclick=async()=>{let c=await getCase(currentId);if(!c.photos.length)return toast("No hay fotograf\u00edas");if(typeof JSZip==="undefined"){c.photos.forEach((p,i)=>{let a=document.createElement("a");a.href=p.data;a.download=p.name||`foto-${i+1}.jpg`;a.click()});return}let z=new JSZip();c.photos.forEach((p,i)=>z.file(p.name||`foto-${i+1}.jpg`,p.data.split(",")[1],{base64:true}));let b=await z.generateAsync({type:"blob"});downloadBlob(b,`${safe(c.visitDate||c.fecha)}_${safe(c.hora)}_${safe(c.direccion)}_fotos.zip`);toast("ZIP de fotograf\u00edas preparado")};
$("printBtn").onclick=async()=>{let c=await getCase(currentId),ph=c.photos.map((p,i)=>`<img src="${p.data}" style="width:220px;height:165px;object-fit:cover;margin:5px;border:1px solid #ddd">`).join(""),sig=c.signature?`<img src="${c.signature}" style="max-width:420px;max-height:130px">`:"Sin firma";let item=(l,v)=>`<div class="item"><div class="label">${l}</div>${esc(v||"-")}</div>`;let w=open("","_blank");if(!w)return toast("Permite ventanas emergentes para imprimir.");w.document.write(`<html><head><title>Parte ${esc(c.direccion)}</title><style>body{font-family:Arial;padding:35px;color:#111}h1{font-size:25px}h2{font-size:17px;border-bottom:1px solid #ddd;padding-bottom:6px;margin-top:25px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item{padding:8px;border:1px solid #ddd}.label{font-size:10px;color:#666;text-transform:uppercase}.photos{display:flex;flex-wrap:wrap}</style></head><body><h1>Parte de siniestro</h1><p>Visita: ${esc(c.visitDate||c.fecha)} ${esc(c.hora)} - ${esc(c.direccion)}</p><h2>1. Datos del Asegurado</h2><div class="row">${item("Nombre",c.nombre)}${item("Apellido",c.apellido)}${item("DNI/NIF",c.dni)}${item("Tel&eacute;fono",c.telefono)}${item("Direccion",c.direccion)}${item("Compa&ntilde;&iacute;a",c.aseguradora)}${item("N&ordm; de parte",c.numParte)}${item("Fecha de visita",c.visitDate||c.fecha)}${item("Hora",c.hora)}</div><p><b>Descripci&oacute;n / Qu&eacute; Hacer:</b> ${esc(c.descripcionQueHacer)}</p><h2>2. Comentarios y Fotos</h2><p>${esc(c.observaciones)}</p><div class="photos">${ph}</div><h2>3. Evaluaci&oacute;n de Da&ntilde;os</h2><div class="row">${item("Hay danos?",c.hayDanios)}${item("Donde estan",c.dondeDanios)}${item("Gremios solicitar",c.gremiosSolicitar)}${item("m2 correspondientes",c.metros)}</div><h2>4. Datos del Perjudicado</h2><div class="row">${item("Tel&eacute;fono perjudicado",c.telefonoPerjudicado)}${item("No vivienda",c.numeroVivienda)}</div><p><b>Danos perjudicado:</b> ${esc(c.daniosPerjudicado)}</p><h2>5. Conformidad y Firma</h2>${item("Nombre del firmante",c.nombreFirmante)}${item("DNI firmante",c.dniFirmante)}<p>${sig}</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()};
$("exportBackupBtn").onclick=async()=>{let cs=[];for(const row of await api("/api/export"))cs.push(await getCase(row.id));downloadBlob(new Blob([JSON.stringify({version:3,exportedAt:new Date().toISOString(),cases:cs})],{type:"application/json"}),`backup_siniestros_${nowDate()}.json`);toast("Copia de seguridad exportada")};
async function chooseImportWorker(){
 const dialog=document.createElement('dialog');dialog.className='workers-dialog';
 dialog.innerHTML='<h2>Asignación de la copia</h2><p>Selecciona el trabajador activo para los partes nuevos cuya asignación no exista en esta aplicación.</p><select required></select><p><button type="button" class="btn secondary">Continuar</button> <button type="button" class="btn ghost">Cancelar</button></p>';
 const select=dialog.querySelector('select');select.add(new Option('Selecciona un trabajador',''));for(const user of workers)if(user.active)select.add(new Option(user.displayName,user.id));
 document.body.append(dialog);dialog.showModal();
 return new Promise(resolve=>{let selected=null;dialog.querySelectorAll('button')[0].onclick=()=>{if(!select.reportValidity())return;selected=select.value;dialog.close()};dialog.querySelectorAll('button')[1].onclick=()=>dialog.close();dialog.onclose=()=>{dialog.remove();resolve(selected)}});
}
$("importBackup").onchange=async e=>{
 try{
  if(!e.target.files[0])return;const d=JSON.parse(await e.target.files[0].text());if(appMode!=="admin")throw new Error("Solo administrador");
  if(!Array.isArray(d.cases))throw new Error("La copia no contiene una lista de partes válida.");
  const rows=await allCases();await loadWorkers();
  const requiresAssignment=d.cases.some(c=>!rows.some(r=>r.id===c.id)&&!workers.some(u=>u.id===c.assignedUserId&&u.active));
  const defaultWorker=requiresAssignment?await chooseImportWorker():null;if(requiresAssignment&&!defaultWorker)return;
  for(const c of d.cases){if(c.status==='COMPLETADO'&&(!c.nombreFirmante?.trim()||!c.dniFirmante?.trim()||!c.signature))throw new Error('La copia contiene COMPLETADOS sin Nombre del firmante, DNI o firma. Revisa la copia antes de importarla.');}
  if(d.cases.some(c=>rows.some(r=>r.id===c.id))&&!confirm('La copia contiene partes existentes. ¿Quieres sustituir sus datos por los de la copia?'))return;
  for(const c of d.cases){const old=rows.find(r=>r.id===c.id);c.version=old?.version;
   if(!old&&!workers.some(u=>u.id===c.assignedUserId&&u.active))c.assignedUserId=defaultWorker;
   if(old&&!c.assignedUserId)c.assignedUserId=old.assignedUserId;
   c.photos=(c.photos||[]).map(p=>({name:p.name,data:p.data}));await putCase(c,true);
  }
  await renderList();toast('Copia importada');
 }catch(error){alert(error.message||'No se pudo importar la copia');}finally{e.target.value='';}
};
setupTextImprovement({ getCaseId: () => currentId, isReadOnly, notify: toast });
async function loadWorkers(){workers=authUser?.role==="admin"?await api('/api/admin/users'):[];fillAssignments(window.currentCase?.assignedUserId)}
function fillAssignments(selected){const el=$("assignedUserId");el.replaceChildren(new Option("Selecciona un trabajador", ""));for(const u of workers)if(u.active||u.id===selected)el.add(new Option(u.displayName+(u.active?"":" (desactivado)"),u.id));el.value=selected||""}
setupAccount({notify:toast,onWorkersChanged:loadWorkers,onUser:async user=>{authUser=user;appMode=user?.role||"worker";currentId=null;window.currentCase=null;photos=[];signatureData="";listMode="today";selectedDay=nowDate();listRequest++;$("caseForm").reset();$("photoGrid").replaceChildren();ctx.clearRect(0,0,canvas.width,canvas.height);$("historyPanel").classList.add("hidden");$("historyDate").value="";$("historyText").value="";$("search").value="";$("editorTitle").textContent="";$("editorMeta").textContent="";$("recordsList").replaceChildren();$("editor").classList.add("hidden");$("empty").classList.remove("hidden");for(const id of ["newBtn","emptyNew","ocrBtn","workersBtn"])$(id).classList.toggle("hidden",user?.role!=="admin");$("importBackup").parentElement.classList.toggle("hidden",user?.role!=="admin");$("assignmentLabel").classList.toggle("hidden",user?.role!=="admin");$("sessionUser").textContent=user?user.displayName+" · "+(user.role==="admin"?"Administrador":"Trabajador"):"";$("empty").querySelector("p").textContent=user?.role==="admin"?"Crea un parte y asígnalo a un trabajador.":"Selecciona uno de tus partes asignados o consulta otro día.";if(user){await loadWorkers();await renderList()}}});
$("caseForm").onsubmit=e=>e.preventDefault();
const pendingBtn=document.createElement('button');pendingBtn.type='button';pendingBtn.className='btn secondary';pendingBtn.textContent='Marcar como pendiente';$("finishBtn").parentElement.append(pendingBtn);pendingBtn.onclick=async()=>{try{let c=collect();c.status='PENDIENTE';await putCase(c);showEditor(await getCase(c.id))}catch(e){toast(e.message)}};
new MutationObserver(()=>{pendingBtn.hidden=$("finishBtn").classList.contains('hidden')}).observe($("finishBtn"),{attributes:true,attributeFilter:['class']});
window.addEventListener('unhandledrejection',e=>{e.preventDefault();toast(e.reason?.message||'No se pudo completar la operación.')});

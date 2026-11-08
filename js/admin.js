import { isFirebaseConfigured, db, auth, watchAuth, isAdminUser, signInGoogle, signOutUser, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "./firebase.js";

const $ = id => document.getElementById(id);
const gate = $("authGate"), adminApp = $("adminApp");
let adminLanguage='en', currentAdmin = null, baseUnits = [], units = [], unitDocs = new Map(), customTools = [], editingUnitId = null, editingTool = null, statsTimer = null;
const tr=(en,si)=>adminLanguage==='si'?si:en;
const adminMessages={
 'Refreshing visitor statistics…':'අමුත්තන්ගේ සංඛ්‍යාලේඛන යාවත්කාලීන කරමින්…',
 'Could not read statistics. Check that the Firestore rules below are published.':'සංඛ්‍යාලේඛන කියවිය නොහැක. පහත දත්ත සමුදා ආරක්ෂක නීති ප්‍රකාශ කර ඇතිදැයි පරීක්ෂා කරන්න.',
 'This built-in unit is already at its original settings.':'මෙම මුල් විෂය ඒකකය දැනටමත් මුල් සැකසුම්වල පවතී.',
 'Move or delete its uploaded tools before deleting this unit.':'මෙම ඒකකය මැකීමට පෙර එයට එක් කළ මෙවලම් වෙනත් ඒකකයකට ගෙනයන්න හෝ මකන්න.',
 'Built-in unit reset.':'මුල් විෂය ඒකකය නැවත සකස් කළා.', 'Unit deleted.':'විෂය ඒකකය මකා දැමුවා.',
 'Could not remove the unit. Check Firestore rules.':'විෂය ඒකකය ඉවත් කළ නොහැක. දත්ත සමුදා ආරක්ෂක නීති පරීක්ෂා කරන්න.',
 'Enter a unit name.':'විෂය ඒකකයේ නම ඇතුළත් කරන්න.', 'A unit with that name already exists.':'එම නමින් විෂය ඒකකයක් දැනටමත් ඇත.',
 'Unit saved.':'විෂය ඒකකය සුරැකුවා.', 'Could not save the unit. Check Firestore rules.':'විෂය ඒකකය සුරැකිය නොහැක. දත්ත සමුදා ආරක්ෂක නීති පරීක්ෂා කරන්න.',
 'Enter a title and choose a syllabus unit.':'මාතෘකාවක් ඇතුළත් කර විෂය ඒකකයක් තෝරන්න.', 'Choose an HTML file.':'HTML ගොනුවක් තෝරන්න.',
 'HTML file must be smaller than 800 KB.':'HTML ගොනුව 800 KB ට වඩා කුඩා විය යුතුය.', 'Choose an HTML simulation file.':'HTML අනුකරණ ගොනුවක් තෝරන්න.',
 'A tool with that title already exists.':'එම මාතෘකාව සහිත මෙවලමක් දැනටමත් ඇත.', 'Simulation updated.':'අනුකරණය යාවත්කාලීන කළා.',
 'Simulation added.':'අනුකරණය එක් කළා.', 'Could not save the simulation. Check Firestore rules and file size.':'අනුකරණය සුරැකිය නොහැක. දත්ත සමුදා නීති හා ගොනු ප්‍රමාණය පරීක්ෂා කරන්න.',
 'Simulation deleted.':'අනුකරණය මකා දැමුවා.', 'Could not delete this simulation. Check Firestore rules.':'මෙම අනුකරණය මකා දැමිය නොහැක. දත්ත සමුදා ආරක්ෂක නීති පරීක්ෂා කරන්න.',
 'Firebase configuration is missing. Check js/firebase-config.js.':'Firebase සැකසුම හමු නොවීය. js/firebase-config.js ගොනුව පරීක්ෂා කරන්න.',
 'Sign in with the authorised Google account to manage the library.':'පුස්තකාලය කළමනාකරණය කිරීමට අවසරලත් Google ගිණුමෙන් පිවිසෙන්න.',
 'Administrator access required':'පරිපාලක අවසරය අවශ්‍යයි','Signed out.':'ගිණුමෙන් පිටවිය.',
 'Connecting to Google…':'Google වෙත සම්බන්ධ වෙමින්…','Continue with Google':'Google සමඟ පිවිසෙන්න',
 'Google sign-in failed. Check Firebase Authentication settings.':'Google පිවිසුම අසාර්ථකයි. Firebase Authentication සැකසුම් පරීක්ෂා කරන්න.',
 'Could not sign out.':'ගිණුමෙන් පිටවිය නොහැක.',
 'This account is not authorised. Use the verified administrator Google account.':'මෙම ගිණුමට අවසර නැත. තහවුරු කළ පරිපාලක Google ගිණුම භාවිත කරන්න.'
};
const toast = message => { const el=$("toast"); el.textContent=adminLanguage==='si'?(adminMessages[message]||message):message; el.classList.add("show"); clearTimeout(window.__phyToast); window.__phyToast=setTimeout(()=>el.classList.remove("show"),2800); };
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug = value => String(value||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70);

function showGate(message, title="Admin access") { gate.hidden=false; adminApp.hidden=true; $("gateTitle").textContent=adminLanguage==='si'?(adminMessages[title]||'පරිපාලක ප්‍රවේශය'):title; let shown=message; if(adminLanguage==='si'&&message.startsWith("This account (")){const email=message.match(/This account \((.*?)\)/)?.[1]||"";shown=`මෙම ගිණුම (${email}) පරිපාලනය සඳහා අවසරලත් ගිණුමක් නොවේ. තහවුරු කළ පරිපාලක Google ගිණුම භාවිත කරන්න.`;} $("gateStatus").textContent=adminLanguage==='si'?(adminMessages[message]||shown):message; $("signOutBtn").hidden=!(auth?.currentUser); }
function showAdmin(user) { currentAdmin=user; gate.hidden=true; adminApp.hidden=false; $("signOutBtn").hidden=false; }

async function loadData() {
  const [unitSnap, toolSnap, catalogResponse] = await Promise.all([getDocs(collection(db,"units")), getDocs(collection(db,"customTools")), fetch("data/catalog.json",{cache:"no-store"})]);
  if (!catalogResponse.ok) throw new Error("Could not load the built-in syllabus catalogue.");
  const base = await catalogResponse.json(); baseUnits = base.units || [];
  unitDocs = new Map(unitSnap.docs.map(d=>[d.id,{id:d.id,...d.data()}]));
  const merged = new Map(baseUnits.map(u=>[u.id,{...u}]));
  for (const [id,override] of unitDocs) merged.set(id,{...(merged.get(id)||{}),...override,id});
  units = [...merged.values()];
  customTools = toolSnap.docs.map(d=>({id:d.id,...d.data()}));
  renderAdminLists();
}

function renderAdminLists() {
  const si=adminLanguage==='si';
  const selectedEdit=$('editTool').value;
  $("toolUnit").innerHTML=units.map(u=>`<option value="${safe(u.id)}">${safe(si?(u.nameSi||u.name):u.name)}</option>`).join("");
  $("unitList").innerHTML=units.map(u=>{const isBase=baseUnits.some(b=>b.id===u.id);const hasOverride=unitDocs.has(u.id);const name=si?(u.nameSi||u.name):u.name;return `<div class="admin-item"><div><b>${safe(name)}</b><small>${safe(u.id)}${isBase?(si?" · මුල් ඒකකය":" · Built-in unit"):(si?" · අමතර ඒකකය":" · Additional unit")}</small></div><div class="actions"><button class="btn" type="button" data-edit-unit="${safe(u.id)}">${si?'සංස්කරණය':'Edit'}</button><button class="btn danger" type="button" data-remove-unit="${safe(u.id)}">${isBase?(si?'මුල් තත්ත්වයට':'Reset'):(si?'මකන්න':'Delete')}</button></div></div>`;}).join("");
  $("editTool").innerHTML=`<option value="">${si?'නව අනුකරණයක් සාදන්න':'Create a new simulation'}</option>`+customTools.map(t=>`<option value="${safe(t.id)}">${safe(t.title)}</option>`).join("");
  if(selectedEdit&&customTools.some(t=>t.id===selectedEdit))$('editTool').value=selectedEdit;
  $("customToolList").innerHTML=customTools.map(t=>`<div class="admin-item"><div><b>${safe(t.title)}</b><small>${safe(units.find(u=>u.id===t.unitId)?.name||t.unitName||t.unitId||(si?'ඒකකය':'Unit'))}</small></div><div class="actions"><button class="btn" type="button" data-edit-tool="${safe(t.id)}">${si?'සංස්කරණය':'Edit'}</button><button class="btn danger" type="button" data-delete-tool="${safe(t.id)}">${si?'මකන්න':'Delete'}</button></div></div>`).join("")||`<div class="status">${si?'අමතර අනුකරණ තවම එක් කර නැත.':'No additional simulations uploaded yet.'}</div>`;
  document.querySelectorAll("[data-edit-unit]").forEach(b=>b.addEventListener("click",()=>editUnit(b.dataset.editUnit)));
  document.querySelectorAll("[data-remove-unit]").forEach(b=>b.addEventListener("click",()=>removeUnit(b.dataset.removeUnit)));
  document.querySelectorAll("[data-edit-tool]").forEach(b=>b.addEventListener("click",()=>loadToolForEdit(b.dataset.editTool)));
  document.querySelectorAll("[data-delete-tool]").forEach(b=>b.addEventListener("click",()=>removeTool(b.dataset.deleteTool)));
}

function editUnit(id) { const u=units.find(x=>x.id===id); if(!u)return; editingUnitId=id; $("unitName").value=u.name||""; $("unitShort").value=u.short||""; $("unitIcon").value=u.icon||"📘"; $("saveUnitBtn").textContent=tr("Update unit","ඒකකය යාවත්කාලීන කරන්න"); $("unitStatus").textContent=tr(`Editing ${u.name}. Save to apply this change to the public library.`,`${u.name} ඒකකය සංස්කරණය කරමින් පවතී. වෙනස්කම් පොදු පුස්තකාලයට යෙදීමට සුරකින්න.`); window.scrollTo({top:0,behavior:"smooth"}); }
async function removeUnit(id) {
  const isBuiltIn=baseUnits.some(u=>u.id===id);
  if(isBuiltIn) { if(!unitDocs.has(id))return toast("This built-in unit is already at its original settings."); if(!confirm(tr("Reset this built-in unit to its original name and description?","මෙම මුල් ඒකකය එහි මුල් නම හා විස්තරයට නැවත සකස් කරන්නද?")))return; }
  else { if(customTools.some(t=>t.unitId===id))return toast("Move or delete its uploaded tools before deleting this unit."); if(!confirm(tr("Delete this additional syllabus unit?","මෙම අමතර විෂය ඒකකය මකා දමන්නද?")))return; }
  try { await deleteDoc(doc(db,"units",id)); if(editingUnitId===id)clearUnitForm(); toast(isBuiltIn?"Built-in unit reset.":"Unit deleted."); await loadData(); }
  catch(e){console.error(e);toast("Could not remove the unit. Check Firestore rules.");}
}
function clearUnitForm(){editingUnitId=null;$("unitForm").reset();$("unitIcon").value="📘";$("saveUnitBtn").textContent=tr("Add unit","ඒකකය එක් කරන්න");$("unitStatus").textContent=tr("Built-in syllabus units can be edited; deleting an override restores its original details.","මුල් විෂය ඒකක සංස්කරණය කළ හැකිය. වෙනස් කළ ඒකකයක් ඉවත් කළ විට මුල් විස්තර නැවත ලැබේ.");}
$("unitForm").addEventListener("submit",async e=>{
  e.preventDefault(); const name=$("unitName").value.trim(); if(!name)return toast("Enter a unit name.");
  const id=editingUnitId||(slug(name)||`unit-${Date.now()}`);
  if(!editingUnitId&&units.some(u=>u.id===id))return toast("A unit with that name already exists.");
  const isBase=baseUnits.some(u=>u.id===id);
  const payload={name,short:$("unitShort").value.trim(),icon:$("unitIcon").value.trim()||"📘",custom:!isBase,updatedAt:serverTimestamp()};
  try{await setDoc(doc(db,"units",id),{...payload,...(!unitDocs.has(id)?{createdAt:serverTimestamp()}: {})},{merge:true});clearUnitForm();toast("Unit saved.");await loadData();}
  catch(err){console.error(err);toast("Could not save the unit. Check Firestore rules.");}
});
$("clearUnitBtn").addEventListener("click",clearUnitForm);

function loadToolForEdit(id) {
  editingTool=customTools.find(t=>t.id===id)||null; if(!editingTool)return;
  $("toolTitle").value=editingTool.title||""; $("toolUnit").value=editingTool.unitId||units[0]?.id||""; $("toolFormula").value=editingTool.formula||""; $("toolDescription").value=editingTool.description||""; $("toolFile").value=""; $("saveToolBtn").textContent=tr("Update simulation","අනුකරණය යාවත්කාලීන කරන්න"); $("toolStatus").textContent=tr("Editing an uploaded simulation. Select a new HTML file only if you want to replace the existing file.","එක් කළ අනුකරණයක් සංස්කරණය කරමින් පවතී. පැරණි ගොනුව වෙනුවට අලුත් ගොනුවක් යෙදීමට පමණක් HTML ගොනුවක් තෝරන්න."); window.scrollTo({top:0,behavior:"smooth"});
}
function clearToolForm(){editingTool=null;$("toolForm").reset();$("editTool").value="";$("saveToolBtn").textContent=tr("Save simulation","අනුකරණය සුරකින්න");$("toolStatus").textContent=tr("Uploaded simulations appear in the public library without requiring visitor login.","එක් කළ අනුකරණ අමුත්තන්ට පිවිසීමකින් තොරව භාවිත කළ හැකිය.");}
$("editTool").addEventListener("change",e=>{if(e.target.value)loadToolForEdit(e.target.value);else clearToolForm();});
$("clearToolBtn").addEventListener("click",clearToolForm);
$("toolForm").addEventListener("submit",async e=>{
  e.preventDefault(); const title=$("toolTitle").value.trim(), unitId=$("toolUnit").value, file=$("toolFile").files[0];
  if(!title||!unitId)return toast("Enter a title and choose a syllabus unit.");
  if(file&&(!file.name.toLowerCase().endsWith(".html")&&file.type!=="text/html"))return toast("Choose an HTML file.");
  if(file&&file.size>800*1024)return toast("HTML file must be smaller than 800 KB.");
  if(!editingTool&&!file)return toast("Choose an HTML simulation file.");
  const id=editingTool?.id||(slug(title)||`custom-${Date.now()}`);
  if(!editingTool&&customTools.some(t=>t.id===id))return toast("A tool with that title already exists.");
  try{
    if(file){const source=await file.text();await setDoc(doc(db,"customToolFiles",id),{html:source,updatedAt:serverTimestamp()});}
    const selected=units.find(u=>u.id===unitId);
    const record={title,unitId,unitName:selected?.name||"",formula:$("toolFormula").value.trim(),description:$("toolDescription").value.trim(),hasHtml:true,updatedAt:serverTimestamp()};
    if(editingTool)await updateDoc(doc(db,"customTools",id),record);else await setDoc(doc(db,"customTools",id),{...record,createdAt:serverTimestamp()});
    toast(editingTool?"Simulation updated.":"Simulation added.");clearToolForm();await loadData();
  }catch(err){console.error(err);toast("Could not save the simulation. Check Firestore rules and file size.");}
});
async function removeTool(id){
  if(!confirm("Delete this uploaded simulation and its HTML file? This cannot be undone."))return;
  try{await Promise.all([deleteDoc(doc(db,"customTools",id)),deleteDoc(doc(db,"customToolFiles",id))]);if(editingTool?.id===id)clearToolForm();toast("Simulation deleted.");await loadData();}
  catch(e){console.error(e);toast("Could not delete this simulation. Check Firestore rules.");}
}

async function refreshStats(){
  $("statsStatus").textContent="Refreshing visitor statistics…";
  try{
    const [presenceSnap,visitorSnap]=await Promise.all([getDocs(collection(db,"sitePresence")),getDocs(collection(db,"siteVisitors"))]);
    const now=Date.now(),online=presenceSnap.docs.filter(d=>{const ts=d.data().lastSeenAt;return ts&&typeof ts.toMillis==="function"&&(now-ts.toMillis())<=90000;}).length;
    $("onlineNow").textContent=String(online);$("totalVisitors").textContent=String(visitorSnap.size);
    $("statsStatus").textContent=tr(`Updated ${new Date().toLocaleTimeString()} · Online users are browsers active in the last 90 seconds.`,`යාවත්කාලීන කළ වේලාව ${new Date().toLocaleTimeString()} · අවසාන තත්පර 90 තුළ සක්‍රීය අමුත්තන්.`);
  }catch(e){console.error(e);$("statsStatus").textContent="Could not read statistics. Check that the Firestore rules below are published.";}
}
$("refreshStats").addEventListener("click",refreshStats);
$("googleSignInBtn").addEventListener("click",async()=>{
  const btn=$("googleSignInBtn");btn.disabled=true;btn.textContent=tr("Connecting to Google…","Google වෙත සම්බන්ධ වෙමින්…");
  try{await signInGoogle();}catch(e){console.error(e);$("gateStatus").textContent=e.message||"Google sign-in failed. Check Firebase Authentication settings.";}
  finally{btn.disabled=false;btn.textContent=tr("Continue with Google","Google සමඟ පිවිසෙන්න");}
});
$("signOutBtn").addEventListener("click",async()=>{try{await signOutUser();showGate("Signed out.");}catch(e){toast("Could not sign out.");}});

if(!isFirebaseConfigured||!auth||!db){showGate("Firebase configuration is missing. Check js/firebase-config.js.");$("googleSignInBtn").disabled=true;}
else{
  watchAuth(async user=>{
    if(!user){if(statsTimer){clearInterval(statsTimer);statsTimer=null;}showGate("Sign in with the authorised Google account to manage the library.");return;}
    if(!isAdminUser(user)){showGate(`This account (${user.email||"anonymous"}) is not authorised. Use the verified administrator Google account.` ,"Administrator access required");return;}
    showAdmin(user);
    try{await loadData();await refreshStats();if(statsTimer)clearInterval(statsTimer);statsTimer=setInterval(refreshStats,30000);}
    catch(e){console.error(e);toast("Could not load admin data. Check Firestore rules and catalog.json.");}
  });
}
function applyAdminLanguage(language){
  adminLanguage=language==='si'?'si':'en';const lang=adminLanguage;document.documentElement.lang=lang;
  document.querySelectorAll('[data-en][data-si]').forEach(el=>{el.textContent=el.dataset[lang];});
  document.querySelectorAll('[data-en-placeholder][data-si-placeholder]').forEach(el=>{el.placeholder=el.dataset[lang==='si'?'si':'en'];});
  $("adminLangToggle").textContent=lang==='en'?'සිංහල':'English';
  if($("signOutBtn"))$("signOutBtn").textContent=tr('Sign out','පිටවන්න');if($("googleSignInBtn"))$("googleSignInBtn").textContent=tr("Continue with Google","Google සමඟ පිවිසෙන්න");
  if($("saveUnitBtn"))$("saveUnitBtn").textContent=editingUnitId?tr('Update unit','ඒකකය යාවත්කාලීන කරන්න'):tr('Add unit','ඒකකය එක් කරන්න');
  if($("saveToolBtn"))$("saveToolBtn").textContent=editingTool?tr('Update simulation','අනුකරණය යාවත්කාලීන කරන්න'):tr('Save simulation','අනුකරණය සුරකින්න');
  if(units.length)renderAdminLists();
}
$("adminLangToggle").addEventListener("click",()=>{const current=document.documentElement.lang==='si'?'en':'si';try{localStorage.setItem('phy-lang',current)}catch(e){}applyAdminLanguage(current);});
try{applyAdminLanguage(localStorage.getItem('phy-lang')==='si'?'si':'en')}catch(e){applyAdminLanguage('en')}

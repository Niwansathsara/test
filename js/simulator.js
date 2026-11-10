const $ = id => document.getElementById(id);
const data = JSON.parse($('tool-data').textContent);
const C = { G: 6.67430e-11, k: 8.9875517923e9, e: 1.602176634e-19, h: 6.62607015e-34, c: 299792458, kB: 1.380649e-23, eps0: 8.8541878128e-12, mu0: 1.25663706212e-6, g: 9.80665 };
const R = data.ranges || [0, 10, .1, 0, 10, .1];
const D = data.defaults || [1, 1];
let state = { a: Number(D[0]), b: Number(D[1]) }, simulation = null, running = true;
let lang = 'en', soundEnabled = false, audioContext = null;
try { lang = localStorage.getItem('phy-lang') === 'si' ? 'si' : 'en'; } catch (_) { lang = 'en'; }

const ui = {
  en: {
    model:'3D EXPERIMENT MODEL', controls:'Experiment controls', live:'LIVE INPUT', formula:'PHYSICS RELATIONSHIP', graph:'LIVE GRAPH', graphAxis:'PARAMETER vs RESULT',
    reset:'Reset', pause:'Pause', play:'Play', view:'View controls', fullscreen:'Fullscreen', hint:'DRAG TO ROTATE · SCROLL TO ZOOM · USE VIEW CONTROLS',
    status:'INTERACTIVE SIMULATION', result:'Calculated value', info:'What to observe',
    footer:'Educational idealised model · Adjust the controls and observe the 3D model and graph · Not a laboratory measurement device',
    back:'Library', rotation:'ROTATION', zoomIn:'Zoom +', zoomOut:'Zoom −', home:'Reset view', soundOn:'Sound: On', soundOff:'Sound: Off',
    studyTitle:'Study note', study:'This is an idealised educational model. Fixed conditions are stated with the equation. Use SI units and check the stated assumptions when interpreting the result.', brand:'PHYSICS SIMULATION TOOLS', resultUnit:'Calculated in',
    curve:'Relationship curve', current:'Current value', modelLegend:'Simulation model', graphLabel:'Parameter', guideTitle:'How to investigate', guide1:'Change one variable at a time using the controls.', guide2:'Observe the 3D apparatus and the live graph.', guide3:'Compare the displayed result with the equation and stated assumptions.', unavailable:'3D graphics are unavailable. Enable WebGL or use a modern browser.'
  },
  si: {
    model:'ත්‍රිමාණ පරීක්ෂණ ආකෘතිය', controls:'පරීක්ෂණ පාලක', live:'සජීවී ආදාන', formula:'භෞතික සම්බන්ධතාව', graph:'සජීවී ප්‍රස්ථාරය', graphAxis:'පරාමිතිය හා ප්‍රතිඵලය',
    reset:'නැවත සකසන්න', pause:'විරාමය', play:'ආරම්භ කරන්න', view:'දර්ශන පාලක', fullscreen:'සම්පූර්ණ තිරය', hint:'කරකැවීමට ඇදගෙන යන්න · විශාල කිරීමට අනුචලනය කරන්න · දර්ශන පාලක භාවිත කරන්න',
    status:'අන්තර්ක්‍රියාකාරී අධ්‍යයන ආකෘතිය', result:'ගණනය කළ අගය', info:'නිරීක්ෂණය කළ යුතු දේ',
    footer:'අධ්‍යාපනික ආදර්ශයකි · පාලක වෙනස් කර ත්‍රිමාණ ආකෘතිය හා ප්‍රස්ථාරය නිරීක්ෂණය කරන්න · සැබෑ මිනුම් උපකරණයක් නොවේ',
    back:'ප්‍රධාන පිටුව', rotation:'කරකැවීම', zoomIn:'විශාල කරන්න', zoomOut:'කුඩා කරන්න', home:'මුල් දර්ශනය', soundOn:'ශබ්දය: ක්‍රියාත්මකයි', soundOff:'ශබ්දය: අක්‍රියයි',
    studyTitle:'අධ්‍යයන සටහන', study:'මෙය අධ්‍යාපනික ආදර්ශයකි. සමීකරණයේ දක්වා ඇති ස්ථිර කොන්දේසි සලකන්න. ප්‍රතිඵල අර්ථ දැක්වීමේදී SI ඒකක සහ අදාළ උපකල්පන පරීක්ෂා කරන්න.', brand:'භෞතික විද්‍යා අනුකරණ මෙවලම්', resultUnit:'ගණනයේ ඒකකය',
    curve:'සම්බන්ධතා වක්‍රය', current:'වත්මන් අගය', modelLegend:'අධ්‍යයන ආකෘතිය', graphLabel:'පරාමිතිය', guideTitle:'පරීක්ෂණය සිදු කරන ආකාරය', guide1:'පාලක භාවිතයෙන් එක් වරකට එක් විචල්‍යයක් පමණක් වෙනස් කරන්න.', guide2:'ත්‍රිමාණ උපකරණය සහ සජීවී ප්‍රස්ථාරය නිරීක්ෂණය කරන්න.', guide3:'ලැබෙන ප්‍රතිඵලය සමීකරණය සහ දක්වා ඇති උපකල්පන සමඟ සසඳන්න.', unavailable:'ත්‍රිමාණ රූප සකස් කළ නොහැක. WebGL සක්‍රිය කරන්න හෝ නවීන බ්‍රවුසරයක් භාවිත කරන්න.'
  }
};

function n(v) { return Number.isFinite(v) ? v : 0; }
function fmt(v) {
  if (typeof v === 'string') return v;
  if (!Number.isFinite(v)) return '—';
  const x = Math.abs(v);
  if ((x >= 1e5) || (x > 0 && x < 1e-3)) return v.toExponential(3);
  return String(Number(v.toPrecision(5)));
}
function value(a, b) {
  const t = data.calcType || 'product';
  const safe = x => Math.max(Math.abs(x), 1e-30);
  switch (t) {
    case 'convert': return a * b;
    case 'sigfig': return Number(a).toPrecision(Math.max(1, Math.min(8, Math.round(b))));
    case 'dimensions': return `[M]^${Math.round(a)} [L]^${Math.round(b)} [T]^-2`;
    case 'uncertainty': return Math.abs(b) / safe(a) * 100;
    case 'vector-resultant': return Math.hypot(a, b);
    case 'vector-components': return Math.hypot(a * Math.cos(b*Math.PI/180), a * Math.sin(b*Math.PI/180));
    case 'uniform-motion': return a * b;
    case 'relative-speed': return a - b;
    case 'projectile-range': return a*a*Math.sin(2*b*Math.PI/180)/C.g;
    case 'newton-second': return a*b;
    case 'friction': return Math.abs(a*b);
    case 'force-resultant': return Math.hypot(a,b);
    case 'torque': return a*b;
    case 'centre-mass': return b/(a+b);
    case 'potential-energy': return a*C.g*b;
    case 'elastic-collision': return ((a-b)*2 + 2*b*(-1))/(a+b);
    case 'momentum': return a*b;
    case 'centripetal-force': return a*a/b;
    case 'rotational-dynamics': return a*b;
    case 'moment-inertia': return a*b*b;
    case 'angular-momentum': return a*b;
    case 'spring-period': return 2*Math.PI*Math.sqrt(a/safe(b));
    case 'pendulum-period': return 2*Math.PI*Math.sqrt(a/safe(b));
    case 'damped-amplitude': return Math.exp(-Math.max(0,a)*Math.max(0,b));
    case 'forced-response': return a/safe(b);
    case 'resonance': { const r=a/safe(b),Q=5; return 1/Math.sqrt((1-r*r)**2+(r/Q)**2); }
    case 'wave-speed': return a*b;
    case 'string-wave-speed': return Math.sqrt(a/safe(b));
    case 'sound-wavelength': return b/safe(a);
    case 'angular-frequency': return 2*Math.PI*a;
    case 'phase-difference': return 2*Math.PI*a/safe(b);
    case 'standing-frequency': return Math.round(a)*100/(2*safe(b));
    case 'beats': return Math.abs(a-b);
    case 'doppler': return a*343/Math.max(1,343-b);
    case 'sound-intensity': return a/(4*Math.PI*b*b);
    case 'em-wave-length': return C.c/safe(a);
    case 'heat-energy': return a*4200*b;
    case 'linear-expansion': return 12e-6*a*b;
    case 'latent-heat': return a*b;
    case 'heat-conduction': return a*b;
    case 'wien': return b/safe(a);
    case 'gas-state': return a*b/1000;
    case 'boyle': return a*b;
    case 'charles-law': return a*b/300;
    case 'pressure-law': return a*b/300;
    case 'ideal-gas': return a*8.314462618*b/0.0246;
    case 'kinetic-gas-pressure': return a*b*b/3;
    case 'state-of-matter': return 1.5*C.kB*a;
    case 'gravity-force': return C.G*a*b;
    case 'gravity-field': return C.G*a/(b*b);
    case 'gravity-potential': return -C.G*a/safe(b);
    case 'orbital-speed': return Math.sqrt(C.G*a/safe(b));
    case 'kepler-period': return 2*Math.PI*Math.sqrt(b*b*b/(C.G*safe(a)));
    case 'escape-velocity': return Math.sqrt(2*C.G*a/safe(b));
    case 'coulomb-force': return C.k*Math.abs(a*b)*1e-12/(.1*.1);
    case 'electric-field': return C.k*Math.abs(a)*1e-6/(b*b);
    case 'electric-potential': return C.k*a*1e-6/safe(b);
    case 'dipole-moment': return a*1e-6*b;
    case 'capacitance': return C.eps0*a/safe(b*1e-3)*1e12;
    case 'capacitor-charge': return a*b;
    case 'electromagnet-field': return C.mu0*a*b/.1;
    case 'magnetic-force': return a*b;
    case 'cyclotron-radius': return a*1e6/(C.e*safe(b));
    case 'magnetic-flux': return a*b;
    case 'faraday-emf': return a*b;
    case 'generator-emf': return .01*a*b;
    case 'transformer-voltage': return a*b;
    case 'ohms-law': return a/safe(b);
    case 'ohms-voltage': return a*b;
    case 'wire-resistance': return 1.7e-8*a/safe(b*1e-6);
    case 'electric-power': return a*b;
    case 'electric-energy': return a*b*60;
    case 'rc-time-constant': return a*b;
    case 'ac-rms': return a/Math.sqrt(2);
    case 'semiconductor-conductivity': return a*C.e*b;
    case 'diode-current': { const vt=C.kB*b/C.e; return 1e-9*(Math.exp(Math.min(35,a/safe(vt)))-1); }
    case 'diode-circuit-current': return Math.max(0,(a-.7)/safe(b));
    case 'half-wave-average': return a/Math.PI;
    case 'full-wave-average': return 2*a/Math.PI;
    case 'transistor-current': return a*b/1000;
    case 'logic-and': return (a>=.5 && b>=.5)?1:0;
    case 'logic-xor': return ((a>=.5)!==(b>=.5))?1:0;
    case 'hooke': return a*b;
    case 'stress': return a/safe(b);
    case 'young-modulus': return (a/(1e-6*safe(b*1e-3)))/1e9;
    case 'bulk-modulus': return Math.abs(a)/safe(b);
    case 'shear-modulus': return a/safe(b);
    case 'surface-force': return a*b;
    case 'capillary-rise': return 2*a/(998*C.g*safe(b*1e-3));
    case 'viscous-shear': return a*b;
    case 'stokes-drag': return 6*Math.PI*a*(b*1e-3)*0.01;
    case 'terminal-velocity': return 2*(a*1e-3)**2*1000*C.g/(9*safe(b));
    case 'pressure': return a/safe(b);
    case 'buoyancy': return a*C.g*b;
    case 'hydrostatic-pressure': return a*C.g*b;
    case 'flow-rate': return a*b;
    case 'bohr-energy': return -b/(a*a);
    case 'rutherford': { const theta=Math.max(1,Math.min(179,a))*Math.PI/360; return 1/(Math.max(b,.01)**2*Math.pow(Math.max(Math.sin(theta),1e-6),4)); }
    case 'photon-energy': return a*b;
    case 'photoelectric': return Math.max(0,(C.h*a*1e14/C.e)-b);
    case 'debroglie': return b/safe(a);
    case 'xray-wavelength': return b*C.c/(C.e*a*1e3)*1e9;
    case 'radioactive-decay': return Math.pow(.5,b/safe(a));
    case 'radiometric-age': return a*Math.log(1/safe(b))/Math.LN2;
    case 'binding-energy': return a*931.49410242;
    case 'nucleus-binding-per-nucleon': return a*931.49410242/safe(b);
    case 'mass-energy': return a*b;
    default: return a*b;
  }
}
function displayValue(a,b) {
  if (data.calcType === 'vector-components') {
    const x=a*Math.cos(b*Math.PI/180), y=a*Math.sin(b*Math.PI/180);
    return `Aₓ = ${fmt(x)} · Aᵧ = ${fmt(y)}`;
  }
  return fmt(value(a,b));
}
function unitResult() { return lang==='si' ? (data.resultUnitSi || data.resultUnit || 'SI') : (data.resultUnit || 'SI'); }
function playTone(freq=440, duration=.07, type='sine') {
  if (!soundEnabled) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioContext ||= new AC();
    if (audioContext.state === 'suspended') audioContext.resume();
    const osc=audioContext.createOscillator(), gain=audioContext.createGain(), now=audioContext.currentTime;
    osc.type=type; osc.frequency.setValueAtTime(Math.max(90,Math.min(1200,freq)),now);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+duration+.02);
  } catch (e) { console.warn('Audio is not available in this browser',e); }
}
function applyLanguage() {
  const t=ui[lang], set=(id,txt)=>{const el=$(id);if(el)el.textContent=txt;};
  document.documentElement.lang=lang;
  const title=lang==='si'?(data.titleSi||data.title):data.title;
  const description=lang==='si'?(data.descriptionSi||data.description):data.description;
  document.title=`${title} | PHY tools`;
  set('brandCaption',t.brand);
  set('toolTitle',title);set('toolSubtitle',description);
  set('toolEyebrow',lang==='si'?`${data.unitNameSi||data.unitName} · මෙවලම ${String(data.number).padStart(3,'0')}`:`${data.unitName||'A/L PHYSICS'} · TOOL ${String(data.number).padStart(3,'0')}`);
  set('modelLabel',t.model);set('controlsLabel',t.controls);set('liveLabel',t.live);set('formulaLabel',t.formula);set('graphLabel',t.graph);set('graphAxisLabel',t.graphAxis);
  set('resetBtn',t.reset);set('playBtn',running?t.pause:t.play);set('viewBtn',t.view);set('fullBtn',t.fullscreen);set('toolExitFull',lang==='si'?'සම්පූර්ණ තිරයෙන් ඉවත් වන්න':'Exit fullscreen');set('stageCaption',t.hint);set('statusLabel',t.status);set('infoLabel',t.info);set('footerLabel',t.footer);if($('sceneFallback')?.hidden)set('sceneFallback',t.unavailable);
  set('backLink','← '+t.back);set('cameraTitle',t.rotation);set('zoomPlus',t.zoomIn);set('zoomMinus',t.zoomOut);set('cameraReset',t.home);
  set('langBtn',lang==='en'?'සිංහල':'English');set('soundBtn',soundEnabled?t.soundOn:t.soundOff);
  set('legendModel',t.modelLegend);set('legendInteractive',lang==='en'?'3D · Interactive':'ත්‍රිමාණ · අන්තර්ක්‍රියාකාරී');
  set('guideTitle',t.guideTitle);
  const guide=$('guideList');if(guide)guide.innerHTML=[t.guide1,t.guide2,t.guide3].map(x=>`<li>${x}</li>`).join('');
  set('curveLegend',t.curve);set('currentLegend',t.current);set('graphXAxis',t.graphLabel);set('studyNoteTitle',t.studyTitle);set('studyNoteText',t.study);
  set('metricALabel',lang==='si'?(data.aLabelSi||data.aLabel):(data.aLabel||'Parameter A'));
  set('metricBLabel',lang==='si'?(data.bLabelSi||data.bLabel):(data.bLabel||'Parameter B'));
  set('metricResultLabel',lang==='si'?(data.resultLabelSi||t.result):(data.resultLabel||t.result));
  set('metricAUnit',data.aUnit||'SI');set('metricBUnit',data.bUnit||'SI');set('metricResultUnit',lang==='si'?(data.resultUnitSi||data.resultUnit||'SI'):(data.resultUnit||'SI'));
  set('equation',lang==='si'?(data.formulaSi||data.formula):data.formula);
  set('equationSub',description);
  const customObserve=lang==='si'?(data.observeSi||''):(data.observeEn||'');
  set('infoText',customObserve||(lang==='si'
    ?`${data.titleSi||data.title} සඳහා ${data.aLabelSi||'පළමු පරාමිතිය'} සහ ${data.bLabelSi||'දෙවන පරාමිතිය'} වෙනස් කර ${data.formulaSi||data.formula} අනුව ලැබෙන ප්‍රතිඵලය නිරීක්ෂණය කරන්න.`
    :`For ${data.title}, vary ${data.aLabel||'Parameter A'} and ${data.bLabel||'Parameter B'}. Observe the model and compare the result with ${data.formula||'the stated relationship'}.`));
}
function setupControls() {
  const specs=[
    {id:'a',en:data.aLabel||'Parameter A',si:data.aLabelSi||'පළමු පරාමිතිය',unit:data.aUnit||'',min:R[0],max:R[1],step:R[2],value:D[0]},
    {id:'b',en:data.bLabel||'Parameter B',si:data.bLabelSi||'දෙවන පරාමිතිය',unit:data.bUnit||'',min:R[3],max:R[4],step:R[5],value:D[1]}
  ];
  $('controlMount').innerHTML='';
  specs.forEach((s)=>{
    const wrap=document.createElement('div');wrap.className='tool-control';
    wrap.innerHTML=`<div class="tool-control-row"><label id="label-${s.id}" for="range-${s.id}"></label><output id="read-${s.id}">${fmt(s.value)} ${s.unit}</output></div><input class="tool-range" id="range-${s.id}" type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}"><div class="tool-range-labels"><span>${fmt(s.min)} ${s.unit}</span><span>${fmt(s.max)} ${s.unit}</span></div>`;
    $('controlMount').append(wrap);
    $(`range-${s.id}`).addEventListener('input',e=>{
      const v=Number(e.target.value);state[s.id]=v;$(`read-${s.id}`).textContent=`${fmt(v)} ${s.unit}`;refresh();playTone(260+Math.min(760,Math.abs(v)*12),.045,'sine');
    });
  });
  applyControlLanguage();
}
function applyControlLanguage(){
  $('label-a').textContent=lang==='si'?(data.aLabelSi||'පළමු පරාමිතිය'):(data.aLabel||'Parameter A');
  $('label-b').textContent=lang==='si'?(data.bLabelSi||'දෙවන පරාමිතිය'):(data.bLabel||'Parameter B');
}
function refresh() {
  if(simulation) simulation.setState({...state,running});
  const raw=displayValue(state.a,state.b), val=Number(value(state.a,state.b));
  $('metricA').textContent=fmt(state.a);$('metricB').textContent=fmt(state.b);$('metricResult').textContent=raw;
  $('resultValue').textContent=typeof raw==='string'&&raw.includes('=')?raw:`${raw} ${unitResult()}`;
  $('resultLabel').textContent=lang==='si'?(data.resultLabelSi||ui.si.result):(data.resultLabel||ui.en.result);
  drawGraph();
}
function drawGraph(){
  const c=$('toolChart'),ctx=c?.getContext?.('2d');if(!ctx)return;const W=c.width,H=c.height,p={l:48,r:14,t:13,b:34},x0=p.l,y0=H-p.b,x1=W-p.r,y1=p.t;
  ctx.clearRect(0,0,W,H);ctx.strokeStyle='rgba(170,195,216,.15)';ctx.lineWidth=1;ctx.font='10px system-ui';ctx.fillStyle='#8197aa';ctx.textAlign='right';
  for(let i=0;i<=4;i++){const y=y1+(y0-y1)*i/4;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();ctx.fillText(String(4-i),x0-8,y+3);}
  for(let i=0;i<=5;i++){const x=x0+(x1-x0)*i/5;ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y0);ctx.stroke();}
  const vals=[];for(let i=0;i<=70;i++){const a=R[0]+(R[1]-R[0])*i/70;const v=value(a,state.b);vals.push(typeof v==='number'&&Number.isFinite(v)?v:0);}
  const abs=vals.map(v=>Math.abs(v)),lo=Math.min(...abs),hi=Math.max(...abs),span=Math.max(1e-12,hi-lo);
  ctx.beginPath();ctx.strokeStyle='#4ba6ff';ctx.lineWidth=2.7;vals.forEach((v,i)=>{const x=x0+(x1-x0)*i/70,y=y0-((Math.abs(v)-lo)/span)*(y0-y1)*.86-(y0-y1)*.07;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();
  const idx=Math.max(0,Math.min(70,Math.round((state.a-R[0])/(R[1]-R[0]||1)*70))),v=vals[idx],cy=y0-((Math.abs(v)-lo)/span)*(y0-y1)*.86-(y0-y1)*.07,cx=x0+(x1-x0)*idx/70;
  ctx.beginPath();ctx.arc(cx,cy,5.5,0,Math.PI*2);ctx.fillStyle='#83ccff';ctx.fill();ctx.strokeStyle='#e6f5ff';ctx.lineWidth=1.5;ctx.stroke();
  ctx.textAlign='center';ctx.fillStyle='#a9bac8';ctx.fillText(ui[lang].graphLabel,(x0+x1)/2,H-8);
}
function syncFull(){
  const active=!!(document.fullscreenElement||document.webkitFullscreenElement||$('stage').classList.contains('fallback-fullscreen'));
  $('toolApp').classList.toggle('tool-fullscreen',active);document.body.classList.toggle('has-fallback-fullscreen',$('stage').classList.contains('fallback-fullscreen'));
  $('toolExitFull').style.display=active?'block':'none';setTimeout(()=>window.dispatchEvent(new Event('resize')),100);
}
async function toggleFull(){
  const stage=$('stage');
  if(stage.classList.contains('fallback-fullscreen')){stage.classList.remove('fallback-fullscreen');syncFull();return;}
  if(document.fullscreenElement){try{await document.exitFullscreen();}catch(_){}syncFull();return;}
  if(stage.requestFullscreen){try{await stage.requestFullscreen();syncFull();return;}catch(_){}}
  stage.classList.add('fallback-fullscreen');syncFull();
}

setupControls();
applyLanguage();
$('toolTitle').textContent=lang==='si'?(data.titleSi||data.title):data.title;
function showSceneError(error) {
  const fallback = $('sceneFallback');
  if (!fallback) return;
  const detail = `${error?.name || 'Error'}: ${error?.message || String(error)}`;
  fallback.replaceChildren();
  const message = document.createElement('div');
  message.className = 'scene-error-message';
  message.textContent = lang === 'si'
    ? 'ත්‍රිමාණ ආකෘතිය ආරම්භ කළ නොහැකි විය. පාලක සහ ගණනය කිරීම් තවදුරටත් භාවිත කළ හැක.'
    : 'The 3D model could not start. Controls and calculations remain available.';
  const diagnostic = document.createElement('code');
  diagnostic.className = 'scene-error-detail';
  diagnostic.textContent = detail;
  const hint = document.createElement('small');
  hint.textContent = lang === 'si' ? 'ත්‍රිමාණ එන්ජිම CDN මූලාශ්‍ර තුනකින් load කිරීමට උත්සාහ කරයි. අවසාන දෝෂය පහතින් ඇත.' : 'The 3D engine tries three independent CDN sources. The final diagnostic is shown below.';
  const stack = document.createElement('details');
  stack.className = 'scene-error-stack';
  const summary = document.createElement('summary');
  summary.textContent = lang === 'si' ? 'වැඩිදුර තාක්ෂණික විස්තර' : 'Technical details';
  const pre = document.createElement('pre');
  pre.textContent = String(error?.stack || detail).slice(0, 2400);
  stack.append(summary, pre);
  fallback.append(message, diagnostic, hint, stack);
  fallback.hidden = false;
  fallback.style.display = 'flex';
  fallback.style.flexDirection = 'column';
  fallback.style.alignItems = 'center';
  fallback.style.justifyContent = 'center';
  fallback.style.gap = '8px';
  console.error('PHY 3D engine error:', error);
}
$('scene').addEventListener('phy-3d-error', event => showSceneError(event.detail));
$('scene').addEventListener('webglcontextlost', event => {
  event.preventDefault();
  showSceneError(new Error('WebGL context lost while rendering the simulation.'));
});
try {
  const { createPhysicsScene } = await import('./physics-engine.js');
  simulation = createPhysicsScene($('scene'), data, state);
} catch(error) {
  showSceneError(error);
}
refresh();
$('resetBtn').addEventListener('click',()=>{
  state={a:Number(D[0]),b:Number(D[1])};$('range-a').value=state.a;$('range-b').value=state.b;
  $('read-a').textContent=`${fmt(state.a)} ${data.aUnit||''}`;$('read-b').textContent=`${fmt(state.b)} ${data.bUnit||''}`;
  running=true;simulation?.setState({...state,running});$('playBtn').textContent=ui[lang].pause;refresh();playTone(440,.09,'triangle');
});
$('playBtn').addEventListener('click',()=>{running=simulation?.toggle()??!running;$('playBtn').textContent=running?ui[lang].pause:ui[lang].play;playTone(running?660:330,.09,'triangle');});
$('viewBtn').addEventListener('click',()=>{$('cameraPad').classList.toggle('open');$('viewBtn').classList.toggle('active');playTone(520,.045);});
$('soundBtn').addEventListener('click',async()=>{
  soundEnabled=!soundEnabled;
  if(soundEnabled){const AC=window.AudioContext||window.webkitAudioContext;if(AC){audioContext ||= new AC();try{await audioContext.resume();}catch(_){} playTone(720,.12,'sine');}else soundEnabled=false;}
  $('soundBtn').textContent=soundEnabled?ui[lang].soundOn:ui[lang].soundOff;$('soundBtn').setAttribute('aria-pressed',String(soundEnabled));
});
document.querySelectorAll('[data-cam]').forEach(b=>b.addEventListener('click',()=>{if(!simulation)return;const v=b.dataset.cam;if(v==='left')simulation.rotate(-.22,0);if(v==='right')simulation.rotate(.22,0);if(v==='up')simulation.rotate(0,-.17);if(v==='down')simulation.rotate(0,.17);if(v==='in')simulation.zoom(.86);if(v==='out')simulation.zoom(1.16);if(v==='home')simulation.resetView();playTone(480,.04);}));
$('fullBtn').addEventListener('click',toggleFull);$('toolExitFull').addEventListener('click',toggleFull);
document.addEventListener('fullscreenchange',syncFull);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('stage').classList.contains('fallback-fullscreen')){$('stage').classList.remove('fallback-fullscreen');syncFull();}});
$('langBtn').addEventListener('click',()=>{lang=lang==='en'?'si':'en';try{localStorage.setItem('phy-lang',lang);}catch(_){}applyLanguage();applyControlLanguage();refresh();try{parent.postMessage({type:'phy-language-change',language:lang},'*')}catch(_){} });
$('logoutBtn').hidden=true;

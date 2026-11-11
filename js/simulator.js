const $ = id => document.getElementById(id);
const data = JSON.parse($('tool-data').textContent);
const C = { G: 6.67430e-11, k: 8.9875517923e9, e: 1.602176634e-19, h: 6.62607015e-34, c: 299792458, kB: 1.380649e-23, eps0: 8.8541878128e-12, mu0: 1.25663706212e-6, g: 9.80665 };
const R = data.ranges || [0, 10, .1, 0, 10, .1];
const D = data.defaults || [1, 1];
let state = { a: Number(D[0]), b: Number(D[1]) }, simulation = null, running = true;
let lang = 'en', soundEnabled = false, audioContext = null, animationSpeed = 1, graphAxis = 'a', savedReadings = [];
const MAX_SAVED_READINGS = 8;
try { lang = localStorage.getItem('phy-lang') === 'si' ? 'si' : 'en'; } catch (_) { lang = 'en'; }

const ui = {
  en: {
    model:'3D EXPERIMENT MODEL', controls:'Experiment controls', live:'LIVE INPUT', formula:'PHYSICS RELATIONSHIP', graph:'LIVE GRAPH', graphAxis:'PARAMETER vs RESULT',
    reset:'Reset', pause:'Pause', play:'Play', view:'View controls', fullscreen:'Fullscreen', hint:'DRAG TO ROTATE · SCROLL TO ZOOM · USE VIEW CONTROLS',
    status:'INTERACTIVE SIMULATION', result:'Calculated value', info:'What to observe',
    footer:'Educational idealised model · Adjust the controls and observe the 3D model and graph · Not a laboratory measurement device',
    back:'Library', rotation:'ROTATION', zoomIn:'Zoom +', zoomOut:'Zoom −', home:'Reset view', soundOn:'Sound: On', soundOff:'Sound: Off',
    studyTitle:'Study note', study:'This is an idealised educational model. Fixed conditions are stated with the equation. Use SI units and check the stated assumptions when interpreting the result.', brand:'PHYSICS SIMULATION TOOLS', resultUnit:'Calculated in',
    curve:'Relationship curve', current:'Current value', saved:'Saved readings', modelLegend:'Simulation model', graphLabel:'Parameter', guideTitle:'How to use this simulator', howWorksTitle:'How this simulator works', modelNoteTitle:'Model and assumptions', presetTitle:'QUICK TEST PRESETS', low:'Low', reference:'Reference', high:'High', speed:'Animation speed', record:'＋ Record reading', clear:'Clear readings', savedCount:'saved', graphA:'A ↔ Result', graphB:'B ↔ Result', guide1:'Change one variable at a time using the controls.', guide2:'Observe the 3D apparatus and the live graph.', guide3:'Compare the displayed result with the equation and stated assumptions.', unavailable:'3D graphics are unavailable. Enable WebGL or use a modern browser.'
  },
  si: {
    model:'ත්‍රිමාණ පරීක්ෂණ ආකෘතිය', controls:'පරීක්ෂණ පාලක', live:'සජීවී ආදාන', formula:'භෞතික සම්බන්ධතාව', graph:'සජීවී ප්‍රස්ථාරය', graphAxis:'පරාමිතිය හා ප්‍රතිඵලය',
    reset:'නැවත සකසන්න', pause:'විරාමය', play:'ආරම්භ කරන්න', view:'දර්ශන පාලක', fullscreen:'සම්පූර්ණ තිරය', hint:'කරකැවීමට ඇදගෙන යන්න · විශාල කිරීමට අනුචලනය කරන්න · දර්ශන පාලක භාවිත කරන්න',
    status:'අන්තර්ක්‍රියාකාරී අධ්‍යයන ආකෘතිය', result:'ගණනය කළ අගය', info:'නිරීක්ෂණය කළ යුතු දේ',
    footer:'අධ්‍යාපනික ආදර්ශයකි · පාලක වෙනස් කර ත්‍රිමාණ ආකෘතිය හා ප්‍රස්ථාරය නිරීක්ෂණය කරන්න · සැබෑ මිනුම් උපකරණයක් නොවේ',
    back:'ප්‍රධාන පිටුව', rotation:'කරකැවීම', zoomIn:'විශාල කරන්න', zoomOut:'කුඩා කරන්න', home:'මුල් දර්ශනය', soundOn:'ශබ්දය: ක්‍රියාත්මකයි', soundOff:'ශබ්දය: අක්‍රියයි',
    studyTitle:'අධ්‍යයන සටහන', study:'මෙය අධ්‍යාපනික ආදර්ශයකි. සමීකරණයේ දක්වා ඇති ස්ථිර කොන්දේසි සලකන්න. ප්‍රතිඵල අර්ථ දැක්වීමේදී SI ඒකක සහ අදාළ උපකල්පන පරීක්ෂා කරන්න.', brand:'භෞතික විද්‍යා අනුකරණ මෙවලම්', resultUnit:'ගණනයේ ඒකකය',
    curve:'සම්බන්ධතා වක්‍රය', current:'වත්මන් අගය', saved:'සුරැකි අගයන්', modelLegend:'අධ්‍යයන ආකෘතිය', graphLabel:'පරාමිතිය', guideTitle:'මෙම අනුකරණය භාවිත කරන ආකාරය', howWorksTitle:'මෙම අනුකරණය ක්‍රියා කරන ආකාරය', modelNoteTitle:'ආකෘතිය සහ උපකල්පන', presetTitle:'ඉක්මන් පරීක්ෂණ අගයන්', low:'අඩු', reference:'මූලික', high:'වැඩි', speed:'සජීවිකරණ වේගය', record:'＋ අගය සටහන් කරන්න', clear:'සටහන් මකන්න', savedCount:'ක් සුරැකී ඇත', graphA:'A ↔ ප්‍රතිඵලය', graphB:'B ↔ ප්‍රතිඵලය', guide1:'පාලක භාවිතයෙන් එක් වරකට එක් විචල්‍යයක් පමණක් වෙනස් කරන්න.', guide2:'ත්‍රිමාණ ආකෘතිය සහ සජීවී ප්‍රස්ථාරය නිරීක්ෂණය කරන්න.', guide3:'ලැබෙන ප්‍රතිඵලය සමීකරණය සහ දක්වා ඇති උපකල්පන සමඟ සසඳන්න.', unavailable:'ත්‍රිමාණ රූප සකස් කළ නොහැක. WebGL සක්‍රිය කරන්න හෝ නවීන බ්‍රවුසරයක් භාවිත කරන්න.'
  }
};

function n(v) { return Number.isFinite(v) ? v : 0; }
const SUPER_DIGITS = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺'};
function superscriptExponent(value) { return String(value).split('').map(ch => SUPER_DIGITS[ch] || ch).join(''); }
function formatPowers(text) {
  return String(text ?? '').replace(/\^(-?\d+)(?![\w])/g, (_, exponent) => superscriptExponent(exponent));
}
function fmt(v) {
  if (typeof v === 'string') return formatPowers(v);
  if (!Number.isFinite(v)) return '—';
  const x = Math.abs(v);
  if ((x >= 1e5) || (x > 0 && x < 1e-3)) {
    const [mantissa, exponent] = v.toExponential(3).split('e');
    return `${Number(mantissa)} × 10${superscriptExponent(Number(exponent))}`;
  }
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
    case 'gas-state': return a*b; // kPa·L is numerically equal to J
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
    case 'diode-current': { const vt=C.kB*b/C.e; return 1e-12*(Math.exp(Math.min(35,a/safe(vt)))-1); } // I0 = 1 pA
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
let frequencyVoices = [];
let lastUiSound = Object.create(null);
function playTone(freq=440, duration=.07, type='sine', offset=0, volume=.035) {
  if (!soundEnabled) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioContext ||= new AC();
    if (audioContext.state === 'suspended') audioContext.resume();
    const osc=audioContext.createOscillator(), gain=audioContext.createGain();
    const now=audioContext.currentTime+Math.max(0,offset);
    osc.type=type; osc.frequency.setValueAtTime(Math.max(60,Math.min(1800,freq)),now);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+duration+.025);
  } catch (e) { console.warn('Audio is not available in this browser',e); }
}
const UI_SOUNDS = {
  sliderA:[[285,.035,'sine']], sliderB:[[430,.04,'triangle']],
  play:[[660,.055,'triangle'],[880,.085,'sine']], pause:[[330,.09,'triangle']],
  reset:[[720,.055,'triangle'],[520,.055,'triangle',.07],[360,.10,'sine',.14]],
  view:[[540,.05,'sine']], soundOn:[[620,.05,'sine'],[830,.09,'sine',.07]], soundOff:[[390,.06,'triangle'],[250,.08,'sine',.07]],
  cameraLeft:[[360,.04,'sine']], cameraRight:[[470,.04,'sine']], cameraUp:[[610,.055,'triangle']], cameraDown:[[290,.055,'triangle']],
  zoomIn:[[760,.05,'sine']], zoomOut:[[240,.07,'sine']], cameraHome:[[430,.05,'triangle'],[650,.07,'sine',.07]],
  fullscreen:[[780,.07,'sine']], language:[[520,.05,'triangle'],[700,.07,'sine',.07]],
  record:[[920,.08,'sine']], clear:[[230,.06,'triangle'],[310,.08,'sine',.07]], remove:[[260,.045,'triangle']],
  graphA:[[420,.05,'sine']], graphB:[[570,.05,'triangle']],
  presetLow:[[250,.07,'sine']], presetDefault:[[490,.07,'triangle']], presetHigh:[[820,.07,'sine']],
  nudgeAMinus:[[230,.04,'triangle']], nudgeAPlus:[[350,.04,'sine']], nudgeBMinus:[[470,.04,'triangle']], nudgeBPlus:[[620,.04,'sine']],
  speedHalf:[[300,.05,'triangle']], speedNormal:[[500,.05,'sine']], speedDouble:[[820,.05,'sawtooth']]
};
function playUISound(action, throttle=false) {
  if (!soundEnabled) return;
  const now=performance.now();
  if (throttle && now-(lastUiSound[action]||0)<105) return;
  lastUiSound[action]=now;
  const pattern=UI_SOUNDS[action] || UI_SOUNDS.view;
  pattern.forEach(([f,d,type,offset=0])=>playTone(f,d,type,offset,.026));
}
function scaledFrequency(rawHz) {
  let hz=Number(rawHz);
  if (!Number.isFinite(hz) || hz<=0) return null;
  if (hz>=20 && hz<=20000) return {hz,shift:0};
  let shifted=hz, octaves=0;
  while (shifted<220 && octaves<64) { shifted*=2; octaves++; }
  while (shifted>880 && octaves>-64) { shifted/=2; octaves--; }
  return {hz:shifted,shift:octaves};
}
function frequencySpec() {
  const id=String(data.id||'').toLowerCase();
  const aLabel=String(data.aLabel||'').toLowerCase(), bLabel=String(data.bLabel||'').toLowerCase();
  const aUnit=String(data.aUnit||'').toLowerCase(), bUnit=String(data.bUnit||'').toLowerCase();
  const aIsFreq=/hz/.test(aUnit)||/frequency|freq/.test(aLabel);
  const bIsFreq=/hz/.test(bUnit)||/frequency|freq/.test(bLabel);
  const scaleFor=unit=>(/10\s*[¹1]4|10\^14|10¹⁴/.test(unit)?1e14:1);
  if ((id.includes('beats') || id.includes('forced-oscillation') || id.includes('resonance')) && aIsFreq && bIsFreq) return {hz:[state.a,state.b],label:id.includes('beats')?'beats':'frequency-pair'};
  if (id.includes('doppler') && aIsFreq) {
    const source=state.a*scaleFor(aUnit), speed=Math.max(-100,Math.min(100,state.b));
    return {hz:[source*343/Math.max(1,343-speed)],label:'doppler',source,velocity:speed};
  }
  if (aIsFreq) return {hz:[state.a*scaleFor(aUnit)],label:'frequency'};
  if (bIsFreq) return {hz:[state.b*scaleFor(bUnit)],label:'frequency'};
  return null;
}
function stopFrequencyVoices() {
  if (!audioContext || !frequencyVoices.length) return;
  const now=audioContext.currentTime;
  for (const voice of frequencyVoices) {
    try { voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(.0001,now,.025);voice.osc.stop(now+.12); } catch(_) {}
  }
  frequencyVoices=[];
}
function updateFrequencyAudio() {
  const hint=$('soundHint'), spec=frequencySpec();
  if (!spec) {
    stopFrequencyVoices();
    if (hint) hint.textContent = soundEnabled ? (lang==='si'?'මෙම මෙවලමට Hz ශ්‍රව්‍ය සංඥාවක් නොමැත; පාලක ශබ්ද භාවිත වේ.':'This tool has no frequency audio; control sounds remain available.') : '';
    return;
  }
  const audible=spec.hz.map(scaledFrequency);
  if (hint) {
    const physical=spec.hz.map(v=>`${fmt(v)} Hz`).join(' + ');
    const mapped=audible.map(v=>v?`${fmt(v.hz)} Hz`: '—').join(' + ');
    const shifted=audible.some(v=>v && v.shift!==0);
    hint.textContent = !soundEnabled
      ? (lang==='si'?`Hz ශබ්දයට Sound On කරන්න · ${physical}`:`Turn Sound On to hear · ${physical}`)
      : shifted
        ? (lang==='si'?`භෞතික සංඛ්‍යාතය: ${physical} · ඇසෙන නිරූපණය: ${mapped} (octave shift)`:`Physical frequency: ${physical} · Audible representation: ${mapped} (octave shifted)`)
        : (lang==='si'?`ඇසෙන සංඛ්‍යාතය: ${physical}`:`Audible frequency: ${physical}`);
  }
  if (!soundEnabled || !running || !audioContext || audioContext.state==='closed') { stopFrequencyVoices(); return; }
  try {
    if (audioContext.state==='suspended') audioContext.resume();
    const count=audible.length;
    if (frequencyVoices.length!==count) {
      stopFrequencyVoices();
      for (let i=0;i<count;i++) {
        const osc=audioContext.createOscillator(),gain=audioContext.createGain();
        osc.type='sine';osc.frequency.value=audible[i]?.hz||440;gain.gain.value=.0001;
        osc.connect(gain);gain.connect(audioContext.destination);osc.start();
        frequencyVoices.push({osc,gain});
      }
    }
    const now=audioContext.currentTime;
    frequencyVoices.forEach((voice,i)=>{
      const hz=audible[i]?.hz||440;
      voice.osc.frequency.setTargetAtTime(Math.max(20,Math.min(20000,hz)),now,.045);
      voice.gain.gain.setTargetAtTime(count===2 ? .018 : .026,now,.06);
    });
  } catch(error) { console.warn('Frequency audio could not be updated',error); }
}
function applyLanguage() {
  const t=ui[lang], set=(id,txt)=>{const el=$(id);if(el)el.textContent=txt;};
  document.documentElement.lang=lang;
  const title=lang==='si'?(data.titleSi||data.title):data.title;
  const description=lang==='si'?(data.descriptionSi||data.description):data.description;
  document.title=`${title} | PHY tools`;
  set('brandCaption',t.brand);
  set('toolTitle',formatPowers(title));set('toolSubtitle',formatPowers(description));
  set('toolEyebrow',lang==='si'?`${data.unitNameSi||data.unitName} · මෙවලම ${String(data.number).padStart(3,'0')}`:`${data.unitName||'A/L PHYSICS'} · TOOL ${String(data.number).padStart(3,'0')}`);
  set('modelLabel',t.model);set('controlsLabel',t.controls);set('liveLabel',t.live);set('formulaLabel',t.formula);set('graphLabel',t.graph);set('graphAxisLabel',t.graphAxis);
  set('resetBtn',t.reset);set('playBtn',running?t.pause:t.play);set('viewBtn',t.view);set('fullBtn',t.fullscreen);set('toolExitFull',lang==='si'?'සම්පූර්ණ තිරයෙන් ඉවත් වන්න':'Exit fullscreen');set('stageCaption',t.hint);set('statusLabel',t.status);set('infoLabel',t.info);set('footerLabel',t.footer);if($('sceneFallback')?.hidden)set('sceneFallback',t.unavailable);
  set('backLink','← '+t.back);set('cameraTitle',t.rotation);set('zoomPlus',t.zoomIn);set('zoomMinus',t.zoomOut);set('cameraReset',t.home);
  set('langBtn',lang==='en'?'සිංහල':'English');set('soundBtn',soundEnabled?t.soundOn:t.soundOff);if($('soundHint'))$('soundHint').textContent='';
  set('legendModel',t.modelLegend);set('legendInteractive',lang==='en'?'3D · Interactive':'ත්‍රිමාණ · අන්තර්ක්‍රියාකාරී');
  set('guideTitle',t.guideTitle);set('howWorksTitle',t.howWorksTitle);set('modelNoteTitle',t.modelNoteTitle);set('presetTitle',t.presetTitle);set('speedTitle',t.speed);
  const guide=$('guideList');if(guide){guide.replaceChildren();(lang==='si'?(data.stepsSi||[]):(data.stepsEn||[])).forEach(x=>{const li=document.createElement('li');li.textContent=x;guide.append(li);});}
  set('howWorksText',formatPowers(lang==='si'?(data.howItWorksSi||data.descriptionSi||data.description):(data.howItWorksEn||data.description)));
  set('modelNoteText',formatPowers(lang==='si'?(data.modelNoteSi||ui.si.study):(data.modelNoteEn||ui.en.study)));
  set('curveLegend',t.curve);set('currentLegend',t.current);set('savedLegend',t.saved);set('graphXAxis',t.graphLabel);set('studyNoteTitle',t.studyTitle);set('studyNoteText',t.study);
  set('presetLow',t.low);set('presetDefault',t.reference);set('presetHigh',t.high);set('recordBtn',t.record);set('clearReadingsBtn',t.clear);set('graphAButton',t.graphA);set('graphBButton',t.graphB);
  set('readingCount',`${savedReadings.length} ${t.savedCount}`);
  set('metricALabel',lang==='si'?(data.aLabelSi||data.aLabel):(data.aLabel||'Parameter A'));
  set('metricBLabel',lang==='si'?(data.bLabelSi||data.bLabel):(data.bLabel||'Parameter B'));
  set('metricResultLabel',lang==='si'?(data.resultLabelSi||t.result):(data.resultLabel||t.result));
  set('metricAUnit',formatPowers(data.aUnit||'SI'));set('metricBUnit',formatPowers(data.bUnit||'SI'));set('metricResultUnit',formatPowers(lang==='si'?(data.resultUnitSi||data.resultUnit||'SI'):(data.resultUnit||'SI')));
  set('equation',formatPowers(lang==='si'?(data.formulaSi||data.formula):data.formula));
  set('equationSub',formatPowers(description));
  const customObserve=lang==='si'?(data.observeSi||''):(data.observeEn||'');
  set('infoText',formatPowers(customObserve||(lang==='si'
    ?`${data.titleSi||data.title} සඳහා ${data.aLabelSi||'පළමු පරාමිතිය'} සහ ${data.bLabelSi||'දෙවන පරාමිතිය'} වෙනස් කර ${data.formulaSi||data.formula} අනුව ලැබෙන ප්‍රතිඵලය නිරීක්ෂණය කරන්න.`
    :`For ${data.title}, vary ${data.aLabel||'Parameter A'} and ${data.bLabel||'Parameter B'}. Observe the model and compare the result with ${data.formula||'the stated relationship'}.`)));
}
function setupControls() {
  const specs=[
    {id:'a',en:data.aLabel||'Parameter A',si:data.aLabelSi||'පළමු පරාමිතිය',unit:data.aUnit||'',min:R[0],max:R[1],step:R[2],value:D[0]},
    {id:'b',en:data.bLabel||'Parameter B',si:data.bLabelSi||'දෙවන පරාමිතිය',unit:data.bUnit||'',min:R[3],max:R[4],step:R[5],value:D[1]}
  ];
  $('controlMount').innerHTML='';
  specs.forEach((s)=>{
    const wrap=document.createElement('div');wrap.className='tool-control';
    wrap.innerHTML=`<div class="tool-control-row"><label id="label-${s.id}" for="range-${s.id}"></label><output id="read-${s.id}">${fmt(s.value)} ${formatPowers(s.unit)}</output></div><input class="tool-range" id="range-${s.id}" type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}"><div class="tool-range-labels"><span>${fmt(s.min)} ${formatPowers(s.unit)}</span><span>${fmt(s.max)} ${formatPowers(s.unit)}</span></div>`;
    $('controlMount').append(wrap);
    $(`range-${s.id}`).addEventListener('input',e=>{
      const v=Number(e.target.value);state[s.id]=v;$(`read-${s.id}`).textContent=`${fmt(v)} ${formatPowers(s.unit)}`;document.querySelectorAll('[data-preset]').forEach(x=>x.classList.remove('active'));refresh();playUISound(s.id==='a'?'sliderA':'sliderB',true);
    });
  });
  applyControlLanguage();
}
function applyControlLanguage(){
  $('label-a').textContent=lang==='si'?(data.aLabelSi||'පළමු පරාමිතිය'):(data.aLabel||'Parameter A');
  $('label-b').textContent=lang==='si'?(data.bLabelSi||'දෙවන පරාමිතිය'):(data.bLabel||'Parameter B');
}
function chartNumber(a,b){
  const raw=value(a,b);
  if(typeof raw==='number')return Number.isFinite(raw)?raw:null;
  const numeric=Number(raw);
  if(Number.isFinite(numeric))return numeric;
  // A dimensional formula is symbolic. Plot the exponent-vector magnitude as
  // a clearly labelled visual aid instead of drawing a misleading flat line.
  if(data.calcType==='dimensions')return Math.hypot(Number(a)||0,Number(b)||0);
  return null;
}
function updateMeters(){
  const p=(key,range)=>{const min=Number(range[0]),max=Number(range[1]),v=Number(state[key]);return Math.max(0,Math.min(100,(v-min)/(max-min||1)*100));};
  const a=$('meterA'),b=$('meterB');if(a)a.style.width=p('a',R.slice(0,3))+'%';if(b)b.style.width=p('b',R.slice(3,6))+'%';
  const m=$('meterResult');if(m){const q=chartNumber(state.a,state.b);m.style.width=(q===null?0:Math.max(8,Math.min(100,Math.abs(q)/(Math.abs(q)+1)*100)))+'%';}
}
function refresh() {
  if(simulation) simulation.setState({...state,running,speed:animationSpeed});
  const raw=displayValue(state.a,state.b);
  $('metricA').textContent=fmt(state.a);$('metricB').textContent=fmt(state.b);$('metricResult').textContent=raw;
  $('resultValue').textContent=typeof raw==='string'&&raw.includes('=')?raw:`${raw} ${unitResult()}`;
  $('resultLabel').textContent=lang==='si'?(data.resultLabelSi||ui.si.result):(data.resultLabel||ui.en.result);
  updateMeters();drawGraph();updateFrequencyAudio();
}
function drawGraph(){
  const c=$('toolChart'),ctx=c?.getContext?.('2d');if(!ctx)return;
  const rect=c.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),W=Math.max(300,Math.round(rect.width||600)),H=Math.max(120,Math.round(rect.height||170));
  if(c.width!==Math.round(W*dpr)||c.height!==Math.round(H*dpr)){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const p={l:58,r:14,t:13,b:34},x0=p.l,y0=H-p.b,x1=W-p.r,y1=p.t;
  ctx.strokeStyle='rgba(170,195,216,.14)';ctx.lineWidth=1;ctx.font='10px system-ui';ctx.fillStyle='#8197aa';ctx.textAlign='right';
  const range=graphAxis==='a'?R.slice(0,3):R.slice(3,6),loX=Number(range[0]),hiX=Number(range[1]),fixed=graphAxis==='a'?state.b:state.a;
  const curve=[];for(let i=0;i<=90;i++){const x=loX+(hiX-loX)*i/90;const y=graphAxis==='a'?chartNumber(x,fixed):chartNumber(fixed,x);if(y!==null)curve.push({x,y});}
  if(!curve.length){ctx.fillStyle='#aebdca';ctx.textAlign='center';ctx.font='12px system-ui';ctx.fillText(lang==='si'?'මෙම ප්‍රතිඵලය සංකේතාත්මකය; සමීකරණය සහ ප්‍රතිඵලය බලන්න':'This output is symbolic; use the equation and result display.',W/2,H/2);return;}
  let minY=Math.min(...curve.map(q=>q.y)),maxY=Math.max(...curve.map(q=>q.y));
  for(const q of savedReadings){const y=chartNumber(q.a,q.b);if(y!==null){minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
  const span=maxY-minY||Math.max(1,Math.abs(maxY)*.2),pad=span*.12;minY-=pad;maxY+=pad;
  const X=x=>x0+(x-loX)/(hiX-loX||1)*(x1-x0),Y=y=>y0-(y-minY)/(maxY-minY||1)*(y0-y1);
  for(let i=0;i<=4;i++){const y=y1+(y0-y1)*i/4;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();const val=maxY-(maxY-minY)*i/4;ctx.fillText(fmt(val),x0-7,y+3);}
  for(let i=0;i<=5;i++){const x=x0+(x1-x0)*i/5;ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y0);ctx.stroke();}
  ctx.beginPath();ctx.strokeStyle='#4ba6ff';ctx.lineWidth=2.6;curve.forEach((q,i)=>{const x=X(q.x),y=Y(q.y);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();
  // Mark the current operating point and recorded experiment readings.
  const currentY=chartNumber(state.a,state.b),currentX=graphAxis==='a'?state.a:state.b;
  if(currentY!==null){ctx.beginPath();ctx.arc(X(currentX),Y(currentY),5.4,0,Math.PI*2);ctx.fillStyle='#f6bd65';ctx.fill();ctx.strokeStyle='#fff0d2';ctx.lineWidth=1.2;ctx.stroke();}
  savedReadings.forEach((q)=>{const y=chartNumber(q.a,q.b);if(y===null)return;ctx.beginPath();ctx.arc(X(graphAxis==='a'?q.a:q.b),Y(y),4,0,Math.PI*2);ctx.fillStyle='#9b8cff';ctx.fill();ctx.strokeStyle='#e9e3ff';ctx.lineWidth=1;ctx.stroke();});
  ctx.textAlign='center';ctx.fillStyle='#a9bac8';ctx.font='9px system-ui';
  for(let i=0;i<=5;i++){const x=loX+(hiX-loX)*i/5;ctx.fillText(fmt(x),X(x),H-17);}
  const axisName=graphAxis==='a'?(lang==='si'?(data.aLabelSi||'A'):(data.aLabel||'A')):(lang==='si'?(data.bLabelSi||'B'):(data.bLabel||'B'));
  ctx.fillText(axisName,(x0+x1)/2,H-3);
  const axisTitle=$('graphAxisLabel');if(axisTitle)axisTitle.textContent=`${axisName} ↔ ${lang==='si'?(data.resultLabelSi||'ප්‍රතිඵලය'):(data.resultLabel||'Result')}`;
  const aBtn=$('graphAButton'),bBtn=$('graphBButton');if(aBtn)aBtn.classList.toggle('active',graphAxis==='a');if(bBtn)bBtn.classList.toggle('active',graphAxis==='b');
}
function renderReadings(){
  const mount=$('readingList');if(!mount)return;mount.replaceChildren();
  const t=ui[lang];$('readingCount').textContent=`${savedReadings.length} ${t.savedCount}`;
  savedReadings.forEach((q,index)=>{
    const row=document.createElement('div');row.className='reading-row';
    const a=document.createElement('span');a.textContent=`${lang==='si'?(data.aLabelSi||'A'):(data.aLabel||'A')}: ${fmt(q.a)}`;
    const b=document.createElement('span');b.textContent=`${lang==='si'?(data.bLabelSi||'B'):(data.bLabel||'B')}: ${fmt(q.b)}`;
    const result=document.createElement('strong');result.textContent=fmt(q.result);
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title=lang==='si'?'මෙම අගය ඉවත් කරන්න':'Remove this reading';remove.addEventListener('click',()=>{savedReadings.splice(index,1);renderReadings();drawGraph();playUISound('remove');});
    row.append(a,b,result,remove);mount.append(row);
  });
  drawGraph();
}
function setStateAndControls(next){
  state={...state,...next};
  for(const k of ['a','b']){const range=$(`range-${k}`),read=$(`read-${k}`);if(range)range.value=String(state[k]);if(read)read.textContent=`${fmt(state[k])} ${formatPowers(k==='a'?(data.aUnit||''):(data.bUnit||''))}`;}
  document.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('active',x.dataset.preset==='default'&&Number(state.a)===Number(D[0])&&Number(state.b)===Number(D[1])));
  refresh();
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
refresh();renderReadings();
$('resetBtn').addEventListener('click',()=>{
  state={a:Number(D[0]),b:Number(D[1])};running=true;animationSpeed=1;
  if(simulation?.reset)simulation.reset();
  simulation?.resetView?.();
  simulation?.setState({...state,running,speed:animationSpeed});
  $('playBtn').textContent=ui[lang].pause;
  document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',Number(x.dataset.speed)===1));
  setStateAndControls(state);playUISound('reset');
});
$('playBtn').addEventListener('click',()=>{running=simulation?.toggle()??!running;$('playBtn').textContent=running?ui[lang].pause:ui[lang].play;updateFrequencyAudio();playUISound(running?'play':'pause');});
$('viewBtn').addEventListener('click',()=>{$('cameraPad').classList.toggle('open');$('viewBtn').classList.toggle('active');playUISound('view');});
$('soundBtn').addEventListener('click',async()=>{
  if(soundEnabled){playUISound('soundOff');soundEnabled=false;stopFrequencyVoices();}
  else {const AC=window.AudioContext||window.webkitAudioContext;if(AC){audioContext ||= new AC();try{await audioContext.resume();}catch(_){}soundEnabled=true;playUISound('soundOn');}else soundEnabled=false;}
  $('soundBtn').textContent=soundEnabled?ui[lang].soundOn:ui[lang].soundOff;$('soundBtn').setAttribute('aria-pressed',String(soundEnabled));updateFrequencyAudio();
});
document.querySelectorAll('[data-cam]').forEach(b=>b.addEventListener('click',()=>{if(!simulation)return;const v=b.dataset.cam;if(v==='left')simulation.rotate(-.22,0);if(v==='right')simulation.rotate(.22,0);if(v==='up')simulation.rotate(0,-.17);if(v==='down')simulation.rotate(0,.17);if(v==='in')simulation.zoom(.86);if(v==='out')simulation.zoom(1.16);if(v==='home')simulation.resetView();playUISound(v==='left'?'cameraLeft':v==='right'?'cameraRight':v==='up'?'cameraUp':v==='down'?'cameraDown':v==='in'?'zoomIn':v==='out'?'zoomOut':'cameraHome');}));
$('fullBtn').addEventListener('click',()=>{toggleFull();playUISound('fullscreen');});$('toolExitFull').addEventListener('click',()=>{toggleFull();playUISound('fullscreen');});
document.addEventListener('fullscreenchange',syncFull);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('stage').classList.contains('fallback-fullscreen')){$('stage').classList.remove('fallback-fullscreen');syncFull();}});
$('langBtn').addEventListener('click',()=>{lang=lang==='en'?'si':'en';try{localStorage.setItem('phy-lang',lang);}catch(_){}applyLanguage();applyControlLanguage();renderReadings();refresh();playUISound('language');try{parent.postMessage({type:'phy-language-change',language:lang},'*')}catch(_){} });
$('recordBtn').addEventListener('click',()=>{
  savedReadings.push({a:state.a,b:state.b,result:displayValue(state.a,state.b)});
  if(savedReadings.length>MAX_SAVED_READINGS)savedReadings.shift();
  renderReadings();playUISound('record');
});
$('clearReadingsBtn').addEventListener('click',()=>{savedReadings=[];renderReadings();playUISound('clear');});
document.querySelectorAll('[data-graph-axis]').forEach(btn=>btn.addEventListener('click',()=>{graphAxis=btn.dataset.graphAxis==='b'?'b':'a';drawGraph();playUISound(graphAxis==='a'?'graphA':'graphB');}));
document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{
  const preset=btn.dataset.preset;const next=preset==='low'?{a:Number(R[0]),b:Number(R[3])}:preset==='high'?{a:Number(R[1]),b:Number(R[4])}:{a:Number(D[0]),b:Number(D[1])};
  setStateAndControls(next);document.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('active',x===btn));playUISound(preset==='low'?'presetLow':preset==='high'?'presetHigh':'presetDefault');
}));
document.querySelectorAll('[data-nudge]').forEach(btn=>btn.addEventListener('click',()=>{
  const [key,dir]=btn.dataset.nudge.split(':');const off=key==='a'?0:3,step=Number(R[off+2])||.1,min=Number(R[off]),max=Number(R[off+1]);
  const next={...state,[key]:Math.max(min,Math.min(max,Number((state[key]+Number(dir)*step).toFixed(8))))};setStateAndControls(next);playUISound(key==='a'?(Number(dir)<0?'nudgeAMinus':'nudgeAPlus'):(Number(dir)<0?'nudgeBMinus':'nudgeBPlus'));
}));
document.querySelectorAll('[data-speed]').forEach(btn=>btn.addEventListener('click',()=>{
  animationSpeed=Number(btn.dataset.speed)||1;simulation?.setSpeed?.(animationSpeed);simulation?.setState({speed:animationSpeed});
  document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===btn));playUISound(animationSpeed===.5?'speedHalf':animationSpeed===2?'speedDouble':'speedNormal');
}));
window.addEventListener('resize',()=>drawGraph());
$('logoutBtn').hidden=true;


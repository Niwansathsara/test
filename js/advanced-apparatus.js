/*
 * PHY tools — advanced apparatus layer
 * Procedural, self-contained Three.js geometry: no external model downloads.
 * Each visual family receives lab-grade fixtures, calibrated hardware and
 * a matching apparatus detail set. This is an educational visual layer;
 * the calculation model remains in the main physics engine/catalogue.
 */
export const ADVANCED_VISUAL_FAMILIES = ['atomic','blackbody','buoyancy','calorimetry','capacitor','capillary','centre-mass','charged-particle','circuit','circular-motion','collision','doppler','electric','energy','fluid','forces','gas','gas-state','generator','gravity','hydrostatic','induction','logic','magnetic','measurement','motion','nuclear','oscillator','pendulum','phase-change','photoelectric','pipe-flow','projectile','quantum-interference','rc-circuit','rectifier','rotation','scattering','semiconductor','solid-expansion','solids','sound-intensity','stokes-drag','terminal-fluid','thermal','thermal-conduction','torque','transformer','vector','wave-special','waves','xray'];

export function addAdvancedApparatus(THREE, group, dynamic, meta = {}) {
  const kind = meta.visualType || meta.kind || 'measurement';
  const id = meta.id || '';
  const rig = { kind, id, familyProfile: ADVANCED_VISUAL_FAMILIES.includes(kind), animated: [], dispose: [], waveLine: dynamic.wave || dynamic.specialWave || null };
  const metal = (color=0x9aaabd, roughness=.28, metalness=.82) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const darkMetal = metal(0x344252,.34,.78);
  const chrome = metal(0xc8d5e1,.2,.9);
  const blue = new THREE.MeshStandardMaterial({color:0x247fe0,roughness:.24,metalness:.58,emissive:0x092d68,emissiveIntensity:.22});
  const cyan = new THREE.MeshStandardMaterial({color:0x4dbbff,roughness:.2,metalness:.22,emissive:0x075080,emissiveIntensity:.48});
  const amber = new THREE.MeshStandardMaterial({color:0xf0b45f,roughness:.25,metalness:.5,emissive:0x64320b,emissiveIntensity:.18});
  const red = new THREE.MeshStandardMaterial({color:0xe46e68,roughness:.25,metalness:.45,emissive:0x4e0b0b,emissiveIntensity:.16});
  const glass = new THREE.MeshPhysicalMaterial({color:0x9ed7fa,transparent:true,opacity:.15,roughness:.08,metalness:.08,clearcoat:1,clearcoatRoughness:.08,side:THREE.DoubleSide,depthWrite:false});
  const addMesh=(geo,mat,pos=[0,0,0],rot=null,scale=null)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(...pos);if(rot)m.rotation.set(...rot);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  };
  const cube=(pos,size,mat=darkMetal,edge=true)=>{
    const material=(typeof mat==='number')?metal(mat,.28,.6):mat;
    const m=addMesh(new THREE.BoxGeometry(...size),material,pos);
    if(edge){const e=new THREE.EdgesGeometry(m.geometry,24);const l=new THREE.LineSegments(e,new THREE.LineBasicMaterial({color:0xd7e4f0,transparent:true,opacity:.13}));m.add(l);}
    return m;
  };
  const cyl=(pos,r1,r2,h,mat=chrome,segments=32,rot=null)=>addMesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat,pos,rot);
  const sphere=(pos,r,mat=blue,segments=24)=>addMesh(new THREE.SphereGeometry(r,segments,Math.max(12,Math.floor(segments*.7))),mat,pos);
  const rod=(a,b,r,mat=chrome,segments=16)=>{
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A);
    const m=addMesh(new THREE.CylinderGeometry(r,r,dir.length(),segments),mat,A.clone().add(B).multiplyScalar(.5).toArray());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return m;
  };
  const tube=(pts,r=.018,mat=cyan,segments=96)=>{
    const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
    return addMesh(new THREE.TubeGeometry(curve,segments,r,8,false),mat);
  };
  const torus=(pos,major=.5,tubeRadius=.018,mat=chrome,rot=[0,0,0])=>addMesh(new THREE.TorusGeometry(major,tubeRadius,12,96),mat,pos,rot);
  const ticks=(origin,axis,count=20,length=.10,spacing=.1,mat=chrome,depthAxis=[0,0,.02])=>{
    const arr=[];for(let i=0;i<=count;i++){
      const p=[origin[0]+axis[0]*i*spacing,origin[1]+axis[1]*i*spacing,origin[2]+axis[2]*i*spacing];
      arr.push(cube([p[0],p[1]+length/2,p[2]],[.012,length,.012],mat,false));
    }return arr;
  };
  const labelPlane=(text,sub='')=>{
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
    const ctx=canvas.getContext('2d');
    const paint=(title,subtitle)=>{
      const grad=ctx.createLinearGradient(0,0,1024,256);grad.addColorStop(0,'#10243a');grad.addColorStop(1,'#1d3d5e');
      ctx.fillStyle=grad;ctx.fillRect(0,0,1024,256);
      ctx.strokeStyle='#73baff';ctx.lineWidth=8;ctx.strokeRect(7,7,1010,242);
      ctx.fillStyle='#f3f8ff';ctx.font='bold 66px Arial';ctx.fillText(String(title||'PHY LAB').slice(0,28),32,112,960);
      ctx.fillStyle='#94cfff';ctx.font='bold 30px Arial';ctx.fillText(String(subtitle||'ADVANCED PHYSICS LAB').slice(0,48),34,184,950);
    };
    paint(text,sub);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    const m=addMesh(new THREE.PlaneGeometry(1.05,.263),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}),[0,-.565,.895]);
    rig.labelPanel={canvas,ctx,texture:tex,paint,lastLanguage:null};
    rig.dispose.push(()=>{tex.dispose();m.material.dispose();m.geometry.dispose();});return m;
  };
  const meter=(pos,label='LIVE',scale=1)=>{
    const housing=cyl(pos,.27*scale,.27*scale,.075*scale,darkMetal,48,[Math.PI/2,0,0]);
    const face=addMesh(new THREE.CircleGeometry(.228*scale,48),new THREE.MeshStandardMaterial({color:0xe8f2fa,roughness:.85,metalness:.02}),[pos[0],pos[1],pos[2]+.043*scale]);
    torus([pos[0],pos[1],pos[2]+.048*scale],.238*scale,.018*scale,chrome);
    const marks=[];for(let i=0;i<=20;i++){const a=(-.78+i/20*1.56)*Math.PI;const r=.18*scale;const x=pos[0]+Math.cos(a)*r,y=pos[1]+Math.sin(a)*r;marks.push(cube([x,y,pos[2]+.052*scale],[.008*scale,.035*scale,.008*scale],darkMetal,false));}
    const needle=cube([pos[0],pos[1],pos[2]+.067*scale],[.012*scale,.16*scale,.012*scale],red,false);needle.position.set(pos[0],pos[1],pos[2]+.069*scale);needle.rotation.z=-Math.PI/4;
    const hub=sphere([pos[0],pos[1],pos[2]+.077*scale],.027*scale,chrome,16);
    rig.meters ||= [];rig.meters.push({needle,pos,scale,label,housing,face,hub});return needle;
  };
  const screw=(x,z)=>{
    cyl([x,-.645,z],.055,.055,.025,chrome,24);
    cube([x,-.628,z],[.055,.008,.012],darkMetal,false);
  };

  // Premium laboratory base treatment. The original family apparatus stays
  // intact; this layer adds machined edges, feet, fasteners and a model plate.
  for(const x of [-1.68,1.68])for(const z of [-.62,.62]){
    cyl([x,-.805,z],.105,.12,.15,darkMetal,32);
    cyl([x,-.88,z],.12,.12,.035,metal(0x202a35,.55,.35),32);
    screw(x,z);
  }
  cube([0,-.675,.83],[3.48,.035,.035],chrome,false);
  cube([0,-.675,-.83],[3.48,.035,.035],chrome,false);
  cube([-1.76,-.675,0],[.035,.035,1.62],chrome,false);
  cube([1.76,-.675,0],[.035,.035,1.62],chrome,false);
  // Fine calibration scale on the near edge of the base.
  for(let i=0;i<=32;i++){
    const x=-1.58+i*.09875,major=i%4===0;
    cube([x,-.644,.795],[major?.018:.009,major?.075:.038,.009],major?chrome:metal(0x6e8398,.4,.55),false);
  }
  const plaque=cube([0,-.565,.865],[1.10,.30,.065],darkMetal,false);plaque.rotation.x=-.09;
  labelPlane(meta.title||meta.id||'PHY tools',meta.unitName||'ADVANCED PHYSICS LAB');

  // Compact live instrument/display, mounted to the bench rather than floating
  // in front of the working model. It mirrors the two independent inputs.
  const displayHousing=cube([1.28,-.43,.77],[.78,.43,.16],darkMetal,false);displayHousing.rotation.x=-.16;
  const displayCanvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  let displayTexture=null,displayCtx=null;
  if(displayCanvas){displayCanvas.width=768;displayCanvas.height=384;displayCtx=displayCanvas.getContext('2d');displayTexture=new THREE.CanvasTexture(displayCanvas);displayTexture.colorSpace=THREE.SRGBColorSpace;const face=addMesh(new THREE.PlaneGeometry(.70,.34),new THREE.MeshBasicMaterial({map:displayTexture,toneMapped:false}),[1.28,-.42,.86],[-.16,0,0]);rig.dispose.push(()=>{displayTexture.dispose();face.geometry.dispose();face.material.dispose();});}
  rig.display={ctx:displayCtx,texture:displayTexture,last:-1,key:''};

  const framed=new Set(['measurement','motion','projectile','forces','torque','rotation','oscillator','pendulum','waves','wave-special','thermal','gas','gas-state','calorimetry','phase-change','thermal-conduction','solids','fluid','capillary','stokes-drag','terminal-fluid','buoyancy','hydrostatic','pipe-flow','circuit','semiconductor','rectifier','induction','generator','transformer','rc-circuit','capacitor','charged-particle','photoelectric','xray','scattering','quantum-interference']);
  if(framed.has(kind)){
    // Rear optical-bench gantry with adjustable clamps and cross rail.
    for(const x of [-1.82,1.82]){
      rod([x,-.62,-.54],[x,1.27,-.54],.035,darkMetal);
      cyl([x,-.51,-.54],.07,.07,.10,chrome,24);
      for(let j=0;j<11;j++)cube([x, -.34+j*.14,-.49],[.095,.012,.085],j%2?metal(0x71869b):chrome,false);
    }
    rod([-1.82,1.27,-.54],[1.82,1.27,-.54],.045,chrome);
    rod([-1.82,-.25,-.54],[1.82,-.25,-.54],.022,darkMetal);
    rig.frame=true;
  }

  // Measurement instruments and standards.
  if(kind==='measurement'){
    cube([0,-.28,.42],[2.75,.10,.18],darkMetal);
    cube([-.62,-.20,.42],[.09,.52,.23],chrome);
    cube([.62,-.20,.42],[.09,.52,.23],chrome);
    cube([-.62,.055,.42],[.72,.035,.24],blue);
    rod([-.92,-.02,.43],[.92,-.02,.43],.025,chrome);
    for(let i=0;i<=40;i++)cube([-.90+i*.045,-.125,.535],[.012,i%5===0?.13:.065,.009],i%5===0?amber:chrome,false);
    rig.movingJaw=cube([0,-.18,.55],[.07,.38,.08],amber,false);
    rig.meters=[];meter([1.38,.58,.42],'READ',.8);
  }
  // Vector geometry: protractor ring, radial angle graduations and bearing pin.
  else if(kind==='vector'){
    torus([0,-.06,.12],1.03,.018,amber);
    for(let i=0;i<37;i++){const a=i*Math.PI/36;const r=i%3===0?1.03:.99;rod([Math.cos(a)*r,Math.sin(a)*r,.13],[Math.cos(a)*(r-.08),Math.sin(a)*(r-.08),.13],.009,i%3===0?amber:chrome,8);}
    sphere([0,0,.18],.12,chrome);
  }
  // Motion benches: optical gates, photodiodes, encoder rail and cart wheels.
  else if(kind==='motion'||kind==='projectile'||kind==='collision'||kind==='doppler'){
    for(const x of [-1.25,0,1.25]){
      rod([x,-.53,.46],[x,.34,.46],.025,chrome);
      cube([x,.30,.46],[.31,.12,.12],blue);
      sphere([x,.30,.54],.052,cyan,16);
      rod([x-.12,.22,.45],[x+.12,.22,.45],.012,amber,10);
    }
    for(let i=0;i<20;i++)cube([-1.62+i*.17,-.48,.50],[.012,.035,.012],i%5===0?amber:chrome,false);
    if(kind==='projectile'){
      const barrel=addMesh(new THREE.CylinderGeometry(.12,.12,.85,48,1,true),metal(0x637d98,.25,.75),[-1.28,.15,.24],[0,0,-Math.PI/2]);
      torus([-1.70,.15,.24],.13,.018,amber,[0,Math.PI/2,0]);rig.launcher=barrel;
    }
  }
  // Centre of mass: calibrated balance beam, low-friction pivot and mass pans.
  else if(kind==='centre-mass'){
    rod([-1.55,-.20,.35],[1.55,-.20,.35],.045,chrome);
    const fulcrum=cyl([0,-.39,.35],.16,.24,.34,blue,40);
    const beam=rod([-1.42,-.18,.35],[1.42,-.18,.35],.035,amber);
    for(const x of [-1.18,1.18]){rod([x,-.18,.35],[x,-.52,.35],.018,chrome);cyl([x,-.56,.35],.20,.20,.08,darkMetal,32);}
    rig.balanceBeam=beam;rig.balancePans=[-1.18,1.18];rig.fulcrum=fulcrum;
    meter([1.36,.54,.40],'CM',.76);
  }
  // Force / energy: load cell, compression platform and strain indicator.
  else if(kind==='forces'||kind==='energy'){
    cube([-1.30,.43,.34],[.50,.50,.42],darkMetal);
    rod([-1.30,.70,.34],[-1.30,1.04,.34],.055,chrome);
    cube([-1.30,1.08,.34],[.34,.13,.34],blue);
    for(let i=0;i<5;i++)torus([-1.30,.83+i*.045,.34],.09,.012,amber);
    meter([1.35,.48,.48],'FORCE',.82);
    rig.loadCell=cube([-1.30,.35,.34],[.28,.13,.30],blue);
  }
  // Rotational dynamics: precision encoder ring, hub bearings and radial marks.
  else if(kind==='rotation'||kind==='torque'||kind==='circular-motion'){
    torus([0,.035,.10],.91,.035,chrome,[Math.PI/2,0,0]);
    for(let i=0;i<48;i++){const a=i*Math.PI/24,r=.92,len=i%4===0?.13:.065;rod([Math.cos(a)*r,.13,Math.sin(a)*r],[Math.cos(a)*(r-len),.13,Math.sin(a)*(r-len)],.012,i%4===0?amber:chrome,8);}
    cyl([0,.05,0],.22,.22,.38,chrome,48);
    for(const x of [-.32,.32])cyl([x,-.22,.50],.09,.09,.36,darkMetal,24);
    rig.encoder=torus([0,.04,.12],.98,.012,amber,[Math.PI/2,0,0]);
    meter([1.38,.57,.36],'RPM',.72);
  }
  // Spring and pendulum lab: optical stand, graduated rule and angle arc.
  else if(kind==='oscillator'||kind==='pendulum'){
    cube([-1.58,.45,.30],[.20,2.10,.24],darkMetal);
    cube([-1.58,1.53,.30],[.38,.10,.34],chrome);
    rod([-1.45,-.49,.35],[-1.45,1.40,.35],.018,chrome,12);
    for(let i=0;i<=20;i++)cube([-1.39,-.48+i*.09,.38],[.08,i%5===0?.018:.009,.012],i%5===0?amber:chrome,false);
    if(kind==='pendulum'){
      const pts=[];for(let i=0;i<=36;i++){const a=-Math.PI*.42+i/36*Math.PI*.84;pts.push([Math.sin(a)*1.0,1.02-Math.cos(a)*1.0,.42]);}
      tube(pts,.014,amber,120);
      for(let i=0;i<=18;i++){const a=-Math.PI*.42+i/18*Math.PI*.84;rod([Math.sin(a)*1.0,1.02-Math.cos(a)*1.0,.43],[Math.sin(a)*.91,1.02-Math.cos(a)*.91,.43],.009,chrome,8);}
      rig.angleGuide=torus([0,1.02,.41],1.0,.009,amber);
    }
  }
  // Wave systems: driver, tension clamps, calibrated string supports and speaker.
  else if(kind==='waves'||kind==='wave-special'||kind==='sound-intensity'){
    cube([-1.62,.12,.28],[.34,.64,.42],darkMetal);
    cyl([-1.42,.16,.28],.16,.16,.18,blue,40,[0,0,Math.PI/2]);
    const driver=rod([-1.22,.10,.28],[-.95,.10,.28],.045,amber);
    rig.waveDriver=driver;
    cube([1.50,.12,.28],[.32,.62,.42],darkMetal);
    sphere([1.49,.20,.50],.14,cyan,32);
    for(let i=0;i<10;i++)cube([-1.2+i*.27,-.45,.42],[.012,.075,.012],i%2?chrome:amber,false);
    rig.waveBeads=[];for(let i=0;i<81;i++){const bead=sphere([-1.2+i*.03,0,.34],.021,i%8===0?amber:cyan,10);rig.waveBeads.push(bead);}
    if(kind==='sound-intensity'){
      const cone=addMesh(new THREE.ConeGeometry(.28,.48,48,1,true),metal(0x7f93a8,.22,.68),[1.48,.20,.35],[0,0,-Math.PI/2]);rig.soundCone=cone;
    }
  }
  // Gas laws and thermal systems: pressure transducer, thermowell and heater.
  else if(kind==='gas'||kind==='gas-state'||kind==='thermal'||kind==='calorimetry'||kind==='phase-change'||kind==='thermal-conduction'||kind==='blackbody'){
    meter([1.35,.79,.34],kind==='gas'?'PRESS':kind==='blackbody'?'TEMP':'HEAT',.82);
    rod([.95,-.40,.43],[.95,.75,.43],.027,chrome);
    sphere([.95,-.43,.43],.07,red,20);
    for(let i=0;i<12;i++)cube([1.04,-.34+i*.085,.44],[.08,.009,.012],i%3===0?amber:chrome,false);
    if(kind==='gas'||kind==='gas-state'){
      torus([0,.05,.04],.73,.025,chrome,[Math.PI/2,0,0]);
      rig.pressureDial=meter([1.35,.79,.34],'PRESS',.82);
    }
    if(kind==='thermal'||kind==='calorimetry'||kind==='phase-change'){
      for(let i=0;i<4;i++)torus([-.35,-.59+i*.045,.34],.36-i*.025,.018,amber,[Math.PI/2,0,0]);
    }
  }
  // Gravity: starfield, orbit reference rings, satellite and orbital plane markings.
  else if(kind==='gravity'){
    rig.stars=[];for(let i=0;i<56;i++){
      const phi=(i/56)*Math.PI*2,rr=2.2+(i%4)*.19,y=Math.sin(i*7.31)*1.15;
      const s=sphere([Math.cos(phi)*rr,y,Math.sin(phi)*rr],.018+(i%3)*.006,i%4===0?amber:cyan,8);rig.stars.push(s);
    }
    torus([0,0,0],1.72,.009,cyan,[Math.PI/2,0,0]);
    const sat=cube([1.7,.12,.0],[.22,.12,.22],chrome);cube([1.7,.12,-.20],[.54,.025,.20],blue,false);cube([1.7,.12,.20],[.54,.025,.20],blue,false);rig.satellite=sat;
  }
  // Electrostatics and capacitors: insulated posts, electrode mounts and field guides.
  else if(kind==='electric'||kind==='capacitor'){
    for(const x of [-.9,.9]){
      cyl([x,-.23,.42],.07,.10,.60,blue,24);
      cyl([x,.08,.42],.24,.24,.055,chrome,40,[Math.PI/2,0,0]);
      sphere([x,.12,.42],.075,x<0?red:blue,20);
    }
    if(kind==='capacitor'){
      for(let i=0;i<7;i++)rod([-.34,-.55+i*.18,.55],[.34,-.55+i*.18,.55],.009,cyan,8);
      rig.fieldGlow=cube([0,.10,.50],[.55,1.15,.025],new THREE.MeshBasicMaterial({color:0x36aaff,transparent:true,opacity:.07}),false);
    }
  }
  // Magnetic and induction benches: solenoid windings and compass.
  else if(kind==='magnetic'||kind==='induction'||kind==='charged-particle'){
    for(let i=0;i<15;i++){
      const x=-.58+i*.083;
      const coil=torus([x,.10,.16],kind==='charged-particle'?.72:.38,.022,i%2?amber:chrome,[0,Math.PI/2,0]);
      (rig.coils ||= []).push(coil);
    }
    const compass=cyl([1.22,.30,.50],.22,.22,.075,darkMetal,40,[Math.PI/2,0,0]);
    torus([1.22,.30,.55],.20,.018,chrome);
    rig.compassNeedle=cube([1.22,.30,.60],[.025,.29,.018],red,false);
    sphere([1.22,.30,.62],.035,amber,12);
  }
  // Circuit/electronics benches: breadboard, banana sockets, panel meters and LEDs.
  else if(kind==='circuit'||kind==='semiconductor'||kind==='rectifier'||kind==='logic'||kind==='rc-circuit'||kind==='generator'||kind==='transformer'){
    cube([0,-.42,.35],[2.55,.12,.90],metal(0x344657,.5,.35));
    for(let row=0;row<5;row++)for(let col=0;col<18;col++){
      const x=-1.18+col*.139,z=.06+row*.135;
      cyl([x,-.342,z],.018,.018,.012,metal(0x0e1822,.55,.25),10);
    }
    for(const x of [-1.36,1.36]){
      cyl([x,.04,.42],.10,.10,.24,red,24);
      cyl([x,-.02,.42],.10,.10,.06,chrome,24);
    }
    meter([-1.35,.65,.44],'V',.75);meter([1.35,.65,.44],'A',.75);
    rig.statusLED=sphere([0,.60,.55],.075,cyan,24);
    rig.ledMat=rig.statusLED.material;
  }
  // Solids: universal tensile-testing frame and extensometer.
  else if(kind==='solids'||kind==='solid-expansion'){
    for(const x of [-.86,.86])rod([x,-.50,.42],[x,1.34,.42],.055,chrome);
    rod([-.88,1.34,.42],[.88,1.34,.42],.085,darkMetal);
    cube([0,.90,.47],[.46,.20,.25],blue);
    cube([0,-.16,.47],[.46,.20,.25],blue);
    rig.specimen=cube([0,.35,.50],[.085,.78,.065],amber,false);
    meter([1.34,.62,.45],'LOAD',.78);
  }
  // Fluid apparatus: glass manometer, taps, graduated tank and valves.
  else if(kind==='fluid'||kind==='capillary'||kind==='stokes-drag'||kind==='terminal-fluid'||kind==='buoyancy'||kind==='hydrostatic'||kind==='pipe-flow'){
    for(let i=0;i<=12;i++)cube([1.18,-.48+i*.095,.54],[.15,.012,.012],i%3===0?amber:chrome,false);
    tube([[1.48,-.50,.38],[1.48,.42,.38],[1.30,.55,.38],[1.12,.42,.38],[1.12,-.50,.38]],.035,cyan,96);
    cyl([1.30,-.52,.38],.12,.12,.10,darkMetal,24);
    meter([1.48,.85,.40],'Pa',.72);
    rig.fluidColumn=[];
    for(let i=0;i<8;i++)rig.fluidColumn.push(sphere([1.30,-.38+i*.105,.43],.025,cyan,12));
  }
  // Atomic and nuclear: evacuated detector chamber, energy ruler and scintillator.
  else if(kind==='atomic'||kind==='nuclear'||kind==='scattering'||kind==='photoelectric'||kind==='xray'||kind==='quantum-interference'){
    cube([1.43,.12,.30],[.18,1.30,.68],metal(0x455a70,.25,.6));
    for(let i=0;i<12;i++)cube([1.32,-.47+i*.105,.67],[.08,.012,.018],i%3===0?amber:chrome,false);
    rig.detector=sphere([1.42,.15,.70],.10,cyan,24);
    torus([0,.05,-.46],1.35,.012,amber,[Math.PI/2,0,0]);
    if(kind==='scattering'){
      cube([-.10,.05,.46],[.07,1.22,.12],amber,false);
      rig.foil=cube([-.10,.05,.53],[.012,1.2,.025],chrome,false);
    }
    if(kind==='quantum-interference'){
      cube([-.32,.05,.46],[.09,1.35,.13],darkMetal);
      cube([1.42,.05,.50],[.045,1.42,.08],metal(0xb6c8d8,.45,.3));
    }
  }

  // Tool-specific physical accents to distinguish otherwise related lessons.
  if(id==='photoelectric-effect-simulator'){
    rig.uvLamp=sphere([-1.35,.38,.45],.16,new THREE.MeshStandardMaterial({color:0x8b70f4,emissive:0x4524aa,emissiveIntensity:1.2}),32);
    for(let i=0;i<5;i++)tube([[-1.2,.34-i*.13,.45],[-.7,.34-i*.13,.45],[-.12,.34-i*.13,.45]],.012,new THREE.MeshBasicMaterial({color:0x8b79ff}),48);
  }
  if(id==='x-ray-production-simulator'){
    rig.shield=cube([-.5,.10,-.42],[2.5,1.5,.06],glass,false);
    for(let i=0;i<5;i++)tube([[.65,.2-i*.12,.1],[1.2,.35-i*.12,.1],[1.75,.52-i*.12,.1]],.012,cyan,48);
  }
  if(id==='blackbody-spectrum-simulator'){
    rig.spectralScreen=cube([1.36,-.22,.45],[.55,.52,.08],darkMetal,false);
    for(let i=0;i<7;i++)cube([1.13+i*.075,-.30,.50],[.055,.13,.012],[0x7a63ff,0x368fff,0x4fd6ff,0x64df88,0xffd05d,0xff8c4e,0xef5148][i],false);
  }
  return rig;
}

export function updateAdvancedApparatus(THREE, rig, meta={}, state={}, elapsed=0, dt=0) {
  if(!rig)return;
  const a=Number.isFinite(Number(state.a))?Number(state.a):0;
  const b=Number.isFinite(Number(state.b))?Number(state.b):0;
  const c=Number.isFinite(Number(state.c))?Number(state.c):0;
  const R=meta.ranges||[0,1,.01,0,1,.01];
  const norm=(v,min,max)=>THREE.MathUtils.clamp((v-Number(min))/(Number(max)-Number(min)||1),0,1);
  const na=norm(a,R[0],R[1]),nb=norm(b,R[3],R[4]);
  const isSi=state.language==='si';
  if(rig.labelPanel && rig.labelPanel.lastLanguage!==state.language){
    const title=isSi?(meta.titleSi||meta.title||'PHY LAB'):(meta.title||'PHY LAB');
    const unit=isSi?(meta.unitNameSi||meta.unitName||'උසස් භෞතික විද්‍යාගාරය'):(meta.unitName||'ADVANCED PHYSICS LAB');
    rig.labelPanel.paint(title,unit);rig.labelPanel.texture.needsUpdate=true;rig.labelPanel.lastLanguage=state.language;
  }
  const displayTitle=state.language==='si'?(meta.titleSi||meta.title||'අනුකරණය'):(meta.title||'SIMULATION');
  const displayKey=[state.language,a,b,displayTitle,meta.aUnit,meta.bUnit].join('|');
  if(rig.display?.ctx && (displayKey!==rig.display.key || elapsed-rig.display.last>.12)){
    const ctx=rig.display.ctx,tex=rig.display.texture;rig.display.last=elapsed;rig.display.key=displayKey;
    const labelA=isSi?(meta.aLabelSi||'පරාමිතිය A'):(meta.aLabel||'Parameter A');
    const labelB=isSi?(meta.bLabelSi||'පරාමිතිය B'):(meta.bLabel||'Parameter B');
    const title=displayTitle;
    ctx.clearRect(0,0,768,384);ctx.fillStyle='#07111d';ctx.fillRect(0,0,768,384);
    ctx.strokeStyle='#3d83bd';ctx.lineWidth=8;ctx.strokeRect(6,6,756,372);
    ctx.fillStyle='#7bbfff';ctx.font='bold 27px Arial';ctx.fillText(isSi?'PHY LAB  /  සජීවී දත්ත':'PHY LAB  /  LIVE DATA',28,48,710);
    ctx.fillStyle='#eef6ff';ctx.font='bold 29px Arial';ctx.fillText(`${String(labelA).slice(0,16)}: ${Number(a.toPrecision(5))} ${meta.aUnit||''}`,28,126,710);
    ctx.fillText(`${String(labelB).slice(0,16)}: ${Number(b.toPrecision(5))} ${meta.bUnit||''}`,28,194,710);
    ctx.fillStyle='#84d9b2';ctx.font='bold 24px Arial';ctx.fillText(`${String(title).slice(0,34)}`,28,282,710);
    ctx.fillStyle='#8da8c1';ctx.font='20px Arial';ctx.fillText(isSi?'පාලක වෙනස් කර උපකරණයේ වෙනස නිරීක්ෂණය කරන්න':'Change the controls and observe the apparatus',28,330,710);
    tex.needsUpdate=true;
  }
  if(rig.meters?.length){
    for(let i=0;i<rig.meters.length;i++){
      const m=rig.meters[i];
      const ratio=i===0?na:nb;
      m.needle.rotation.z=-1.1+ratio*2.2;
    }
  }
  if(rig.movingJaw)rig.movingJaw.position.x=-.62+na*1.24;
  if(rig.balanceBeam)rig.balanceBeam.rotation.z=(nb-na)*.16;
  if(rig.loadCell){rig.loadCell.scale.y=.85+na*.5;rig.loadCell.position.y=.35-(na-.5)*.06;}
  if(rig.encoder)rig.encoder.rotation.y=elapsed*.18*(Math.sign(b)||1);
  if(rig.waveDriver){rig.waveDriver.position.y=.10+Math.sin(elapsed*(.8+na*7))*.12;}
  if(rig.waveBeads?.length && rig.waveLine?.geometry?.attributes?.position){const pos=rig.waveLine.geometry.attributes.position;for(let i=0;i<rig.waveBeads.length;i++){const idx=Math.round(i*(pos.count-1)/(rig.waveBeads.length-1));const bead=rig.waveBeads[i];bead.position.set(pos.getX(idx),pos.getY(idx),pos.getZ(idx)+.035);}}
  if(rig.pressureDial?.rotation)rig.pressureDial.rotation.z=(na-.5)*.8;
  if(rig.compassNeedle)rig.compassNeedle.rotation.y=(nb-.5)*Math.PI;
  if(rig.statusLED?.material){rig.statusLED.material.emissiveIntensity=.15+Math.abs(Math.sin(elapsed*(1+na*8)))*(.35+na*1.3);}
  if(rig.specimen){rig.specimen.scale.y=.78*(1+na*.035);rig.specimen.scale.x=.085*(1+nb*.025);}
  if(rig.satellite){const angle=elapsed*.35/(.5+nb*2);rig.satellite.position.set(Math.cos(angle)*1.72,.12,Math.sin(angle)*1.72);rig.satellite.rotation.y=-angle;}
  if(rig.detector?.material)rig.detector.material.emissiveIntensity=.15+Math.abs(Math.sin(elapsed*2))*(.35+na*.9);
  if(rig.uvLamp?.material)rig.uvLamp.material.emissiveIntensity=.35+na*1.2;
  if(rig.fluidColumn?.length){for(let i=0;i<rig.fluidColumn.length;i++){const p=rig.fluidColumn[i];p.position.y=-.38+i*.105+Math.sin(elapsed*1.4+i*.55)*(.006+nb*.012);}}
}

// Load Three.js from independent ESM CDNs. This avoids a fragile import-map
// dependency on OrbitControls and retries another provider if one CDN returns
// an invalid response or is blocked on the visitor's network.
async function loadThreeModule(){
 const sources=[
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://esm.sh/three@0.160.0'
 ];
 const failures=[];
 for(const url of sources){
  try{
   const module=await import(url);
   if(module && module.WebGLRenderer && module.Scene && module.PerspectiveCamera) return module;
   throw new Error('The downloaded Three.js module did not expose the expected WebGL classes.');
  }catch(error){failures.push(`${new URL(url).host}: ${error?.message||String(error)}`);}
 }
 throw new Error(`Three.js could not be loaded from the available CDNs. ${failures.join(' | ')}`);
}
const THREE=await loadThreeModule();

// Small built-in orbit controller. Keeping camera interaction inside this
// module removes the separate OrbitControls module as another CDN failure point.
function createOrbitControls(camera,element){
 const target=new THREE.Vector3();
 let activePointer=null,lastX=0,lastY=0;
 const spherical=()=>new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
 const clampDistance=v=>THREE.MathUtils.clamp(v,controls.minDistance,controls.maxDistance);
 const apply=sp=>{
  sp.phi=THREE.MathUtils.clamp(sp.phi,controls.minPolarAngle,controls.maxPolarAngle);
  sp.radius=clampDistance(sp.radius);
  camera.position.setFromSpherical(sp).add(target);
  camera.lookAt(target);
 };
 const onDown=e=>{
  if(e.button!==0 && e.pointerType==='mouse') return;
  activePointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;
  try{element.setPointerCapture(e.pointerId);}catch(_){}
 };
 const onMove=e=>{
  if(activePointer!==e.pointerId)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
  const sp=spherical();sp.theta-=dx*.006;sp.phi+=dy*.006;apply(sp);
 };
 const onUp=e=>{if(activePointer===e.pointerId){activePointer=null;try{element.releasePointerCapture(e.pointerId);}catch(_){}}};
 const onWheel=e=>{
  e.preventDefault();const sp=spherical();sp.radius*=Math.exp(e.deltaY*.001);apply(sp);
 };
 element.addEventListener('pointerdown',onDown);
 element.addEventListener('pointermove',onMove);
 element.addEventListener('pointerup',onUp);
 element.addEventListener('pointercancel',onUp);
 element.addEventListener('wheel',onWheel,{passive:false});
 const controls={
  target,enableDamping:true,dampingFactor:.065,minPolarAngle:.12,maxPolarAngle:Math.PI*.48,
  minDistance:.65,maxDistance:40,
  update(){camera.lookAt(target);},
  dispose(){element.removeEventListener('pointerdown',onDown);element.removeEventListener('pointermove',onMove);element.removeEventListener('pointerup',onUp);element.removeEventListener('pointercancel',onUp);element.removeEventListener('wheel',onWheel);}
 };
 return controls;
}

const mat=(color,roughness=.42,metalness=.28,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const sphereGeo=new THREE.SphereGeometry(.11,18,14);
function mesh(geo,material,parent,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,pos,scale,color,rough=.4,metal=.35){return mesh(new THREE.BoxGeometry(...scale),mat(color,rough,metal),parent,pos);}
function ball(parent,pos,color,r=.11,metal=.12){return mesh(new THREE.SphereGeometry(r,20,16),mat(color,.27,metal,{emissive:color,emissiveIntensity:.12}),parent,pos);}
function line(parent,points,color=0x55aaff,opacity=1,r=.018){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=mesh(new THREE.TubeGeometry(curve,Math.max(32,points.length*8),r,8,false),new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.3,transparent:opacity<1,opacity,emissive:color,emissiveIntensity:.15}),parent);return m;}
function arrow(parent,from,to,color=0x58aaff){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);const h=new THREE.ArrowHelper(d.clone().normalize(),a,d.length(),color,.16,.09);parent.add(h);return h;}
function ring(parent,r,tube,color,pos=[0,0,0],rot=[0,0,0]){const m=mesh(new THREE.TorusGeometry(r,tube,12,80),mat(color,.25,.65),parent,pos);m.rotation.set(...rot);return m;}

export function createPhysicsScene(canvas,meta,initialState={a:1,b:1}){
 let renderer,scene,camera,controls,raf=0,disposed=false,elapsed=0,last=performance.now(),observer=null;
 const group=new THREE.Group(),dynamic={};
 let state={...initialState,running:true};
 const stage=canvas.parentElement||canvas;
 const readStageSize=()=>{
  const rect=stage.getBoundingClientRect();
  return {width:Math.max(1,Math.round(rect.width||canvas.clientWidth||640)),height:Math.max(1,Math.round(rect.height||canvas.clientHeight||360))};
 };
 try{
  const initialSize=readStageSize();
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x11151a);
  scene.fog=new THREE.Fog(0x11151a,12,28);
  camera=new THREE.PerspectiveCamera(48,initialSize.width/initialSize.height,.05,160);
  camera.up.set(0,1,0);
  // Match the verified Boyle's Law WebGL context attributes. A forced
  // high-performance request / opaque context can fail on some integrated GPUs.
  try {
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  } catch(firstError) {
   // Retry with the least demanding context options before reporting an error.
   try { renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true}); }
   catch(secondError) {
    throw new Error(`WebGL renderer creation failed. Standard: ${firstError?.message||firstError}. Compatibility retry: ${secondError?.message||secondError}.`);
   }
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(initialSize.width,initialSize.height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  controls=createOrbitControls(camera,renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xeaf3ff,0x252b34,2.2));
  const key=new THREE.DirectionalLight(0xffffff,2.8);
  key.position.set(3.5,6,4.5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
  const blue=new THREE.PointLight(0x398cff,30,12);blue.position.set(-3,1.5,-2.2);scene.add(blue);
  const rim=new THREE.PointLight(0x9ecbff,16,10);rim.position.set(2.6,2,3);scene.add(rim);
  const floor=mesh(new THREE.PlaneGeometry(200,200),mat(0x191d22,.48,.25),scene,[0,-.88,0]);
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;
  const grid=new THREE.GridHelper(16,32,0x505d6b,0x303943);
  grid.position.y=-.865;grid.material.transparent=true;grid.material.opacity=.14;scene.add(grid);
  scene.add(group);
  const visualType=meta.visualType||meta.kind;
  buildModel(visualType,group,dynamic,meta);
  group.updateMatrixWorld(true);

  // Centre and fit each model independently. The old fixed camera target put
  // taller/off-centre models below the stage on some categories and screens.
  const bounds=new THREE.Box3().setFromObject(group);
  if(bounds.isEmpty()) bounds.setFromCenterAndSize(new THREE.Vector3(0,0,0),new THREE.Vector3(3.6,2.4,1.8));
  bounds.expandByScalar(.12);
  const sphere=bounds.getBoundingSphere(new THREE.Sphere());
  const modelCenter=sphere.center.clone();
  controls.target.copy(modelCenter);
  const viewDirection=new THREE.Vector3(4.6,3.1,6.4).normalize();
  const calcFitDistance=(width,height)=>{
   const vFov=THREE.MathUtils.degToRad(camera.fov);
   const hFov=2*Math.atan(Math.tan(vFov/2)*(width/Math.max(1,height)));
   const limitingFov=Math.max(.18,Math.min(vFov,hFov));
   return Math.max(3.6,(sphere.radius/Math.sin(limitingFov/2))*1.16);
  };
  const fitDistance=calcFitDistance(initialSize.width,initialSize.height);
  camera.position.copy(modelCenter).addScaledVector(viewDirection,fitDistance);
  camera.near=Math.max(.03,fitDistance/250);camera.far=Math.max(120,fitDistance*24);camera.updateProjectionMatrix();
  controls.minDistance=Math.max(.65,Math.min(2.5,sphere.radius*.32));
  controls.maxDistance=Math.max(18,fitDistance*3.2);
  controls.update();

  const onResize=()=>{
   if(disposed)return;
   const {width,height}=readStageSize();
   renderer.setSize(width,height,false);
   camera.aspect=width/height;
   camera.updateProjectionMatrix();
   const minFit=calcFitDistance(width,height);
   const offset=camera.position.clone().sub(controls.target);
   if(offset.length()<minFit){offset.setLength(minFit);camera.position.copy(controls.target).add(offset);}
   controls.minDistance=Math.max(.65,Math.min(2.5,sphere.radius*.32));
   controls.maxDistance=Math.max(18,minFit*3.2);
   controls.update();
  };
  if(typeof ResizeObserver!=='undefined'){
   observer=new ResizeObserver(onResize);observer.observe(stage);
  }else window.addEventListener('resize',onResize);
  function frame(now){
   if(disposed)return;
   raf=requestAnimationFrame(frame);
   try {
    const dt=Math.min(.04,(now-last)/1000||.016);last=now;
    if(state.running)elapsed+=dt;
    updateModel(visualType,dynamic,state,elapsed,dt,meta);
    controls.update();renderer.render(scene,camera);
   } catch(error) {
    disposed=true;cancelAnimationFrame(raf);
    if(observer)observer.disconnect();
    try{controls?.dispose();}catch(_){}
    try{renderer?.dispose();}catch(_){}
    canvas.dispatchEvent(new CustomEvent('phy-3d-error',{detail:error}));
   }
  }
  raf=requestAnimationFrame(frame);
  function rotate(dx,dy){
   const off=camera.position.clone().sub(controls.target);
   const sph=new THREE.Spherical().setFromVector3(off);
   sph.theta-=dx;sph.phi=Math.max(.16,Math.min(Math.PI*.46,sph.phi+dy));
   off.setFromSpherical(sph);camera.position.copy(controls.target).add(off);controls.update();
  }
  function zoom(mult){
   const off=camera.position.clone().sub(controls.target);off.multiplyScalar(mult);
   const len=THREE.MathUtils.clamp(off.length(),controls.minDistance,controls.maxDistance);
   off.setLength(len);camera.position.copy(controls.target).add(off);controls.update();
  }
  return {
   setState(next){state={...state,...next};},
   toggle(){state.running=!state.running;return state.running;},rotate,zoom,
   resetView(){const distance=calcFitDistance(readStageSize().width,readStageSize().height);camera.position.copy(controls.target).addScaledVector(viewDirection,distance);controls.update();},
   dispose(){disposed=true;cancelAnimationFrame(raf);if(observer)observer.disconnect();else window.removeEventListener('resize',onResize);controls.dispose();renderer.dispose();}
  };
 }catch(error){
  console.error("3D scene error",error);
  if(renderer)renderer.dispose();
  if(controls)controls.dispose();
  if(observer)observer.disconnect();
  throw error;
 }
}

function buildModel(kind,g,d,meta={}){
 const steel=mat(0x8795a5,.22,.82),dark=mat(0x27313d,.35,.72),blue=mat(0x247ce0,.23,.62,{emissive:0x092f70,emissiveIntensity:.25}),cyan=mat(0x54bfff,.22,.28,{emissive:0x06365a,emissiveIntensity:.8}),red=mat(0xe56a62,.25,.45,{emissive:0x4b0909,emissiveIntensity:.2}),glass=new THREE.MeshPhysicalMaterial({color:0x91c9ff,metalness:.12,roughness:.08,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false,clearcoat:1});
 const pedestal=box(g,[0,-.73,0],[3.8,.12,1.65],0x252b33,.32,.72);d.pedestal=pedestal;
 if(kind==="measurement"){
  box(g,[0,-.52,0],[4.1,.12,.58],0x29323c,.3,.65);box(g,[0,-.44,0],[4,.025,.52],0x121820,.2,.55);
  for(let i=0;i<=40;i++){const x=-1.9+i*.095;box(g,[x,-.405,.12],[.012,i%10===0?.2:.09,.012],0xb9c7d5,.3,.4);}
  d.cursor=box(g,[.4,-.25,0],[.06,.34,.34],0x248cff,.2,.7);d.reference=box(g,[-1.2,-.24,0],[.055,.32,.32],0xc3d0db,.2,.8);
  for(const x of [-1.9,1.9])box(g,[x,-.3,-.25],[.05,.3,.07],0x637487,.25,.6);
 }else if(kind==="vector"){
  const axes=new THREE.AxesHelper(1.75);g.add(axes);d.v1=arrow(g,[0,0,0],[1.35,0,0],0x55b2ff);d.v2=arrow(g,[1.35,0,0],[1.35,1.2,0],0x75dc97);d.result=arrow(g,[0,0,0],[1.35,1.2,0],0xf1b66c);
  ball(g,[0,0,0],0xe4edf5,.09,.65);
 }else if(kind==="motion"||kind==="projectile"){
  box(g,[0,-.67,0],[4.2,.1,.75],0x3b4653,.3,.62);for(let i=0;i<9;i++)box(g,[-1.9+i*.48,-.59,.39],[.022,.08,.02],0x9eabb8,.4,.5);
  d.moving=ball(g,[-1.5,-.36,0],0x37a3ff,.17,.34);d.trail=line(g,[[ -1.8,-.35,0],[-1,-.35,0],[0,-.35,0],[1,-.35,0],[1.8,-.35,0]],0x409fff,.45,.018);
  if(kind==="projectile"){
   const pts=[];for(let i=0;i<=60;i++){const x=-1.7+i*3.4/60;const t=(x+1.7)/3.4;pts.push([x,-.55+1.45*4*t*(1-t),0]);}d.arc=line(g,pts,0x78dca0,.95,.016);d.launch=arrow(g,[-1.7,-.52,0],[-.9,.12,0],0x78dca0);
  }
 }else if(kind==="forces"||kind==="energy"){
  box(g,[0,-.65,0],[4.2,.12,1],0x4a5561,.36,.64);d.block=box(g,[0,-.28,0],[.65,.62,.65],0x226bd0,.22,.55);d.arrowA=arrow(g,[0,.2,0],[0,1.15,0],0x75dc97);d.arrowB=arrow(g,[.36,-.25,0],[1.2,-.25,0],0xf2a56e);
  if(kind==="energy"){const pts=[];for(let i=0;i<=45;i++){const x=-1.9+i*3.8/45;pts.push([x,-.35+1.2*Math.pow(x/1.9,2),0]);}d.track=line(g,pts,0x83baff,.95,.04);d.block.position.y=.45;}
 }else if(kind==="torque"||kind==="rotation"){
  const disk=mesh(new THREE.CylinderGeometry(.72,.72,.16,64),blue,g,[0,.02,0]);disk.rotation.x=Math.PI/2;d.disk=disk;const axle=mesh(new THREE.CylinderGeometry(.12,.12,1.5,32),steel,g,[0,-.1,0]);axle.rotation.z=Math.PI/2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;line(g,[[0,.02,0],[Math.cos(a)*.64,.02,Math.sin(a)*.64]],0xbedbfa,1,.025);}ball(g,[0,.12,0],0xe4edf5,.16,.72);d.handle=box(g,[.65,.12,0],[.9,.08,.08],0x91a4b8,.22,.78);
  if(kind==="torque")d.force=arrow(g,[1.05,.1,0],[1.05,1.05,0],0x70d795);
 }else if(kind==="oscillator"){
  const anchor=box(g,[-1.58,0,0],[.16,1.1,.85],0x687786,.25,.78);d.mass=box(g,[.65,-.15,0],[.62,.62,.62],0x1d75d7,.22,.58);d.spring=line(g,coilPoints(-1.48,.33,2.0,.12),0xc1ccd7,1,.035);d.massAnchor=anchor;
  if(Math.abs((d.spring.geometry?.parameters?.radius)||.035)<0){}
  if(kind==="oscillator")ring(g,.8,.018,0x3d8fff,[.65,-.15,0],[Math.PI/2,0,0]);
 }else if(kind==="waves"){
  const points=[];for(let i=0;i<=100;i++){const x=-2+i*4/100;points.push(new THREE.Vector3(x,0,0));}const geo=new THREE.BufferGeometry().setFromPoints(points);d.wave=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x57b2ff}));g.add(d.wave);d.waveMaterial=d.wave.material;d.nodeLine=box(g,[0,-.4,0],[4.1,.025,.045],0x657587,.35,.6);d.marker=ball(g,[0,0,0],0x79df9b,.1,.3);
  for(let i=0;i<9;i++)box(g,[-1.8+i*.45,-.5,0],[.012,.12,.08],0xa4b4c4,.4,.4);
 }else if(kind==="thermal"){
  // Energy transfer apparatus: a glass calorimeter, visible water volume,
  // electric heater, thermometer, molecules and heat-flow indicators.
  const glassBeaker=new THREE.MeshPhysicalMaterial({color:0x9bcdf0,metalness:.06,roughness:.08,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false,clearcoat:1});
  const waterMat=new THREE.MeshPhysicalMaterial({color:0x238fd4,metalness:.02,roughness:.13,transparent:true,opacity:.78,side:THREE.DoubleSide,clearcoat:1});
  mesh(new THREE.CylinderGeometry(.78,.72,1.52,64,1,true),glassBeaker,g,[0,.08,0]);
  ring(g,.78,.028,0xb8d4e8,[0,.84,0]);ring(g,.72,.025,0x8aa9c1,[0,-.68,0]);
  box(g,[0,-.73,0],[1.9,.14,1.55],0x344657,.28,.72);
  d.thermalWater=mesh(new THREE.CylinderGeometry(.66,.66,.7,64,1),waterMat,g,[0,-.28,0]);
  d.thermalSurface=mesh(new THREE.CircleGeometry(.66,64),new THREE.MeshStandardMaterial({color:0x8ed5ff,transparent:true,opacity:.48,side:THREE.DoubleSide}),g,[0,.07,0]);d.thermalSurface.rotation.x=-Math.PI/2;
  const heaterMat=new THREE.MeshStandardMaterial({color:0xf08b55,emissive:0xd94822,emissiveIntensity:.7,metalness:.62,roughness:.24});
  d.heater=mesh(new THREE.TorusGeometry(.48,.055,14,72),heaterMat,g,[0,-.62,0]);d.heater.rotation.x=Math.PI/2;
  box(g,[.94,.08,.12],[.055,1.18,.055],0xc4d6e5,.18,.38);
  d.thermometerMercury=box(g,[.94,-.2,.16],[.02,.48,.02],0xf06e62,.2,.2);
  d.thermometerBulb=ball(g,[.94,-.5,.16],0xf06e62,.07,.1);
  d.thermalMolecules=[];
  for(let i=0;i<30;i++){const angle=i*2.399,rad=.12+Math.sqrt((i+.5)/30)*.46,y=-.56+((i*7)%14)*.045;const molecule=ball(g,[Math.cos(angle)*rad,y,Math.sin(angle)*rad],i%4===0?0xffd28a:0x9bdfff,.034,.12);d.thermalMolecules.push({mesh:molecule,phase:i*1.73,rad,angle});}
  d.heatRays=[];
  for(let i=0;i<6;i++){const x=-.5+i*.2;d.heatRays.push(line(g,[[x,-.54,.48],[x,-.28,.48],[x+.08,-.08,.48]],0xffa06b,.8,.018));}
 }else if(kind==="gas"){
  const tube=mesh(new THREE.CylinderGeometry(.68,.68,3.35,64,1,true),glass,g,[0,.05,0]);tube.rotation.z=Math.PI/2;d.tube=tube;
  ring(g,.68,.035,0xb1c2d4,[-1.675,.05,0],[0,Math.PI/2,0]);ring(g,.68,.035,0xb1c2d4,[1.675,.05,0],[0,Math.PI/2,0]);
  d.piston=mesh(new THREE.CylinderGeometry(.61,.61,.16,64),blue,g,[1.35,.05,0]);d.piston.rotation.z=Math.PI/2;
  d.particles=[];for(let i=0;i<38;i++){const p=ball(g,[THREE.MathUtils.randFloat(-1.35,.9),THREE.MathUtils.randFloat(-.42,.52),THREE.MathUtils.randFloat(-.42,.52)],i%3===0?0x9adfff:0x3b9dff,.045,.18);d.particles.push({mesh:p,v:new THREE.Vector3(THREE.MathUtils.randFloatSpread(1),THREE.MathUtils.randFloatSpread(1),THREE.MathUtils.randFloatSpread(1)).normalize()});}
 }else if(kind==="gas-state"){
  const chamberMat=new THREE.MeshPhysicalMaterial({color:0x7cbfe8,transparent:true,opacity:.11,roughness:.1,side:THREE.DoubleSide,depthWrite:false});
  mesh(new THREE.BoxGeometry(2.65,1.75,1.25),chamberMat,g,[0,.02,0]);
  box(g,[0,-.85,0],[2.7,.055,1.3],0x536779,.28,.65);
  for(const x of [-1.33,1.33])box(g,[x,.02,0],[.035,1.78,1.3],0x8298aa,.25,.45);
  for(const z of [-.64,.64])box(g,[0,.02,z],[2.7,1.78,.025],0x8298aa,.25,.45);
  d.stateParticles=[];
  for(let i=0;i<32;i++){
   const gx=(i%4)-1.5,gy=(Math.floor(i/4)%4)-1.5,gz=(Math.floor(i/16)-.5);
   const p=ball(g,[gx*.22,gy*.22,gz*.22],i%4===0?0x9be1ff:0x328fe0,.052,.16);
   d.stateParticles.push({mesh:p,index:i,phase:i*1.731,velocity:new THREE.Vector3(THREE.MathUtils.randFloatSpread(1),THREE.MathUtils.randFloatSpread(1),THREE.MathUtils.randFloatSpread(1))});
  }
  d.stateIndicator=ring(g,.23,.035,0x79dca6,[0,1.05,0],[Math.PI/2,0,0]);
 }else if(kind==="gravity"){
  d.planet=ball(g,[0,0,0],0x277dd7,.55,.45);d.planet.scale.set(1.2,1.2,1.2);ring(g,1.45,.018,0x6baeff,[0,0,0],[Math.PI/2,0,0]);ring(g,2,.012,0x6baeff55,[0,0,0],[Math.PI/2,0,0]);d.moon=ball(g,[1.5,0,0],0xd5e0ed,.17,.55);d.orbit=ring(g,1.5,.012,0x92bde9,[0,0,0],[Math.PI/2,0,0]);for(let j=0;j<6;j++){const a=j*Math.PI/3;arrow(g,[Math.cos(a)*.9,Math.sin(a)*.9,0],[Math.cos(a)*.55,Math.sin(a)*.55,0],0x73aaff);}
 }else if(kind==="electric"){
  d.chargeA=ball(g,[-.9,0,0],0xe76d65,.2,.4);d.chargeB=ball(g,[.9,0,0],0x4b9cff,.2,.4);d.chargePlus=mesh(new THREE.TorusGeometry(.13,.018,8,32),mat(0xffffff,.2,.3),g,[-.9,0,.2]);d.chargePlus.rotation.x=Math.PI/2;d.chargeMinus=box(g,[.9,0,.2],[.22,.035,.035],0xffffff,.2,.2);
  d.fields=[];for(let i=0;i<8;i++){const y=(i-3.5)*.12;d.fields.push(line(g,[[-.75,y,0],[-.25,y*1.7,.1],[.25,y*1.7,.1],[.75,y,0]],0x68baff,.65,.012));}
 }else if(kind==="magnetic"){
  box(g,[-.58,-.05,0],[1.15,.36,.55],0x2774d0,.25,.62);box(g,[.58,-.05,0],[1.15,.36,.55],0xd65e59,.25,.62);box(g,[0,-.05,0],[.08,.37,.57],0xbcc7d3,.25,.65);
  d.fields=[];for(let i=0;i<5;i++){const z=(i-2)*.16;d.fields.push(line(g,[[-1.05,.2,z],[-.85,.83,z],[0,1.05,z],[.85,.83,z],[1.05,.2,z]],0x77baff,.75,.016));d.fields.push(line(g,[[1.05,-.2,z],[.85,-.83,z],[0,-1.05,z],[-.85,-.83,z],[-1.05,-.2,z]],0x77baff,.5,.014));}
 }else if(kind==="circuit"||kind==="semiconductor"){
  box(g,[0,-.48,0],[3.8,.12,1.55],0x202a35,.35,.6);
  const wirePts=[[-1.55,-.3,.32],[-1.55,.35,.32],[-.65,.35,.32],[.65,.35,.32],[1.55,.35,.32],[1.55,-.3,.32],[-1.55,-.3,.32]];d.wire=line(g,wirePts,0xd5a64e,1,.025);
  box(g,[-1.55,-.04,.32],[.38,.72,.22],0x387bc0,.28,.6);for(let i=0;i<3;i++)box(g,[-1.55,-.29+i*.29,.44],[.42,.035,.03],0xb9d5ee,.25,.65);
  d.resistor=box(g,[0,.35,.32],[.65,.24,.28],0xd1b06c,.3,.45);d.bulb=ball(g,[1.55,.3,.32],0xe9cc78,.2,.08);d.bulb.material.emissive=new THREE.Color(0xffb53e);d.bulb.material.emissiveIntensity=.6;
  if(kind==="semiconductor"){
   d.resistor.material.color.setHex(0x458a9b);for(let x=-1.1;x<=1.1;x+=.42)for(let z=-.38;z<=.38;z+=.38){ball(g,[x,.02,z],x<0?0x4b9cff:0xec746b,.055,.2);}box(g,[0,.08,-.55],[.12,.55,.1],0xd4dce6,.22,.65);
  }
 }else if(kind==="solids"){
  box(g,[0,-.55,0],[2.9,.2,1.25],0x3a4652,.32,.7);d.sample=box(g,[0,.15,0],[1.5,.75,.85],0x2b83d9,.26,.52);d.loadArrow=arrow(g,[0,1.1,0],[0,.6,0],0xf1a36c);d.baseArrow=arrow(g,[0,-.55,0],[0,-.1,0],0x78db9b);
 }else if(kind==="fluid"){
  const glassTank=new THREE.MeshPhysicalMaterial({color:0x91c9ff,transparent:true,opacity:.1,roughness:.12,metalness:.12,side:THREE.DoubleSide,depthWrite:false});const tank=mesh(new THREE.BoxGeometry(2.25,2.1,1.35),glassTank,g,[0,.12,0]);d.water=mesh(new THREE.BoxGeometry(2.12,1.05,1.22),new THREE.MeshPhysicalMaterial({color:0x168bdf,transparent:true,opacity:.5,roughness:.12,metalness:.08,clearcoat:1}),g,[0,-.4,0]);d.waterSurface=mesh(new THREE.PlaneGeometry(2.1,1.2),new THREE.MeshStandardMaterial({color:0x5bbcff,transparent:true,opacity:.45,side:THREE.DoubleSide}),g,[0,.12,0]);d.bubbles=[];for(let i=0;i<20;i++)d.bubbles.push(ball(g,[THREE.MathUtils.randFloat(-.9,.9),THREE.MathUtils.randFloat(-.9,.3),THREE.MathUtils.randFloat(-.5,.5)],0x9de2ff,.035,.05));
 }else if(kind==="atomic"||kind==="nuclear"){
  d.nucleons=[];for(let i=0;i<13;i++){const a=i*2.399,r=.2+Math.sqrt(i)*.07;d.nucleons.push(ball(g,[Math.cos(a)*r,Math.sin(a)*r*.8,Math.sin(a*1.7)*.2],i%2?0x4e9eff:0xe16b66,.13,.28));}
  d.orbits=[];for(let i=0;i<3;i++){const r=.85+i*.4;const orb=ring(g,r,.012,0x76baff,[0,0,0],[Math.PI/2+i*.35,.2*i,0]);d.orbits.push(orb);const e=ball(g,[r,0,0],0x78d995,.075,.32);d[`electron${i}`]=e;}
  if(kind==="nuclear"){
   const id=meta.id||'';d.decayType=id.includes('alpha')?'alpha':id.includes('beta')?'beta':id.includes('fission')?'fission':'generic';
   d.emitted=ball(g,[1.85,.5,0],d.decayType==='beta'?0x63c8ff:0xf2c16b,d.decayType==='beta'?.075:.16,.25);
   d.secondaryEmitted=d.decayType==='beta'?ball(g,[1.75,.3,.15],0x98d6ff,.055,.12):null;
   if(d.decayType==='fission'){d.fragmentA=ball(g,[-.45,.05,0],0x5b9ff0,.2,.35);d.fragmentB=ball(g,[.45,.05,0],0xe16d67,.2,.35);d.fissionTracks=[line(g,[[-.4,.05,0],[-1,.3,0],[-1.5,.6,0]],0x7bc9ff,.6,.02),line(g,[[.4,.05,0],[1,-.25,0],[1.5,-.55,0]],0xffa080,.6,.02)];}
   d.energyArrow=arrow(g,[.5,.8,0],[1.6,1.15,0],0xf2c16b);
  }
 }else if(kind==="collision"){
  box(g,[0,-.55,0],[4.0,.16,.9],0x465462,.3,.6);
  d.collA=ball(g,[-1.35,-.22,0],0x328dff,.25,.45);d.collB=ball(g,[1.35,-.22,0],0xef765f,.25,.45);
  d.collTrailA=line(g,[[-1.8,-.22,-.18],[-.8,-.22,-.18]],0x63b5ff,.7,.024);
  d.collTrailB=line(g,[[.8,-.22,.18],[1.8,-.22,.18]],0xff9880,.7,.024);
  d.marks=[];for(let i=0;i<9;i++)d.marks.push(box(g,[-1.8+i*.45,-.43,.44],[.018,.07,.018],0xc3d1df,.3,.5));
 }else if(kind==="doppler"){
  box(g,[0,-.56,0],[4.1,.12,.9],0x3a4653,.3,.6);
  d.sourceCart=box(g,[-.85,-.25,0],[.62,.25,.48],0x247ce0,.25,.55);
  d.sourceBeacon=ball(g,[-.85,.05,0],0xffcc66,.13,.3);
  d.wheels=[ball(g,[-1.08,-.42,.22],0x202b37,.095,.6),ball(g,[-.62,-.42,.22],0x202b37,.095,.6)];
  d.observer=ball(g,[1.55,-.18,0],0x79d79a,.17,.3);
  d.wavefronts=[];for(let i=0;i<6;i++){const r=.25+i*.24;const m=ring(g,r,.012,0x73c5ff,[-.85,.02,0],[Math.PI/2,0,0]);d.wavefronts.push({mesh:m,phase:i/6});}
 }else if(kind==="wave-special"){
  box(g,[0,-.54,0],[4.2,.1,.7],0x384653,.3,.6);
  for(const x of [-1.92,1.92])box(g,[x,.08,0],[.08,1.1,.35],0x75879a,.24,.55);
  const pts=[];for(let i=0;i<=120;i++)pts.push(new THREE.Vector3(-1.9+i*3.8/120,0,0));
  d.specialWave=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x61b8ff}));g.add(d.specialWave);
  d.waveMarkerA=ball(g,[-.8,0,.1],0x68d7a2,.09,.2);d.waveMarkerB=ball(g,[.8,0,.1],0xf2ba66,.09,.2);
 }else if(kind==="logic"){
  box(g,[0,-.5,0],[3.8,.12,1.3],0x202b38,.35,.6);
  d.logicA=ball(g,[-1.35,.05,.2],0x68b7ff,.15,.25);d.logicB=ball(g,[-1.35,-.25,.2],0x68b7ff,.15,.25);
  d.logicGate=box(g,[0,-.05,.2],[.78,.62,.42],0x397bbd,.24,.5);
  d.logicOut=ball(g,[1.35,.05,.2],0x7dd59b,.18,.3);
  d.logicWireA=line(g,[[-1.2,.05,.2],[-.4,.05,.2]],0xd2a95e,1,.025);d.logicWireB=line(g,[[-1.2,-.25,.2],[-.4,-.25,.2]],0xd2a95e,1,.025);d.logicWireOut=line(g,[[.4,-.05,.2],[1.18,.05,.2]],0xd2a95e,1,.025);
 }else if(kind==="rectifier"){
  box(g,[0,-.55,0],[3.8,.12,1.45],0x202a35,.35,.6);
  d.rectSource=box(g,[-1.35,-.05,.2],[.35,.5,.28],0x327ec5,.25,.5);
  d.rectDiode=mesh(new THREE.ConeGeometry(.22,.42,3),mat(0xe7b65b,.25,.55),g,[0,.05,.2]);d.rectDiode.rotation.z=-Math.PI/2;
  d.rectLoad=box(g,[1.2,-.05,.2],[.46,.58,.4],0x4f91be,.25,.5);
  d.rectWave=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x70d5a0}));g.add(d.rectWave);
  d.rectAxis=box(g,[0,-.35,.42],[2.9,.025,.025],0xa7bacb,.25,.5);
 }else if(kind==="induction"){
  box(g,[0,-.55,0],[3.8,.12,1.25],0x27333f,.35,.6);
  d.coilLoops=[];for(let i=0;i<9;i++){const m=ring(g,.62,.035,0xd4a95e,[-.18+i*.045,.15,0],[0,Math.PI/2,0]);d.coilLoops.push(m);}
  d.magnet=box(g,[-1.15,.15,0],[.72,.28,.34],0x347fc7,.25,.6);
  box(g,[-1.38,.15,0],[.24,.29,.35],0xd85c59,.2,.6);box(g,[-.92,.15,0],[.24,.29,.35],0x347fc7,.2,.6);
  d.inducedArrow=arrow(g,[.55,.05,0],[1.35,.05,0],0x72d59a);
  d.meter=box(g,[1.3,-.18,.25],[.5,.5,.3],0x8c9cab,.3,.6);
 }else if(kind==="photon"){
  d.emitter=box(g,[-1.55,.05,0],[.38,.6,.55],0x566b80,.25,.55);
  d.photons=[];for(let i=0;i<5;i++)d.photons.push(line(g,[[-1.32,.1+i*.12,0],[-.5,.1+i*.12,0]],0x67bfff,.9,.018));
  d.metalPlate=box(g,[.05,-.02,0],[.12,1.2,.9],0xd7b36b,.22,.62);
  d.electron=ball(g,[.55,.25,0],0x79dba0,.09,.3);d.electronTrail=line(g,[[.15,.1,0],[1.5,.55,0]],0x7bdba1,.65,.016);
 }else if(kind==="capacitor"){
  d.plateA=box(g,[-.38,.12,0],[.09,1.25,1.0],0x6da6d8,.18,.75);
  d.plateB=box(g,[.38,.12,0],[.09,1.25,1.0],0xd58e68,.18,.75);
  d.fieldArrows=[];for(let i=0;i<5;i++){const z=-.38+i*.19;d.fieldArrows.push(arrow(g,[-.25,.12,z],[.25,.12,z],0x83d2ff));}
  d.capWire=line(g,[[-.38,.72,0],[-.38,1.0,0],[0,1.0,0],[.38,1.0,0],[.38,.72,0]],0xd7b46c,1,.025);
 }else if(kind==="centre-mass"){
  box(g,[0,-.55,0],[3.6,.12,.72],0x394653,.3,.6);d.massLeft=ball(g,[-1.25,-.15,0],0x4c9fff,.26,.35);d.massRight=ball(g,[1.25,-.15,0],0xe78166,.26,.35);d.cmMarker=ball(g,[0,.32,0],0x83dfaa,.09,.2);d.cmLine=line(g,[[-1.25,.32,0],[1.25,.32,0]],0x9aafc2,.7,.012);d.cmPost=box(g,[0,-.1,0],[.025,.72,.025],0xaabaca,.3,.7);
 }else if(kind==="pendulum"){
  box(g,[0,1.48,0],[1.5,.12,.65],0x647487,.25,.7);box(g,[0,1.20,0],[.12,.55,.12],0x8192a4,.25,.7);d.pivot=ball(g,[0,1.0,0],0xe7c56f,.09,.35);d.pendulumRod=mesh(new THREE.CylinderGeometry(.025,.025,1,12),mat(0xc6d2df,.28,.65),g,[0,.5,0]);d.pendulumBob=ball(g,[0,0,0],0x3197ec,.19,.4);d.pendulumLength=1;
 }else if(kind==="sound-intensity"){
  box(g,[0,-.6,0],[3.8,.12,1.1],0x293541,.35,.5);d.soundSource=ball(g,[-1.45,.2,0],0xffc36d,.18,.3);d.soundReceiver=ball(g,[.5,.15,0],0x72d89c,.14,.25);d.soundRings=[];for(let i=0;i<6;i++)d.soundRings.push({mesh:ring(g,.28+i*.16,.014,0x64bfff,[-1.45,.2,0],[Math.PI/2,0,0]),phase:i/6});d.soundArrow=arrow(g,[-1.2,-.15,0],[.65,-.15,0],0x83dca9);
 }else if(kind==="charged-particle"){
  box(g,[0,-.6,0],[3.5,.1,1.4],0x26323d,.35,.6);d.magneticField=[];for(let x=-1.3;x<=1.3;x+=.43)for(let z=-.4;z<=.4;z+=.4)d.magneticField.push(arrow(g,[x,-.12,z],[x,.55,z],0x538fd2));d.chargePath=ring(g,.8,.018,0x69c4ff,[0,.15,0],[0,0,0]);d.chargeParticle=ball(g,[.8,.15,0],0xffd06e,.12,.35);d.chargeTrail=ring(g,.8,.01,0xffffff,[0,.15,0]);
 }else if(kind==="generator"){
  box(g,[-1.25,.05,0],[.55,1.1,.6],0x286fc1,.25,.6);box(g,[1.25,.05,0],[.55,1.1,.6],0xd45c58,.25,.6);box(g,[0,-.42,0],[2.2,.16,.75],0x4c5967,.3,.65);d.generatorCoil=new THREE.Group();g.add(d.generatorCoil);for(const x of [-.5,.5])box(d.generatorCoil,[x,0,0],[.07,.92,.06],0xd9b66e,.25,.55);for(const y of [-.46,.46])box(d.generatorCoil,[0,y,0],[1.07,.07,.06],0xd9b66e,.25,.55);d.generatorAxis=mesh(new THREE.CylinderGeometry(.06,.06,1.7,24),steel,g,[0,0,0]);d.generatorAxis.rotation.z=Math.PI/2;d.generatorLamp=ball(g,[1.7,.3,0],0xf4c96c,.2,.2);d.generatorLamp.material.emissive=new THREE.Color(0xffbc45);d.generatorLamp.material.emissiveIntensity=.1;
 }else if(kind==="transformer"){
  box(g,[0,.05,0],[1.7,1.55,.5],0x8c9cae,.35,.8);box(g,[0,.05,.28],[.92,1.25,.08],0x202a34,.28,.5);d.primaryCoils=[];d.secondaryCoils=[];for(let i=0;i<8;i++){d.primaryCoils.push(ring(g,.43,.035,0x4f9fe8,[-.65,.05,.38],[0,Math.PI/2,0]));d.secondaryCoils.push(ring(g,.43,.035,0xe8a65b,[.65,.05,.38],[0,Math.PI/2,0]));}d.fluxLines=[];for(let i=0;i<4;i++)d.fluxLines.push(line(g,[[-.58,.05+i*.13,.4],[0,.05+i*.13,.4],[.58,.05+i*.13,.4]],0x72c1ff,.55,.012));
 }else if(kind==="rc-circuit"){
  box(g,[0,-.56,0],[3.8,.12,1.25],0x25313d,.35,.6);d.rcWire=line(g,[[-1.5,-.12,.25],[-1.5,.45,.25],[-.6,.45,.25],[.5,.45,.25],[1.45,.45,.25],[1.45,-.12,.25],[-1.5,-.12,.25]],0xd4a95c,1,.026);d.rcBattery=box(g,[-1.5,.16,.25],[.25,.7,.2],0x418bd2,.25,.6);d.rcResistor=box(g,[-.35,.45,.25],[.62,.24,.28],0xd6a85d,.28,.5);d.rcPlateA=box(g,[.75,.14,.25],[.08,.72,.55],0x6aa8d9,.2,.65);d.rcPlateB=box(g,[1.05,.14,.25],[.08,.72,.55],0xd88868,.2,.65);d.rcField=[];for(let i=0;i<4;i++)d.rcField.push(arrow(g,[.8,-.16+i*.2,.3],[1.0,-.16+i*.2,.3],0x80d8ff));d.rcCurrent=ball(g,[-.95,.45,.25],0x74d89a,.08,.2);
 }else if(kind==="solid-expansion"){
  box(g,[0,-.62,0],[3.7,.1,1.1],0x3b4652,.32,.6);d.expansionRod=box(g,[0,-.05,0],[2.5,.25,.32],0x6e9fc8,.25,.65);d.expansionLeft=box(g,[-1.28,-.05,0],[.16,.52,.5],0x8999a8,.3,.65);d.expansionHeater=ball(g,[0,-.38,.3],0xf08c50,.18,.12);d.expansionHeat=[];for(let i=0;i<5;i++)d.expansionHeat.push(ball(g,[-1+i*.5,-.36,.34],0xffa55e,.045,.1));
 }else if(kind==="thermal-conduction"){
  box(g,[0,-.58,0],[3.8,.12,1.1],0x34414d,.34,.62);d.thermalRod=box(g,[0,-.05,0],[3.25,.32,.42],0x6f8497,.28,.65);d.hotEnd=ball(g,[-1.65,-.05,.05],0xf0794e,.25,.1);d.coldEnd=ball(g,[1.65,-.05,.05],0x5d9de9,.25,.15);d.heatParticles=[];for(let i=0;i<12;i++)d.heatParticles.push(ball(g,[-1.45+(i%6)*.55,.2+(Math.floor(i/6))*.12,.28],0xffbc67,.035,.1));
 }else if(kind==="terminal-fluid"){
  box(g,[0,-.65,0],[2.6,.12,1.1],0x3c4b58,.32,.6);const glassMat=new THREE.MeshPhysicalMaterial({color:0x81c8f7,transparent:true,opacity:.12,roughness:.1,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.CylinderGeometry(.72,.72,2.45,48,1,true),glassMat,g,[0,.45,0]);d.fluidSurface=mesh(new THREE.CircleGeometry(.7,48),new THREE.MeshStandardMaterial({color:0x398ac0,transparent:true,opacity:.28,side:THREE.DoubleSide}),g,[0,1.68,0]);d.fallingSphere=ball(g,[0,1.35,0],0xf1b76b,.12,.25);d.velocityArrow=arrow(g,[.95,1.2,0],[.95,.65,0],0x74d99b);d.terminalTrail=line(g,[[0,1.3,.2],[0,.8,.2],[0,.3,.2],[0,-.2,.2]],0x6fbfff,.5,.018);
 }else if(kind==="stokes-drag"){
  box(g,[0,-.65,0],[2.8,.12,1.1],0x3c4b58,.32,.6);const glassMat=new THREE.MeshPhysicalMaterial({color:0x81c8f7,transparent:true,opacity:.13,roughness:.1,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.CylinderGeometry(.72,.72,2.4,48,1,true),glassMat,g,[0,.45,0]);d.stokesFluid=mesh(new THREE.CircleGeometry(.7,48),new THREE.MeshStandardMaterial({color:0x398ac0,transparent:true,opacity:.25,side:THREE.DoubleSide}),g,[0,1.6,0]);d.stokesSphere=ball(g,[0,.4,0],0xf1b76b,.12,.28);d.stokesArrow=arrow(g,[-.85,.35,0],[-.35,.35,0],0x74d99b);d.stokesStream=[];for(let i=0;i<8;i++)d.stokesStream.push(line(g,[[-.9,-.35+i*.1,0],[-.4,-.35+i*.1,0],[.1,-.35+i*.1,0],[.6,-.35+i*.1,0]],0x6fbfff,.35,.012));
 }else if(kind==="scattering"){
  box(g,[0,-.58,0],[3.8,.12,1.2],0x27333f,.35,.6);d.goldNucleus=ball(g,[0,.05,0],0xe5b84e,.32,.75);d.nucleusRing=ring(g,.43,.025,0xe7c66b,[0,.05,0],[Math.PI/2,0,0]);d.alphaParticle=ball(g,[-1.7,.05,0],0x78d99a,.12,.35);d.alphaTrail=line(g,[[-1.8,.05,.12],[-1.3,.05,.12],[-.8,.05,.12],[-.35,.05,.12]],0x78d99a,.8,.018);d.scatterCurve=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x7edca5}));g.add(d.scatterCurve);d.scatterImpact=ball(g,[-.38,.05,0],0xffcf77,.045,.2);
 }else if(kind==="photoelectric"){
  box(g,[0,-.62,0],[3.8,.12,1.1],0x26313c,.34,.6);d.photoSource=box(g,[-1.55,.05,0],[.36,.55,.48],0x536c85,.25,.5);d.photoPlate=box(g,[.12,.02,0],[.12,1.35,.86],0xd7b36b,.2,.68);d.photoBeams=[];for(let i=0;i<5;i++)d.photoBeams.push(line(g,[[-1.35,.34-i*.14,0],[-.05,.34-i*.14,0]],0x72bfff,.9,.017));d.photoElectrons=[];for(let i=0;i<7;i++)d.photoElectrons.push(ball(g,[.23,.35-i*.11,0],0x73dfa1,.065,.25));d.photoField=line(g,[[.28,-.55,.1],[1.55,-.55,.1]],0x73dfa1,.35,.012);
 }else if(kind==="xray"){
  box(g,[0,-.62,0],[3.8,.12,1.1],0x26313c,.34,.6);d.xrayGun=box(g,[-1.5,.05,0],[.5,.7,.55],0x54718e,.25,.6);d.xrayCathode=ball(g,[-1.18,.05,.12],0xe9b96c,.12,.2);d.xrayTarget=box(g,[.75,.03,0],[.22,1.15,.9],0xb5a6a0,.22,.85);d.xrayElectron=ball(g,[-.95,.05,.12],0x74c9ff,.07,.3);d.xrayPhotons=[];for(let i=0;i<6;i++)d.xrayPhotons.push(line(g,[[.9,.18-i*.1,0],[1.75,.38-i*.1,0]],0x83d5ff,.0,.018));
 }else if(kind==="quantum-interference"){
  box(g,[0,-.62,0],[3.8,.12,1.15],0x26313c,.34,.6);d.quantumSource=ball(g,[-1.6,.05,0],0x77c8ff,.14,.3);d.doubleSlit=box(g,[-.25,.05,0],[.12,1.35,.85],0x8998a8,.25,.72);d.slitTop=box(g,[-.25,.55,.44],[.16,.35,.12],0x8998a8,.25,.6);d.slitBottom=box(g,[-.25,-.45,.44],[.16,.35,.12],0x8998a8,.25,.6);d.quantumScreen=box(g,[1.55,.05,0],[.08,1.45,.9],0x46586b,.2,.6);d.fringeDots=[];for(let i=0;i<15;i++)d.fringeDots.push(ball(g,[1.48,-.68+i*.095,.08],0x70c9ff,.035,.15));d.quantumWaveA=line(g,[[-1.4,.08,0],[-.75,.5,0],[-.28,.5,0]],0x65bfff,.7,.016);d.quantumWaveB=line(g,[[-1.4,.08,0],[-.75,-.45,0],[-.28,-.45,0]],0x83dca9,.7,.016);
 }else if(kind==="capillary"){
  box(g,[0,-.62,0],[3.8,.12,1.1],0x26333e,.34,.6);const waterMat=new THREE.MeshPhysicalMaterial({color:0x168bdf,transparent:true,opacity:.42,roughness:.12,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.BoxGeometry(2.6,.65,.9),waterMat,g,[0,-.28,0]);d.capillaryTube=mesh(new THREE.CylinderGeometry(.07,.07,1.8,32,1,true),glass,g,[.55,.36,0]);d.capillaryWater=mesh(new THREE.CylinderGeometry(.052,.052,.7,24),waterMat,g,[.55,-.02,0]);d.capillaryMeniscus=ring(g,.07,.018,0x83d9ff,[.55,.33,0],[Math.PI/2,0,0]);
 }else if(kind==="buoyancy"){
  const waterMat=new THREE.MeshPhysicalMaterial({color:0x158bd5,transparent:true,opacity:.42,roughness:.12,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.BoxGeometry(2.9,1.25,1.1),waterMat,g,[0,-.06,0]);d.floatBlock=box(g,[0,.48,0],[.68,.7,.58],0xd7a96a,.22,.5);d.buoyArrow=arrow(g,[.55,-.25,0],[.55,.75,0],0x77dca0);d.weightArrow=arrow(g,[-.55,.65,0],[-.55,-.35,0],0xe58b68);d.waterLine=box(g,[0,.58,.58],[2.75,.025,.025],0x72c8fa,.2,.2);
 }else if(kind==="hydrostatic"){
  const waterMat=new THREE.MeshPhysicalMaterial({color:0x148bd9,transparent:true,opacity:.34,roughness:.12,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.BoxGeometry(2.3,2.25,1.1),waterMat,g,[-.25,.08,0]);d.pressureProbe=ball(g,[.42,-.45,.1],0xffc56d,.12,.25);d.pressureLine=line(g,[[.42,-.45,.1],[1.35,-.45,.1],[1.55,-.7,.1]],0x8fb2cf,.85,.025);d.pressureGauge=mesh(new THREE.CylinderGeometry(.25,.25,.12,40),mat(0x93a4b6,.2,.55),g,[1.55,-.62,.1]);d.gaugeNeedle=box(g,[1.55,-.62,.18],[.025,.2,.025],0xef7770,.2,.3);
 }else if(kind==="pipe-flow"){
  box(g,[0,-.62,0],[3.8,.12,1.1],0x26333e,.34,.6);d.pipeIn=mesh(new THREE.CylinderGeometry(.38,.38,1.5,40,1,true),glass,g,[-.8,.05,0]);d.pipeIn.rotation.z=Math.PI/2;d.pipeNarrow=mesh(new THREE.CylinderGeometry(.2,.2,.8,40,1,true),glass,g,[.35,.05,0]);d.pipeNarrow.rotation.z=Math.PI/2;d.pipeOut=mesh(new THREE.CylinderGeometry(.38,.38,1.1,40,1,true),glass,g,[1.3,.05,0]);d.pipeOut.rotation.z=Math.PI/2;d.flowMarkers=[];for(let i=0;i<18;i++)d.flowMarkers.push(ball(g,[-1.5+(i%9)*.22,Math.sin(i*2.3)*.18,.05],0x70cfff,.035,.08));
 }else if(kind==="calorimetry"){
  box(g,[0,-.62,0],[3.6,.12,1.1],0x26333e,.34,.6);const glassMat=new THREE.MeshPhysicalMaterial({color:0x9ad9ff,transparent:true,opacity:.18,roughness:.1,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.CylinderGeometry(.58,.58,1.35,48,1,true),glassMat,g,[-.35,-.02,0]);d.calWater=mesh(new THREE.CylinderGeometry(.52,.52,.78,40),new THREE.MeshPhysicalMaterial({color:0x2c9fe3,transparent:true,opacity:.52,side:THREE.DoubleSide}),g,[-.35,-.27,0]);d.calTherm=box(g,[.65,.05,.12],[.1,1.05,.1],0xd5dce4,.2,.35);d.calMercury=box(g,[.65,-.28,.19],[.035,.48,.025],0xe16b66,.15,.2);d.calHeat=ball(g,[-.35,-.55,.2],0xf18a4e,.16,.12);
 }else if(kind==="phase-change"){
  box(g,[0,-.62,0],[3.6,.12,1.1],0x26333e,.34,.6);const glassMat=new THREE.MeshPhysicalMaterial({color:0x9ad9ff,transparent:true,opacity:.16,roughness:.1,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.CylinderGeometry(.68,.68,1.35,48,1,true),glassMat,g,[0,.0,0]);d.phaseWater=mesh(new THREE.CylinderGeometry(.61,.61,.7,40),new THREE.MeshPhysicalMaterial({color:0x2d9ee2,transparent:true,opacity:.5,side:THREE.DoubleSide}),g,[0,-.23,0]);d.iceBlock=box(g,[0,.3,.03],[.5,.48,.48],0xa9e5ff,.12,.08);d.phaseParticles=[];for(let i=0;i<18;i++)d.phaseParticles.push(ball(g,[THREE.MathUtils.randFloat(-.45,.45),THREE.MathUtils.randFloat(-.45,.25),THREE.MathUtils.randFloat(-.3,.3)],0x8ed9ff,.035,.05));d.phaseHeater=ball(g,[0,-.58,.45],0xf08b4c,.18,.1);
 }else if(kind==="blackbody"){
  box(g,[0,-.62,0],[3.5,.12,1.05],0x26333e,.34,.6);const darkMat=mat(0x18191c,.18,.15,{emissive:0x080808,emissiveIntensity:.35});d.blackCavity=mesh(new THREE.SphereGeometry(.72,48,36),darkMat,g,[0,.1,0]);d.blackAperture=ring(g,.28,.06,0x7b8793,[0,.1,.66],[0,0,0]);d.blackHot=ball(g,[0,.1,.52],0xff6a27,.16,.05);d.spectrumBars=[];const colors=[0x6e63ff,0x368fff,0x4fd6ff,0x64df88,0xffd05d,0xff8c4e,0xef5148];for(let i=0;i<7;i++)d.spectrumBars.push(box(g,[-1.25+i*.42,-.48,.25],[.28,.15,.12],colors[i],.2,.1));
 }else if(kind==="circular-motion"){
  box(g,[0,-.62,0],[3.4,.12,1.1],0x26333e,.34,.6);d.circularPivot=ball(g,[0,.05,0],0xe4edf5,.12,.5);d.circularOrbit=ring(g,1.1,.025,0x6ebaff,[0,.05,0],[Math.PI/2,0,0]);d.circularMass=ball(g,[1.1,.05,0],0xf1bd68,.17,.25);d.circularRadius=line(g,[[0,.05,0],[1.1,.05,0]],0x74dca1,.85,.022);d.circularArrow=arrow(g,[0,.05,0],[0,.05,0],0x6fbfff);
 }
}
function coilPoints(startY,height,length,radius){const pts=[];const n=150;for(let i=0;i<=n;i++){const t=i/n,x=-1.45+length*t,ang=t*2*Math.PI*11;pts.push([x,startY+Math.sin(ang)*radius,Math.cos(ang)*radius]);}return pts;}
function updateModel(kind,d,s,t,dt,meta={}){
 const a=Number(s.a)||1,b=Number(s.b)||1;
 if(kind==="measurement"){if(d.cursor)d.cursor.position.x=THREE.MathUtils.clamp(-1.8+(a%40)*.085,-1.8,1.8);}
 if(kind==="vector"){const x=THREE.MathUtils.clamp(a/5,-1.5,1.5),y=THREE.MathUtils.clamp(b/5,-1.3,1.3);if(d.v1){d.v1.setDirection(new THREE.Vector3(Math.sign(x)||1,0,0));d.v1.setLength(Math.abs(x),.16,.09)}if(d.v2){d.v2.position.set(x,0,0);d.v2.setDirection(new THREE.Vector3(0,Math.sign(y)||1,0));d.v2.setLength(Math.abs(y),.16,.09)}if(d.result){d.result.setDirection(new THREE.Vector3(x,y,0).normalize());d.result.setLength(Math.hypot(x,y),.16,.09)}}
 if(kind==="motion"||kind==="projectile"){const speed=THREE.MathUtils.clamp(a/10,.08,2.8);if(d.moving){const q=(t*speed)%1;if(kind==="projectile"){const x=-1.7+q*3.4,y=-.55+1.45*4*q*(1-q);d.moving.position.set(x,y,0);}else d.moving.position.x=-1.65+q*3.3;}}
 if(kind==="forces"||kind==="energy"){if(d.block){d.block.scale.x=THREE.MathUtils.clamp(a/4,.4,1.8);}}
 if(kind==="rotation"||kind==="torque"){if(d.disk)d.disk.rotation.y=t*THREE.MathUtils.clamp(b/3,.3,3);if(d.handle)d.handle.rotation.y=t*.2;}
 if(kind==="oscillator"){if(d.mass)d.mass.position.y=-.15+Math.sin(t*Math.sqrt(Math.max(.2,b/Math.max(.2,a))))*.32;}
 if(kind==="waves"){if(d.wave){const pos=d.wave.geometry.attributes.position;const amp=THREE.MathUtils.clamp(a/10,.08,.9),freq=THREE.MathUtils.clamp(b/3,.2,4);for(let i=0;i<pos.count;i++){const x=-2+i*4/(pos.count-1);pos.setXYZ(i,x,amp*Math.sin(x*freq*2.8-t*freq*2.0),0);}pos.needsUpdate=true;d.wave.geometry.computeVertexNormals();if(d.marker){const x=Math.sin(t*.6)*1.85;d.marker.position.set(x,amp*Math.sin(x*freq*2.8-t*freq*2),0);}}}
 if(kind==="gas"){
  const id=meta.id||'';let volume=1,temp=1;
  if(id==='gas-properties'){volume=THREE.MathUtils.clamp(b/24.6,.25,2.5);temp=1;}
  else if(id==='charles-law-simulator'){volume=THREE.MathUtils.clamp((a*b/300)/24.6,.25,2.5);temp=Math.sqrt(Math.max(.1,b/300));}
  else if(id==='pressure-law-simulator'){volume=1;temp=Math.sqrt(Math.max(.1,b/300));}
  else if(id==='ideal-gas-equation-simulator'){volume=1;temp=Math.sqrt(Math.max(.1,b/300));}
  else if(id==='gases-intro'){volume=1;temp=THREE.MathUtils.clamp(b/500,.15,2.8);}
  else {volume=1;temp=THREE.MathUtils.clamp(b/300,.4,2.5);}
  if(d.piston)d.piston.position.x=.95+(volume-1)*1.15;
  for(const p of d.particles||[]){if(s.running){p.mesh.position.addScaledVector(p.v,dt*temp*.9);const xmax=.95+(volume-1)*1.15-.15;if(p.mesh.position.x>xmax||p.mesh.position.x< -1.45)p.v.x*=-1;if(Math.abs(p.mesh.position.y)>.47)p.v.y*=-1;if(Math.abs(p.mesh.position.z)>.47)p.v.z*=-1;}}
 }
 if(kind==="thermal"){
  const massFraction=THREE.MathUtils.clamp(a/20,.08,1),tempChange=THREE.MathUtils.clamp(b/100,.02,1);
  const waterHeight=.22+massFraction*.9, waterBase=-.66;
  if(d.thermalWater){d.thermalWater.scale.y=waterHeight/.7;d.thermalWater.position.y=waterBase+waterHeight/2;}
  if(d.thermalSurface)d.thermalSurface.position.y=waterBase+waterHeight;
  const heat=THREE.MathUtils.clamp(tempChange,0,1);
  if(d.heater?.material)d.heater.material.emissiveIntensity=.25+heat*1.5;
  if(d.thermometerMercury){d.thermometerMercury.scale.y=.35+heat*.75;d.thermometerMercury.position.y=-.48+(d.thermometerMercury.scale.y/2);}
  if(s.running){for(const p of d.thermalMolecules||[]){const speed=.25+heat*1.7,angle=p.angle+t*speed*(.4+(p.phase%1));const x=Math.cos(angle)*(p.rad+.035*Math.sin(t*2+p.phase)),z=Math.sin(angle)*(p.rad+.035*Math.cos(t*2+p.phase));const y=waterBase+.06+((p.phase*7+t*speed*.15)%1)*Math.max(.12,waterHeight-.12);p.mesh.position.set(x,y,z);}}
  for(const ray of d.heatRays||[]){ray.material.opacity=.25+heat*(.45+.25*Math.sin(t*3));}
 }
 if(kind==="gas-state"){
  const temp=THREE.MathUtils.clamp(a,50,1500),attraction=THREE.MathUtils.clamp(b,0,10);
  const melt=273+8*attraction,boil=373+22*attraction;
  const phase=temp<melt?"solid":temp<boil?"liquid":"gas";
  const speed=THREE.MathUtils.clamp(Math.sqrt(temp/300),.35,2.5);
  (d.stateParticles||[]).forEach((p,i)=>{
   const ix=i%4,iy=Math.floor(i/4)%4,iz=Math.floor(i/16)-.5;
   let target;
   if(phase==="solid"){
    target=new THREE.Vector3((ix-1.5)*.25,(iy-1.5)*.25,iz*.34);
    target.x+=Math.sin(t*speed*2+p.phase)*.025*speed;
    target.y+=Math.cos(t*speed*1.7+p.phase)*.025*speed;
   }else if(phase==="liquid"){
    const angle=p.phase+t*.28*speed,r=.22+(i%7)*.055;
    target=new THREE.Vector3(Math.cos(angle)*r, -.35+((i*7)%13)*.045+Math.sin(t*speed*1.4+p.phase)*.055,Math.sin(angle)*r*.7);
   }else{
    target=new THREE.Vector3(Math.sin(t*speed*.55+p.phase)*1.12,Math.sin(t*speed*.83+p.phase*1.3)*.66,Math.cos(t*speed*.61+p.phase)*.48);
   }
   p.mesh.position.lerp(target,phase==="gas"?.055:.11);
  });
  if(d.stateIndicator){d.stateIndicator.material.color.setHex(phase==="solid"?0x6eb9ff:phase==="liquid"?0x58d5c6:0xffa65f);d.stateIndicator.scale.setScalar(phase==="gas"?1.2:phase==="liquid"?1:.8);}
 }
 
 if(kind==="gravity"){if(d.moon){const r=1.5;d.moon.position.set(Math.cos(t*.7)*r,Math.sin(t*.7)*r*.15,Math.sin(t*.7)*r);}}
 if(kind==="electric"){if(d.chargeA)d.chargeA.scale.setScalar(THREE.MathUtils.clamp(Math.abs(a)/3,.7,1.7));if(d.chargeB)d.chargeB.scale.setScalar(THREE.MathUtils.clamp(Math.abs(b)/3,.7,1.7));}
 if(kind==="magnetic"){for(const f of d.fields||[])f.rotation.x=Math.sin(t*.4)*.035;}
 if(kind==="circuit"){if(d.bulb){d.bulb.material.emissiveIntensity=THREE.MathUtils.clamp(a/12,.15,2.4);d.bulb.scale.setScalar(.9+Math.min(1,a/30)*.3);}}
 if(kind==="semiconductor"){if(d.bulb)d.bulb.material.emissiveIntensity=THREE.MathUtils.clamp(a/1.2,.15,1.8);}
 if(kind==="solids"){if(d.sample){d.sample.scale.y=THREE.MathUtils.clamp(1.0-a/900,.55,1.05);}}
 if(kind==="fluid"){if(d.water){d.water.scale.y=THREE.MathUtils.clamp(b/3,.35,1.6);d.water.position.y=-.74+(d.water.scale.y*.5);}for(const p of d.bubbles||[]){p.position.y+=dt*.22;if(p.position.y>.75)p.position.y=-.48;}}
 if(kind==="atomic"||kind==="nuclear"){
  for(let i=0;i<3;i++){const r=.85+i*.4,angle=t*(.7+i*.23)+i*2.1,e=d[`electron${i}`];if(e)e.position.set(Math.cos(angle)*r,Math.sin(angle)*r*.55,Math.sin(angle)*r*.85);}
  if(d.decayType==='fission'){const q=(t%4)/4;if(d.fragmentA)d.fragmentA.position.set(-.45-q*1.1,.05+q*.22,0);if(d.fragmentB)d.fragmentB.position.set(.45+q*1.1,.05-q*.22,0);}
  else if(d.emitted){const q=(t%5)/5;d.emitted.position.set(.55+q*1.8,.2+Math.sin(q*Math.PI)*.45,0);if(d.secondaryEmitted)d.secondaryEmitted.position.set(.5+q*1.55,.35+Math.cos(q*Math.PI)*.22,.15);}
 }
 if(kind==="collision"){
  const m1=Math.max(.1,a),m2=Math.max(.1,b),u1=2,u2=-1,den=m1+m2;
  const v1=((m1-m2)*u1+2*m2*u2)/den,v2=((m2-m1)*u2+2*m1*u1)/den;
  const phase=(t%5);let x1,x2;
  if(phase<1.1){x1=-1.3+1.1*phase*1.35;x2=1.3-1.1*phase*.675;}
  else {const q=Math.min(2.7,phase-1.1);x1=.18+v1*q*.48;x2=-.18+v2*q*.48;}
  if(d.collA)d.collA.position.x=THREE.MathUtils.clamp(x1,-1.7,1.7);if(d.collB)d.collB.position.x=THREE.MathUtils.clamp(x2,-1.7,1.7);
 }
 if(kind==="doppler"){
  const vs=THREE.MathUtils.clamp(b,-100,100),direction=Math.sign(vs)||1,travel=((t*vs*.12)%3.2+3.2)%3.2-1.6;
  if(d.sourceCart)d.sourceCart.position.x=-.85+travel;if(d.sourceBeacon)d.sourceBeacon.position.x=-.85+travel;
  (d.wheels||[]).forEach((w,i)=>w.position.x=-1.08+i*.46+travel);
  (d.wavefronts||[]).forEach((w,i)=>{const r=.18+((t*.45+w.phase)%1)*1.15;w.mesh.scale.setScalar(r/(.25+i*.24));w.mesh.position.x=-.85+travel-direction*((t*.45+w.phase)%1)*.4;});
 }
 if(kind==="wave-special"&&d.specialWave){const pos=d.specialWave.geometry.attributes.position,id=meta.id||'';const amp=.55;for(let i=0;i<pos.count;i++){const x=-1.9+i*3.8/(pos.count-1),u=(x+1.9)/3.8;let y=0;if(id.includes('standing')||id.includes('normal-modes')){const mode=THREE.MathUtils.clamp(Math.round(a),1,8),L=THREE.MathUtils.clamp(b,.2,5),w=mode*100/(2*L);y=amp*Math.sin(mode*Math.PI*u)*Math.cos(t*Math.min(8,w*.035));}else if(id.includes('interference')){const path=Math.max(0,a),lambda=Math.max(.01,b),k=2*Math.PI/lambda,phase=2*Math.PI*path/lambda;y=.5*(Math.sin(k*x-t*2)+Math.sin(k*x-t*2+phase));}else if(id.includes('beats')){const f1=Math.max(1,a),f2=Math.max(1,b),avg=(f1+f2)/2,beat=Math.abs(f1-f2);y=.55*Math.sin(x*2.2-t*Math.min(18,avg*.035))*Math.cos(t*Math.min(12,beat*.22));}else y=.55*Math.sin(x*2.6-t*1.5);pos.setY(i,y);}pos.needsUpdate=true;if(d.waveMarkerA)d.waveMarkerA.position.y=amp*Math.sin(t);if(d.waveMarkerB)d.waveMarkerB.position.y=-amp*Math.sin(t);}
 if(kind==="logic") {const A=a>=.5,B=b>=.5,isXor=(meta.id||'').includes('xor'),out=isXor?(A!==B):(A&&B);if(d.logicA)d.logicA.material.color.setHex(A?0x63d79b:0x536578);if(d.logicB)d.logicB.material.color.setHex(B?0x63d79b:0x536578);if(d.logicOut){d.logicOut.material.color.setHex(out?0x63e29c:0x536578);d.logicOut.material.emissive.setHex(out?0x126438:0x111820);d.logicOut.material.emissiveIntensity=out?1.0:.08;}}
 if(kind==="rectifier"&&d.rectWave){const pts=[];const full=(meta.id||'').includes('full-wave');for(let i=0;i<=80;i++){const x=-1.45+i*2.9/80,phase=i/80*Math.PI*4,raw=Math.sin(phase),y=(full?Math.abs(raw):Math.max(0,raw))*.52;pts.push(new THREE.Vector3(x,-.15+y,.47));}d.rectWave.geometry.dispose();d.rectWave.geometry=new THREE.BufferGeometry().setFromPoints(pts);}
 if(kind==="induction"){if(d.magnet){d.magnet.position.x=-1.15+Math.sin(t*1.25)*.68;d.magnet.rotation.z=Math.sin(t*1.25)*.08;}if(d.inducedArrow){const direction=Math.sin(t*1.25);d.inducedArrow.setLength(.25+Math.abs(direction)*.85,.15,.08);d.inducedArrow.setDirection(new THREE.Vector3(Math.sign(direction)||1,0,0));}}
 if(kind==="photon"){if(d.electron){const q=(t%2)/2;d.electron.position.set(.2+q*1.45,.08+Math.sin(q*Math.PI)*.85,0);}}
 if(kind==="capacitor"){const v=THREE.MathUtils.clamp(Math.abs(a)/12,.2,2.5);(d.fieldArrows||[]).forEach(ar=>ar.setLength(v*.34,.1,.06));if(d.plateA)d.plateA.material.color.setHex(a>=0?0x6da6d8:0xd58e68);}
 if(kind==="centre-mass"){const total=Math.max(.01,a+b),x=-1.25+2.5*b/total;if(d.massLeft)d.massLeft.scale.setScalar(THREE.MathUtils.clamp(.16+Math.sqrt(Math.max(a,.01))*.045,.16,.38));if(d.massRight)d.massRight.scale.setScalar(THREE.MathUtils.clamp(.16+Math.sqrt(Math.max(b,.01))*.045,.16,.38));if(d.cmMarker)d.cmMarker.position.x=THREE.MathUtils.clamp(x,-1.15,1.15);}
 if(kind==="pendulum"){const length=THREE.MathUtils.clamp(a,.25,1.35),gval=THREE.MathUtils.clamp(b,.5,30),period=2*Math.PI*Math.sqrt(length/gval),angle=.42*Math.sin(2*Math.PI*t/Math.max(period,.1));const pivot=new THREE.Vector3(0,1.0,0),bob=new THREE.Vector3(Math.sin(angle)*length,1.0-Math.cos(angle)*length,0);if(d.pendulumBob)d.pendulumBob.position.copy(bob);if(d.pendulumRod){const v=bob.clone().sub(pivot);d.pendulumRod.position.copy(pivot.clone().add(bob).multiplyScalar(.5));d.pendulumRod.scale.y=v.length();d.pendulumRod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());}}
 if(kind==="sound-intensity"){const r=THREE.MathUtils.clamp(b*.055,.18,1.65);if(d.soundReceiver)d.soundReceiver.position.x=-1.45+r;if(d.soundArrow){d.soundArrow.position.set(-1.45+r*.5,-.15,0);d.soundArrow.scale.x=r/1.8;}for(const q of d.soundRings||[]){const phase=(t*.6+q.phase)%1,rad=.18+phase*1.45;q.mesh.scale.setScalar(rad/.28);q.mesh.position.x=-1.45;}}
 if(kind==="charged-particle"){const mass=Math.max(a,1e-30),B=Math.max(b,1e-5),radius=THREE.MathUtils.clamp((mass*1e6/(1.602176634e-19*B))*2.5,.25,1.45),angle=t*1.8;if(d.chargePath){d.chargePath.scale.setScalar(radius/.8);}if(d.chargeTrail)d.chargeTrail.scale.setScalar(radius/.8);if(d.chargeParticle)d.chargeParticle.position.set(radius*Math.cos(angle),.15+radius*Math.sin(angle),0);}
 if(kind==="generator"){const omega=THREE.MathUtils.clamp(a,0,500),turns=THREE.MathUtils.clamp(b,1,1000);if(d.generatorCoil)d.generatorCoil.rotation.y=t*omega*.08;if(d.generatorLamp)d.generatorLamp.material.emissiveIntensity=.08+Math.abs(Math.sin(t*omega*.08))*Math.min(2,turns/80);}
 if(kind==="transformer"){const ratio=THREE.MathUtils.clamp(b,.01,20);(d.fluxLines||[]).forEach((l,i)=>l.material.opacity=.25+.65*Math.abs(Math.sin(t*2+i*.3)));(d.secondaryCoils||[]).forEach((c,i)=>c.scale.setScalar(THREE.MathUtils.clamp(.8+ratio*.04,.8,1.5)));}
 if(kind==="rc-circuit"){const tau=Math.max(.03,a*b*.001),charge=1-Math.exp(-Math.max(0,t)/tau);(d.rcField||[]).forEach(ar=>ar.setLength(.03+charge*.3,.08,.045));if(d.rcCurrent)d.rcCurrent.position.x=-1.05+((t*1.2)%2.1);if(d.rcPlateA)d.rcPlateA.material.emissiveIntensity=charge*.35;}
 if(kind==="solid-expansion"){const delta=12e-6*Math.max(.1,a)*b,factor=THREE.MathUtils.clamp(1+delta/Math.max(.1,a),.985,1.015);if(d.expansionRod)d.expansionRod.scale.x=2.5*factor;if(d.expansionHeater)d.expansionHeater.material.emissiveIntensity=THREE.MathUtils.clamp(Math.abs(b)/100,.1,1.8);}
 if(kind==="thermal-conduction"){const intensity=THREE.MathUtils.clamp(Math.abs(a*b)/100,.1,2);if(d.thermalRod)d.thermalRod.material.color.setHSL(.56-intensity*.09,.35,.42);(d.heatParticles||[]).forEach((p,i)=>{p.position.x=-1.45+((t*.55+i*.17)%2.9);p.material.emissiveIntensity=.25+intensity*.3;});}
 if(kind==="terminal-fluid"){const r=a*1e-3,eta=Math.max(b,1e-7),vt=2*r*r*1000*9.80665/(9*eta),speed=THREE.MathUtils.clamp(vt/1.5,.08,1.15),tau=.75,dist=speed*(t-tau*(1-Math.exp(-t/tau))),y=Math.max(-.46,1.35-Math.min(1.81,dist*.55));if(d.fallingSphere)d.fallingSphere.position.y=y;if(d.velocityArrow)d.velocityArrow.setLength(.15+speed*.55,.12,.07);}
 if(kind==="stokes-drag"){const eta=THREE.MathUtils.clamp(a,.0001,10),r=THREE.MathUtils.clamp(b*1e-3,1e-8,2e-5),drag=6*Math.PI*eta*r*.01,norm=THREE.MathUtils.clamp(drag/1e-8,.12,1.25);if(d.stokesSphere){d.stokesSphere.scale.setScalar(.06+Math.sqrt(r/1e-5)*.055);d.stokesSphere.position.x=-.65+((t*.18)%1.3);}if(d.stokesArrow)d.stokesArrow.setLength(.15+norm*.75,.1,.06);(d.stokesStream||[]).forEach((l,i)=>{l.material.opacity=.18+norm*.42;});}
 if(kind==="scattering"){
  // Stable Rutherford-scattering path: an incoming alpha particle approaches
  // the nucleus, then leaves at the selected scattering angle. Avoid tan(theta)
  // which diverges around 90 degrees and sent the particle off-screen.
  const theta=THREE.MathUtils.clamp(a,2,170)*Math.PI/180;
  const energy=THREE.MathUtils.clamp(b,.1,20),phase=((t*Math.sqrt(energy/5))%4)/4;
  const incoming=phase<.5, q=incoming?phase/.5:(phase-.5)/.5;
  const x=incoming?(-1.7+1.3*q):(-.4+1.35*q*Math.cos(theta));
  const y=incoming?.05:(1.35*q*Math.sin(theta));
  if(d.alphaParticle)d.alphaParticle.position.set(x,y,.04);
  if(d.scatterCurve){
    const pts=[];
    for(let i=0;i<=40;i++){
      const q=i/40;
      const px=q<.5?(-1.7+1.3*(q/.5)):(-.4+1.35*((q-.5)/.5)*Math.cos(theta));
      const py=q<.5?.05:(1.35*((q-.5)/.5)*Math.sin(theta));
      pts.push(new THREE.Vector3(px,py,.04));
    }
    d.scatterCurve.geometry.dispose();
    d.scatterCurve.geometry=new THREE.BufferGeometry().setFromPoints(pts);
  }
  if(d.scatterImpact){d.scatterImpact.position.set(-.4,.05,0);d.scatterImpact.material.emissiveIntensity=.08+Math.min(1,energy/12)*.45;}
 }
 if(kind==="photoelectric"){
  const threshold=b*1.602176634e-19/6.62607015e-34,frequency=a*1e14,keEv=Math.max(0,6.62607015e-34*frequency/1.602176634e-19-b),emits=frequency>threshold;
  (d.photoElectrons||[]).forEach((e,i)=>{e.visible=emits;const q=(t*.55+i*.11)%1;e.position.set(.24+q*(.65+Math.min(keEv,5)*.12),.42-i*.12+Math.sin(q*Math.PI)*.15,.02);});
  (d.photoBeams||[]).forEach((beam,i)=>{beam.material.opacity=emits?.85:.2;});
 }
 if(kind==="xray"){
  const voltage=THREE.MathUtils.clamp(a,1,200),phase=(t%2.8)/2.8;
  if(d.xrayElectron)d.xrayElectron.position.set(-1.05+phase*1.65,.04+Math.sin(phase*Math.PI)*.05,.12);
  (d.xrayPhotons||[]).forEach((beam,i)=>{beam.material.opacity=phase>.55?.9:0;});
  if(d.xrayTarget)d.xrayTarget.material.emissiveIntensity=.04+voltage/200*1.2;
 }
 if(kind==="quantum-interference"){
  const lambda=THREE.MathUtils.clamp(b/Math.max(a,1e-30),1e-10,1e-7),scale=THREE.MathUtils.clamp(lambda/1e-9,.35,2.2);
  (d.fringeDots||[]).forEach((dot,i)=>{const y=-.68+i*.095,intensity=Math.pow(Math.cos(y*8/scale),2);dot.material.emissiveIntensity=.08+intensity*1.25;dot.scale.setScalar(.55+intensity*.75);});
 }
 if(kind==="capillary"){
  const rise=THREE.MathUtils.clamp(2*a/(998*9.80665*Math.max(b*1e-3,1e-6)),.05,1.35);
  if(d.capillaryWater){d.capillaryWater.scale.y=rise/.7;d.capillaryWater.position.y=-.32+rise/2;}
  if(d.capillaryMeniscus)d.capillaryMeniscus.position.y=-.32+rise;
 }
 if(kind==="buoyancy"){
  const rho=THREE.MathUtils.clamp(a,1,15000),immersed=THREE.MathUtils.clamp(800/rho,.12,1.25);
  if(d.floatBlock)d.floatBlock.position.y=.58-(immersed-.5)*.45;
  if(d.buoyArrow)d.buoyArrow.setLength(.25+Math.min(1,a/1500)*.85,.12,.08);
 }
 if(kind==="hydrostatic"){
  const depth=THREE.MathUtils.clamp(b,0,100),y=.88-depth/100*1.45;
  if(d.pressureProbe)d.pressureProbe.position.y=y;
  if(d.pressureGauge){d.pressureGauge.position.y=y-.22;d.pressureGauge.rotation.z=Math.min(1.1,depth/100*1.1);}
 }
 if(kind==="pipe-flow"){
  const area=THREE.MathUtils.clamp(a,.0001,1),speed=THREE.MathUtils.clamp(b,0,50),ratio=THREE.MathUtils.clamp(Math.sqrt(area/.01),.35,1.8);
  if(d.pipeIn)d.pipeIn.scale.set(1,ratio,ratio);if(d.pipeOut)d.pipeOut.scale.set(1,ratio,ratio);
  (d.flowMarkers||[]).forEach((m,i)=>{const q=(t*speed*.16+i*.12)%1; m.position.x=-1.55+q*3.1;m.position.y=Math.sin(i*2.1+t)*.08*ratio;});
 }
 if(kind==="calorimetry"){
  const delta=THREE.MathUtils.clamp(b,0,100),fraction=THREE.MathUtils.clamp(delta/100,0,1);
  if(d.calWater)d.calWater.material.color.setHSL(.56-fraction*.5,.7,.48);
  if(d.calMercury)d.calMercury.scale.y=.15+fraction*.7;
  if(d.calMercury)d.calMercury.position.y=-.55+fraction*.4;
 }
 if(kind==="phase-change"){
  const progress=(t*.12)%1;
  if(d.iceBlock){d.iceBlock.scale.set( .5*(1-progress),.48*(1-progress),.48*(1-progress));d.iceBlock.visible=progress<.96;}
  (d.phaseParticles||[]).forEach((p,i)=>{const q=(t*.1+i*.037)%1;p.position.x=Math.sin(q*6.28+i)*.48;p.position.y=-.35+Math.abs(Math.sin(q*6.28+i*.7))*.42;p.position.z=Math.cos(q*6.28+i)*.28;});
  if(d.phaseHeater)d.phaseHeater.material.emissiveIntensity=.2+progress*.8;
 }
 if(kind==="blackbody"){
  const temp=THREE.MathUtils.clamp(a,300,10000),norm=(temp-300)/9700;
  if(d.blackHot){d.blackHot.material.color.setHSL(.08-norm*.08,.9,.5+norm*.08);d.blackHot.material.emissive.setHSL(.08-norm*.08,.95,.35+norm*.55);d.blackHot.material.emissiveIntensity=.35+norm*1.5;d.blackHot.scale.setScalar(.75+norm*.6);}
  (d.spectrumBars||[]).forEach((bar,i)=>{const peak=Math.max(0,1-Math.abs(i-(5-norm*4))/2.3);bar.scale.y=.12+peak*.65;bar.position.y=-.55+bar.scale.y/2;});
 }
 if(kind==="circular-motion"){
  const speed=THREE.MathUtils.clamp(a,0,30),r=THREE.MathUtils.clamp(b,.1,20),rr=THREE.MathUtils.clamp(r*.075,.22,1.45),omega=speed/Math.max(r,.1),ang=t*THREE.MathUtils.clamp(omega,0,8);
  if(d.circularMass)d.circularMass.position.set(rr*Math.cos(ang),.05,rr*Math.sin(ang));
  if(d.circularOrbit)d.circularOrbit.scale.setScalar(rr/1.1);
  if(d.circularRadius){d.circularRadius.geometry.dispose();d.circularRadius.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.05,0),new THREE.Vector3(rr*Math.cos(ang),.05,rr*Math.sin(ang))]);}
 }
}




PHY TOOLS — SUPER ADVANCED FULL WEBSITE PACKAGE
================================================

මෙම ZIP එක සම්පූර්ණ website package එකකි. මෙය පළමුව TEST repository එකට පමණක් upload කරන්න. Original/live PHY-tools repository එකට තවම upload කරන්න එපා.

ප්‍රධාන අන්තර්ගතය
------------------
• index.html — ප්‍රධාන පිටුව, syllabus units සහ tool catalogue
• tools.html — තෝරාගත් syllabus unit එකේ tools
• simulate.html — වෙනම simulator page template එක; tool ID එක අනුව data/catalog.json වෙතින් data ලබාගනී
• boyles-with-sound.html — Boyle's Law සඳහා වෙනම 3D laboratory simulator
• admin.html / js/admin.js — admin controls
• about.html / 404.html — අනෙකුත් website pages
• data/catalog.json — tools 130 සහ syllabus units 10 සඳහා metadata/calculation definitions
• js/physics-engine.js — Three.js 3D scene, physics models, animation loop සහ camera controls
• js/advanced-apparatus.js — 52 visual families සඳහා අමතර laboratory apparatus, calibrated fittings, instruments සහ dynamic live display
• js/simulator.js / js/simulator-loader.js — simulator controls, calculations, graphs, audio, language සහ loading
• css/ — responsive site සහ simulator design
• firebase/ සහ js/firebase-config.js — Firebase config සහ Firestore rules

3D upgrade එකේ ස්වභාවය
-----------------------
1. Catalog එකේ tools 130ක් සහ syllabus units 10ක් ඇත.
2. ඒවා visualType පදනම් වූ විශේෂිත 3D model families 52කට බෙදා ඇත. එක් එක් tool එක එයට අදාළ family model එක සහ tool-specific update logic භාවිත කරයි; 130ම වෙන වෙනම 130 bespoke CAD files නොවේ.
3. Advanced apparatus layer එක family අනුව laboratory stands, optical/motion rails, calibrated scales, bearings, pendulum fixtures, wave drivers, gas/thermal instruments, fluid gauges, electrical/electronic benches, nuclear/optical detector fixtures වැනි කොටස් එක් කරයි.
4. Tool එකේ input labels, units සහ title අනුව live instrument panel එක පෙන්වයි. Sinhala/English මාරු කළ විට panel text ද වෙනස් වේ.
5. Original physics model update loop එක සහ slider inputs පවත්වා ගනී; advanced layer එක ඒ 3D model එක වටා instrument/appartus visuals සහ live indicators එක් කරයි.
6. Model framing, lighting, shadows, camera controls, responsive resize සහ disposal logic ඇතුළත් වේ.
7. Three.js external CDN එකකින් load වේ. GitHub Pages වෙතින් 3D සඳහා අන්තර්ජාල සම්බන්ධතාව සහ WebGL සහිත නවීන browser එකක් අවශ්‍ය වේ.

Boyle's Law
-----------
Boyle's Law හි වත්මන් standalone 3D page එක මෙම update එකේදී වෙනස් කර නැත. එහි piston, gas molecules, volume/temperature sliders (100–1000 K; default 800 K), pressure/volume/PV readouts, live P–V graph, sound, camera සහ English/Sinhala UI පවතී. Baseline package එකේ boyles-with-sound.html සමඟ byte-level compare එකේ වෙනසක් නොමැති බව තහවුරු කළා.

පරීක්ෂණය සහ සීමාවන්
--------------------
• catalog JSON parse: සමත්
• tools: 130
• syllabus units: 10
• visual model families: 52
• catalog visualType coverage: සියල්ල advanced family list එකෙන් ආවරණය වේ
• JavaScript module/classic syntax checks: සමත්
• HTML local CSS/JS asset references: සමත්
• Boyle's Law standalone page: baseline එකට සමානයි
• ZIP integrity: සකස් කිරීමේදී වෙනම unzip test එකක් සිදු කර ඇත

වැදගත්: මෙම පරිසරයෙන් external Three.js CDN සහ live browser WebGL rendering එක 130ම එකින් එක ධාවනය කර තහවුරු කිරීමට නොහැකි විය. එබැවින් මේ package එකේ static/code-level checks සමත් වුවද, සියලු 130 simulation behaviors විද්‍යාත්මකව/ browser එකකින් 100% validate කර ඇතැයි නොකියයි. Test repository එකේ සැබෑ browser testing අනිවාර්යයි. Advanced apparatus visuals යනු අධ්‍යාපනික procedural 3D models වන අතර photorealistic CAD assets නොවේ.

Firebase සම්බන්ධ වැදගත් අවවාදය
-------------------------------
මෙම package එකේ js/firebase-config.js තවමත් ඔයාගේ දැනට භාවිත කරන phy-tools Firebase project එකට සම්බන්ධයි. ඒ නිසා TEST website එකේ public simulations බලන එක කළ හැකි නමුත් admin panel එකෙන් add/delete/publish වැනි දත්ත වෙනස් කරන පරීක්ෂණ කරන්න එපා; ඒවා shared Firebase database එකට බලපාන්න පුළුවන්. Admin workflow එක වෙන්ව පරීක්ෂා කිරීමට වෙනම Firebase test project එකක් සහ එයට ගැළපෙන config/rules අවශ්‍යයි.

TEST REPOSITORY එකට upload කිරීම
--------------------------------
1. ZIP එක Extract කරන්න.
2. Extract කළ PHY-Tools-Super-Advanced-Full-Site folder එක open කරන්න.
3. එහි ඇතුළත files සහ folders සියල්ල select කරන්න; wrapper folder එකම nested folder ලෙස upload කරන්න එපා.
4. Niwansathsara/test repository එකේ root එකට upload කර මේ package එකේ files replace කරන්න.
5. Commit changes කරන්න.
6. GitHub Pages settings දැනටමත් Deploy from a branch → main → /(root) නම් ඒවා වෙනස් කරන්න එපා.
7. https://niwansathsara.github.io/test/ වෙත ගොස් Ctrl+Shift+R කරන්න.
8. Boyle's Law සහ visual families කිහිපයක් (pendulum, projectile, wave, gas, circuit, fluid, optics/atomic) පරීක්ෂා කරන්න.

Original PHY-tools repository එක update නොකරන්න; test site එකේ සියලු වැදගත් කොටස් තහවුරු කළ පසු පමණක් production update එකක් කරන්න.

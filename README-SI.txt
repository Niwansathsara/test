PHY TOOLS — TEST REPOSITORY UPDATE (SINHALA)
==============================================

මෙම package එක TEST repository එක සඳහා පමණි. දැනට live/original PHY-tools repository එක වෙනස් නොකරන්න.

මෙම version එකේ ප්‍රධාන වෙනස:
- Category තෝරාගත් විට tools වෙනම tools.html page එකේ පෙන්වයි.
- Simulation card එක click කළ විට iframe/srcdoc නොව සැබෑ වෙනම URL එකකට යයි:
    simulate.html?id=<tool-id>
- Boyle's Law සඳහා වෙනම boyles-with-sound.html page එක භාවිත කරයි.
- Simulation page එකෙන් ආපසු එන විට කලින් තෝරාගත් category එකටම යයි.
- 3D engine load නොවුණත් controls, calculations, graphs, language සහ sound UI ආරම්භ වීමට simulator.js වෙනස් කර ඇත.
- Three.js + OrbitControls සඳහා browser internet connection අවශ්‍යයි. WebGL අවශ්‍ය browser වල 3D දර්ශනය ක්‍රියා කරයි.

UPLOAD — TEST REPOSITORY ONLY
-----------------------------
1. ZIP එක Extract කරන්න.
2. PHY-Tools-Dedicated-Simulator-Fix folder එක ඇතුළට යන්න.
3. එහි ඇති සියලු files සහ folders test repository එකේ root එකට upload කරන්න.
4. GitHub කියන විට files replace කරන්න. index.html, tools.html සහ js/ files අනිවාර්යයෙන් replace විය යුතුයි.
5. Commit changes කරන්න.
6. GitHub Pages settings: Deploy from a branch → main → /(root).
7. Test URL: https://niwansathsara.github.io/PHY-tools-test/  (repository නම වෙනස් නම් URL එකට ඒ නම යොදන්න.)

TEST ORDER
----------
A. Home page → category card → category tools page.
B. Tool 001 (SI Unit Converter) → simulate.html?id=si-unit-converter.
C. Slider වෙනස් කරන්න → metric/result/graph වෙනස් විය යුතුයි.
D. Play/Pause සහ Reset පරීක්ෂා කරන්න.
E. Sound On/Off සහ English/Sinhala පරීක්ෂා කරන්න.
F. View controls, rotate, zoom සහ fullscreen පරීක්ෂා කරන්න.
G. Boyle's Law වෙත ගොස් slider, particle toggle, sound සහ fullscreen පරීක්ෂා කරන්න.
H. Browser Console එකේ errors තිබේද පරීක්ෂා කරන්න.

FILE STRUCTURE
--------------
index.html              Main categories page
 tools.html             Selected syllabus unit page
 simulate.html          Standalone simulator page
 boyles-with-sound.html Separate Boyle's Law simulation
 js/simulator-loader.js Loads selected tool data from data/catalog.json
 js/simulator.js        Simulator controls, calculations and language
 js/physics-engine.js   Three.js 3D scene engine
 data/catalog.json      10 syllabus units + 130 simulation definitions
 css/tool.css           Simulator page design

LIMITATIONS
-----------
- 130 tool definitions and their display/calculation setup are included. This is not a claim that every topic has a fully research-validated bespoke physical model. Some concepts share visual archetypes in the 3D engine.
- Three.js is loaded from jsDelivr CDN. If that CDN is blocked by the user's network, the 3D model will show an error, but the controls/calculation interface remains usable.
- Test the package on the TEST repository first. Do not deploy it to the original repository until the test passes.

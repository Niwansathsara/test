PHY TOOLS — TEST PACKAGE උපදෙස්
===============================

මෙම ZIP එක TEST repository එකට පමණක් upload කරන්න. දැනට වැඩ කරන original/live repository එකට තවම upload කරන්න එපා.

මෙම සංස්කරණයේ ප්‍රධාන වෙනස්කම්
--------------------------------
1. සාමාන්‍ය simulator වල Three.js WebGL renderer එක Boyle's Law හි ක්‍රියාත්මක renderer settings වලට සමාන කර ඇත. Antialiasing context එක සකස් කළ නොහැකි නම් අඩු resource භාවිත කරන renderer එකකින් නැවත උත්සාහ කරයි.
2. 3D model එක ආරම්භ නොවුණොත් දැන් generic message එකක් පමණක් නොව browser එකෙන් ලැබුණු සැබෑ error name/message එකත් පෙන්වයි.
3. Energy Forms and Changes tool එකේ වැරදි gas piston model එක වෙනුවට beaker/calorimeter, water, heater, thermometer සහ heat indicators ඇති thermal model එකක් යොදා ඇත.
4. Gas-law simulations වල piston සහ gas-particle model එක තවදුරටත් වෙනම පවතී.
5. Simulator page එකේ equation, graph, result, input controls, pause/reset, camera, fullscreen, sound, What to observe, Study note සහ අලුත් How to investigate උපදෙස් ඇතුළත්ය.
6. How to investigate සහ 3D error details English/Sinhala භාෂා දෙකෙන්ම පෙන්වයි.
7. Main, category, simulator, admin සහ Boyle pages වල PHY logo scroll කරන විටත් පෙනෙන ලෙස header එක sticky කර ඇත. 404/About pages වලත් PHY favicon යොදා ඇත.

TEST REPOSITORY එකට upload කරන ආකාරය
-------------------------------------
1. ZIP එක Extract කරන්න.
2. Extract කළ folder එකේ ඇතුළත සියලු files සහ folders select කරන්න.
3. PHY-tools-test repository එකේ root එකට upload කර පරණ package files replace කරන්න.
4. index.html, tools.html, simulate.html, boyles-with-sound.html, js/, css/, data/, firebase/ ඇතුළු package එකේ files සියල්ලම upload විය යුතුය.
5. Commit changes කරන්න.
6. GitHub Pages: Deploy from a branch → main → /(root).
7. Test site එක Ctrl+F5 සමඟ නැවත load කරන්න.

පළමුව පරීක්ෂා කළ යුතු දේ
-------------------------
A. Energy Forms and Changes — දැන් beaker, heater, thermometer දෘශ්‍යමාන විය යුතුය.
B. Gas Laws යටතේ Boyle/Charles/Ideal Gas tools — piston හා particles පෙන්විය යුතුය.
C. Play/Pause, Reset, sliders, camera rotate/zoom, fullscreen සහ sound.
D. Sinhala/English මාරු කිරීම.
E. Scroll කළ විට PHY logo/header පෙනී තිබීම.
F. Boyle's Law — පරණ ක්‍රියාකාරී 3D simulation එක වෙනස් වී නැතිදැයි බලන්න.

තවම 3D model එක load නොවුණොත්
-------------------------------
දැන් 3D stage එකේම තාක්ෂණික error එක පෙන්වයි. එහි error detail එක copy කර හෝ screenshot එකක් එවන්න. ඒකෙන් WebGL context ද, CDN/module loading ද, Three.js scene initialization ද කියලා වෙන් කර හඳුනාගත හැකියි.

වැදගත් සීමාව
-------------
මෙම සකස් කිරීමේ පරිසරයෙන් external CDN host එකට සම්බන්ධ විය නොහැකි නිසා GitHub Pages live WebGL render එක browser එකකින් තහවුරු කර නැත. මෙහි JavaScript syntax, catalogue, model type mapping, page structure සහ ZIP integrity පමණක් ස්ථිතිකව පරීක්ෂා කර ඇත. සැබෑ browser test එක TEST repository එකේ කළ යුතුය.

Tools 130ම catalogue එකේ ඇත. ඒවා topic-oriented shared 3D model families භාවිත කරයි; 130ම වෙන වෙනම bespoke 3D models නොවේ. සියලු භෞතික සූත්‍ර/උපකල්පනත් සම්පූර්ණ syllabus audit එකකින් තහවුරු කර නැත.


PHY TOOLS – UNIVERSAL SIMULATOR UPDATE
=====================================
මෙම සංස්කරණයේ සෑම simulator පිටුවකටම පාලක, අඩු/මූලික/වැඩි පරීක්ෂණ අගයන්, A-/A+/B-/B+ buttons, Play/Pause, Reset, animation speed, camera controls, Sound On/Off, Fullscreen, live graph, graph axis switch සහ reading capture/clear ඇතුළත් කර ඇත.
සෑම tool එකකටම එහිම සූත්‍රය, ආදාන, දෘශ්‍ය ආකෘතිය සහ පියවරෙන් පියවර භාවිත උපදෙස් English සහ Sinhala දෙකෙන් එක් කර ඇත.
Boyle's Law original standalone page එක වෙනස් කර නැත.

පරීක්ෂණයෙන් හඳුනාගත් නිවැරදි කිරීම්: gas-properties හි kPa × L ප්‍රතිඵලය J ලෙස නිවැරදි කිරීම; diode equation හි I0 = 1 pA ලෙස නිවැරදි කිරීම; physics animation engine එකේ input value 0 නම් එය 1 ලෙස වැරදිව සලකන bug එක නිවැරදි කිරීම.

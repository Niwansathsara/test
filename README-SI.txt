PHY TOOLS — GITHUB PAGES PACKAGE
Created by G.Niwan Sathsara
Contact: gnsclasslibrary@gmail.com

මෙම ZIP එකේ built-in simulation 130ම index.html එක තුළම ඇතුළත් කර ඇත. වෙන වෙනම tools/ folders 130ක් upload කිරීම අවශ්‍ය නැත.

1) GITHUB වෙත upload කිරීම
- ZIP එක extract කරන්න.
- Extract කළ folder එක ඇතුළේ ඇති සියලුම files/folders repository root එකට upload කරන්න.
- index.html එක repository root එකේ තිබිය යුතුය. `PHY-Tools-GitHub-Ready/PHY-Tools-GitHub-Ready/index.html` වැනි nested folder එකක් තුළ නොතබන්න.
- Repository root එකේ index.html, admin.html, tools.html, about.html, 404.html, css/, data/, js/, firebase/ සහ README-SI.txt පෙනිය යුතුය.
- GitHub Settings > Pages > Build and deployment > Source: Deploy from a branch තෝරන්න.
- Branch: main සහ Folder: /(root) තෝරා Save කරන්න.
- මෙම ZIP එකේ .github/workflows folder එකක් නැත. ඒ නිසා Pages branch deployment එක සහ Actions workflow deployment එක එකවර ක්‍රියාත්මක නොවේ.
- Website URL: https://niwansathsara.github.io/PHY-tools/

2) FIREBASE Auth සකස් කිරීම
- Firebase Console හි phy-tools project එක විවෘත කරන්න.
- Authentication > Sign-in method යටතේ Anonymous සහ Google යන providers දෙකම Enable කරන්න.
- Authentication > Settings > Authorized domains යටතේ niwansathsara.github.io තිබේද බලන්න; නැත්නම් add කරන්න.
- Google provider එකේ support email එක තෝරන්න.

3) FIRESTORE සකස් කිරීම
- Firestore Database එක create කරගන්න.
- Firestore > Rules යටතේ මෙම ZIP එකේ firebase/firestore.rules හි අන්තර්ගතය paste කර Publish කරන්න.
- Public visitors සඳහා visible login prompt එකක් නැත. Site එක Firebase Anonymous Authentication භාවිත කර visitor counters සහ admin-added units/tools read කරයි. Built-in tools Firebase නොමැතිවත් පෙන්විය යුතුය.

4) ADMIN ACCESS
- https://niwansathsara.github.io/PHY-tools/admin.html විවෘත කරන්න.
- Google sign-in කරන්නේ niwansathsara76@gmail.com verified account එකෙන් පමණි.
- Admin page එකෙන් additional syllabus units හා standalone HTML simulations add/edit/delete කළ හැක.
- Built-in 130 simulations ආරක්ෂා කර ඇත. Built-in unit එකක් edit කළ හැකි අතර Reset කිරීමෙන් original details නැවත ලැබේ.
- Uploaded HTML එකක් 800 KB ට අඩු විය යුතුය. එය Firestore document එකක් ලෙස සුරැකේ.

5) ONLINE / TOTAL VISITORS
- Public page එකට anonymous Firebase session එකක් භාවිතා කර unique visitor record එකක් ලියයි.
- Online count එක last 90 seconds තුළ heartbeat ලබාදුන් browsers ගණන් කරයි; heartbeat එක තත්පර 30කට වරක් යාවත්කාලීන වේ.
- Total visitors යනු Firestore siteVisitors collection එකේ browser IDs ගණනයි.

6) වැදගත්
- index.html එකේ built-in simulations 130ම සහ Boyle’s Law original 3D simulation එක embedded වේ. අනෙක් tools සඳහා 3D scene engine එක shared වේ; ඒවා එකිනෙක වෙනස් physics lesson model types අනුව පරාමිතීන් ලබා ගනී. සියලුම 130 tools විෂය කරුණු අනුව එකින් එක විද්‍යාත්මකව ස්වාධීනව validate කර ඇති බවක් මෙම package එකෙන් අදහස් නොවේ.
- Three.js 3D graphics සඳහා Internet සම්බන්ධතාවය සහ WebGL-enabled browser එකක් අවශ්‍ය වේ.
- Firebase web API key එක browser config එකේ පෙනීම සාමාන්‍ය දෙයකි. Firestore Rules තමයි database permissions ආරක්ෂා කරන්නේ. Service-account/private key කිසිවිටෙක browser එකට upload නොකරන්න.
- Google/Firebase Authentication සහ Firestore providers/rules සකස් නොකළහොත් built-in 130 simulations තවමත් පෙන්විය යුතුය; නමුත් admin upload හා visitor stats වැඩ නොකරනු ඇත.


අලුත් සංස්කරණය - UI සහ simulation fixes
----------------------------------------
1. index.html සහ tools.html යන දෙකම එකම application code එක භාවිත කරයි. tools.html?unit=... URL එකෙන් තෝරාගත් විෂය ඒකකයේ tools පමණක් වෙනම page එකක පෙන්වයි.
2. 3D simulations සඳහා js/simulator.js සහ js/physics-engine.js භාවිත කරයි. CSS සඳහා css/tool.css අවශ්‍ය වේ. ඒවා delete නොකරන්න.
3. සාමාන්‍ය simulations සඳහා Sound: On/Off පාලකය ඇත. පළමු වරට browser එකේ sound සක්‍රිය කරන විට පරිශීලකයා button එක ඔබන්න අවශ්‍යය.
4. Boyle’s Law සඳහා දැනට තිබූ sound-enabled original simulation එක embed කර ඇත.
5. Formula audit fixes: Terminal Velocity, Diode current, Rutherford scattering; අදාළ assumptions tool note එකේ සඳහන් වේ.
6. මෙය idealised learning model එකකි. අත්හදා බැලීමේ උපකරණයකට සමාන මිනුමක් නොවේ.
7. දැනට live site එක backup branch එකක/වෙනම repository එකක තබා, අලුත් build එක පරීක්ෂා කර පසුව පමණක් replace කරන්න.


නව පරීක්ෂණ සංස්කරණයේ අමතර වෙනස්කම්
-----------------------------------------
- දැනට ක්‍රියාත්මක වන website එකේ files මකා නොදමන්න. මෙම ZIP එක පළමුව වෙනම test branch එකක හෝ test repository එකක deploy කරන්න.
- ප්‍රධාන category එකක් තෝරාගත් විට tools.html?unit=... යන වෙනම පිටුවකට යයි; එම පිටුවේ තෝරාගත් ඒකකයේ tools පමණක් පෙන්වයි.
- සෑම built-in simulation එකකම Sound: On/Off පාලකය ඇත. බ්‍රවුසරයේ ශබ්ද ප්‍රතිපත්තිය නිසා පළමු වරට ශබ්දය සක්‍රිය කිරීමට button එක පරිශීලකයා විසින් ඔබන්න අවශ්‍යය. මෙය පාලක/අගයන් වෙනස් කිරීමේ ශබ්ද ප්‍රතිචාරයකි; සියලුම පාඩම්වල භෞතික ශබ්දයේ පූර්ණ wave-synthesis ආකෘතියක් නොවේ.
- Boyle’s Law සඳහා පෙර තිබූ 3D ගෑස් අණු ආකෘතිය ආරක්ෂා කර ඇත. මුල් standalone HTML එක backups/boyles-original-backup.html තුළද ඇත.
- සාමාන්‍ය වචන සඳහා English/Sinhala පරිවර්තන යොදා ඇත. සම්මත සංකේත, SI ඒකක, විද්‍යාත්මක සූත්‍ර සහ තාක්ෂණික acronym ඒවායේ පිළිගත් ආකාරයෙන් තබා ඇත.
- මෙම ආකෘති A/L මට්ටමේ අධ්‍යාපනික idealised simulations වේ. එක් එක් model එකේ study note හි ස්ථිර කොන්දේසි සහ සීමාවන් කියවන්න. සම්පූර්ණ 130ම සියලු browser/device මත සජීවීව පරීක්ෂා කළ බව අදහස් නොවේ.
- Three.js භාවිත වන 3D models සඳහා අන්තර්ජාලය සහ WebGL අවශ්‍ය වේ. Sound browser user interaction එකකින් පසුව පමණක් සක්‍රිය වේ.

- පෙර ක්‍රියාත්මක වූ package එක backups/PHY-Tools-GitHub-Ready-previous-working.zip තුළ තබා ඇත. එය නැවත deploy කිරීමට අවශ්‍ය වුවහොත් එය rollback backup එකක් ලෙස භාවිත කරන්න. අලුත් package එක සෘජුවම live main branch එකට දමන්න කලින් වෙනම test branch/repository එකක පරීක්ෂා කරන්න.

// Erzeugt das Release-Zip (hvochat.zip) fuer ng_web_packages bzw. den Servoy Package Manager.
// Aufruf ueber "npm run make_release" (baut vorher die Library nach dist/hvo/chat).
const AdmZip = require('adm-zip');

const zip = new AdmZip();
zip.addLocalFolder('./META-INF/', '/META-INF/');
zip.addLocalFolder('./dist/hvo/chat/', '/dist/hvo/chat/');
zip.addLocalFolder('./composer/', '/composer/');
zip.addLocalFolder('./thread/', '/thread/');
zip.addLocalFolder('./feedback/', '/feedback/');
zip.writeZip('hvochat.zip');

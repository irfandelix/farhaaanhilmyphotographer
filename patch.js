const fs = require('fs');
let code = fs.readFileSync('src/app/client/[id]/page.js', 'utf8');
const startMarker = '{/* Lightbox / Preview Modal */}';
const startIdx = code.indexOf(startMarker);
const endIdx = code.lastIndexOf('</main>');
if (startIdx !== -1 && endIdx !== -1) {
  let newLightbox = fs.readFileSync('lightbox.txt', 'utf8');
  code = code.substring(0, startIdx) + newLightbox + '\n    ' + code.substring(endIdx);
  fs.writeFileSync('src/app/client/[id]/page.js', code);
  console.log('Replaced successfully');
} else { console.log('Markers not found'); }

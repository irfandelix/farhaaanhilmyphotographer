const fs = require('fs');

const file = 'src/app/client/[id]/page.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = "setPreviewIndex((activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos)).findIndex(p => p.id === photo.id))";
content = content.split(target1).join("setPreviewIndex(currentList.findIndex(p => p.id === photo.id))");

const target2 = "(activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex]";
content = content.split(target2).join("currentList[previewIndex]");

const target3 = "slides={(activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos)).map(";
content = content.split(target3).join("slides={currentList.map(");

fs.writeFileSync(file, content);
console.log('Fixed preview indexing');

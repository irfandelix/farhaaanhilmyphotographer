const fs = require('fs');

const file = 'src/components/NewClientModal.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("if (!window.confirm(confirmMsg)) {", 
  "const result = await Swal.fire({ text: confirmMsg, showCancelButton: true, confirmButtonText: 'Ya, Simpan', cancelButtonText: 'Batal' });\n        if (!result.isConfirmed) {");

content = content.replace("alert(\"Gagal membuat proyek: \" + result.error);", "Swal.fire(\"Gagal membuat proyek: \" + result.error);");

if (!content.includes("import Swal from 'sweetalert2';")) {
  content = "import Swal from 'sweetalert2';\n" + content;
}

fs.writeFileSync(file, content);
console.log('Fixed NewClientModal');

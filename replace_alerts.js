const fs = require('fs');
const path = require('path');

const files = [
  'src/app/admin/client/[id]/invoice/page.js',
  'src/app/admin/client/[id]/page.js',
  'src/app/client/[id]/invoice/page.js',
  'src/app/client/[id]/page.js',
  'src/components/NewClientModal.js'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Add import if not present
  if (content.includes('alert(') || content.includes('confirm(')) {
    if (!content.includes("import Swal from 'sweetalert2'")) {
      content = "import Swal from 'sweetalert2';\n" + content;
    }
  }

  // Replace alert('...') with Swal.fire('...')
  // We need to match alert(something)
  content = content.replace(/alert\((['"`])([\s\S]*?)\1\)/g, "Swal.fire($1$2$1)");
  // Replace alert(variable)
  content = content.replace(/alert\(([^'"`)]+)\)/g, "Swal.fire($1)");

  // Replace confirm(...) with Swal.fire for confirm
  // Since confirm is synchronous, we replace it where we can, but it needs await.
  // Actually, replacing confirm is tricky via regex because of the if statement.
  
  fs.writeFileSync(filePath, content);
});

console.log('Replaced alerts.');

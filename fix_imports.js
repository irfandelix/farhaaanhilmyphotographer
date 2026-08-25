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

  if (content.startsWith("import Swal from 'sweetalert2';\n'use client';")) {
    content = content.replace("import Swal from 'sweetalert2';\n'use client';", "'use client';\nimport Swal from 'sweetalert2';");
  } else if (content.startsWith("import Swal from 'sweetalert2';\n")) {
    // maybe it doesn't have use client, or it's somewhere else
    if (content.includes("'use client';")) {
        content = content.replace("import Swal from 'sweetalert2';\n", "");
        content = content.replace("'use client';", "'use client';\nimport Swal from 'sweetalert2';");
    }
  }

  fs.writeFileSync(filePath, content);
});

console.log('Fixed imports.');

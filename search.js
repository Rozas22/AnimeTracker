const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') search(full);
    } else {
      try {
        const code = fs.readFileSync(full, 'utf8');
        if (code.includes('notifications')) {
          console.log(full);
        }
      } catch (e) {}
    }
  });
}
search('.');
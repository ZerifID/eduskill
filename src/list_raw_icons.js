const fs = require('fs');
const path = require('path');
const vm = require('vm');

const lucideCode = fs.readFileSync(path.join(__dirname, 'public/lucide.min.js'), 'utf8');
const sandbox = { window: {}, document: { querySelectorAll: () => [] } };
vm.runInNewContext(lucideCode, sandbox);
const lucide = sandbox.lucide;

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) results = results.concat(walk(p));
    else if (p.endsWith('.ejs')) results.push(p);
  });
  return results;
}

const allUsed = new Set();
walk(path.join(__dirname, 'views')).forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /data-lucide=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    allUsed.add(match[1]);
  }
});

console.log('All unique raw data-lucide entries:');
[...allUsed].sort().forEach(u => console.log(' - ', u));

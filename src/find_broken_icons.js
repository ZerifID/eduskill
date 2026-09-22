const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, 'public/lucide.min.js'), 'utf8');
const sandbox = {};
vm.runInNewContext(code, sandbox);

function toKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

const availablePascal = Object.keys(sandbox.lucide.icons || {});
const availableKebab = new Set(availablePascal.map(toKebab));

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) results = results.concat(walk(p));
    else if (p.endsWith('.ejs')) results.push(p);
  });
  return results;
}

const usedIcons = new Set();
walk(path.join(__dirname, 'views')).forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /data-lucide=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    usedIcons.add(match[1]);
  }
});

console.log('--- ICON COMPATIBILITY CHECK ---');
usedIcons.forEach(icon => {
  if (icon.includes('<%')) {
    console.log(`⚠️ Dynamic icon: "${icon}"`);
  } else if (availableKebab.has(icon)) {
    // console.log(`✓ ${icon}`);
  } else {
    console.log(`❌ NOT RECOGNIZED BY LUCIDE: "${icon}"`);
    // Cari nama yang mirip
    const suggestions = [...availableKebab].filter(k => k.includes(icon) || icon.includes(k));
    console.log(`   -> Suggestions: ${suggestions.slice(0, 5).join(', ')}`);
  }
});

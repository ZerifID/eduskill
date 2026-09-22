const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      results = results.concat(walk(p));
    } else if (p.endsWith('.ejs')) {
      results.push(p);
    }
  });
  return results;
}

const icons = {};
walk(path.join(__dirname, 'views')).forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /data-lucide=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const icon = match[1];
    if (!icons[icon]) icons[icon] = [];
    icons[icon].push(path.relative(path.join(__dirname, 'views'), f));
  }
});

console.log('List of Lucide icons used:');
Object.keys(icons).sort().forEach(icon => {
  console.log(`- ${icon} (used in ${icons[icon].length} places: ${[...new Set(icons[icon])].join(', ')})`);
});

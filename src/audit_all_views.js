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

function toPascal(str) {
  return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

console.log('=== CHECKING ALL ICONS ACROSS ALL VIEWS ===');
walk(path.join(__dirname, 'views')).forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(path.join(__dirname, 'views'), filePath);
  
  // Find all data-lucide="..." occurrences
  const regex = /data-lucide=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const rawIcon = match[1];
    
    // If it contains EJS ternary like <%= a ? 'icon1' : 'icon2' %>
    const subMatches = rawIcon.match(/'([a-z0-9-]+)'|"([a-z0-9-]+)"/g);
    if (subMatches) {
      subMatches.forEach(sm => {
        const iconName = sm.replace(/['"]/g, '');
        const pascal = toPascal(iconName);
        if (!lucide[pascal] && !lucide.icons?.[pascal]) {
          console.log(`❌ [${relPath}] Dynamic Icon Missing: "${iconName}" (Pascal: ${pascal}) in \`${rawIcon}\``);
        } else {
          // console.log(`✅ [${relPath}] Dynamic OK: ${iconName}`);
        }
      });
    } else {
      const pascal = toPascal(rawIcon);
      if (!lucide[pascal] && !lucide.icons?.[pascal]) {
        console.log(`❌ [${relPath}] Static Icon Missing: "${rawIcon}" (Pascal: ${pascal})`);
      } else {
        // console.log(`✅ [${relPath}] OK: ${rawIcon}`);
      }
    }
  }
});
console.log('=== CHECK COMPLETE ===');

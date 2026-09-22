const fs = require('fs');
const path = require('path');
const vm = require('vm');

const lucideCode = fs.readFileSync(path.join(__dirname, 'public/lucide.min.js'), 'utf8');
const sandbox = { window: {}, document: { querySelectorAll: () => [] } };
vm.runInNewContext(lucideCode, sandbox);
const lucide = sandbox.lucide;

console.log('Available Lucide icon keys count:', Object.keys(lucide.icons || {}).length);

// Standard mapping for Lucide kebab-case names that are 100% valid in Lucide
// We map deprecated/renamed icons to standard Lucide icons
const iconReplacements = {
  'edit-3': 'pencil',
  'edit-2': 'pencil',
  'edit': 'pencil',
  'trash-2': 'trash',
  'check-circle-2': 'circle-check',
  'check-circle': 'circle-check',
  'alert-triangle': 'triangle-alert',
  'alert-circle': 'circle-alert',
  'help-circle': 'circle-help',
  'play-circle': 'circle-play',
  'plus-circle': 'circle-plus',
  'x-circle': 'circle-x',
  'code-2': 'code',
  'file-check-2': 'file-check',
  'shield-alert': 'shield-alert',
  'shield-check': 'shield-check',
  'shopping-cart': 'shopping-cart',
  'shopping-bag': 'shopping-bag',
  'sparkles': 'sparkles',
  'graduation-cap': 'graduation-cap',
  'layout-dashboard': 'layout-dashboard',
  'book-open': 'book-open',
  'users': 'users',
  'wallet': 'wallet',
  'clock': 'clock',
  'folder-open': 'folder-open',
  'folder-plus': 'folder-plus',
  'folder-tree': 'folder-tree',
  'folder-check': 'folder-check',
  'network': 'network',
  'file-text': 'file-text',
  'file-plus': 'file-plus',
  'file-archive': 'file-archive',
  'file-down': 'file-down',
  'file-check': 'file-check',
  'arrow-left': 'arrow-left',
  'chevron-right': 'chevron-right',
  'corner-down-right': 'corner-down-right',
  'credit-card': 'credit-card',
  'download': 'download',
  'upload-cloud': 'upload',
  'eye': 'eye',
  'image': 'image',
  'inbox': 'inbox',
  'info': 'info',
  'lock': 'lock',
  'unlock': 'lock-open',
  'log-in': 'log-in',
  'log-out': 'log-out',
  'message-square': 'message-square',
  'paperclip': 'paperclip',
  'play': 'play',
  'plus': 'plus',
  'qr-code': 'qr-code',
  'save': 'save',
  'send': 'send',
  'user-plus': 'user-plus',
  'video-off': 'video-off',
  'zap': 'zap',
  'circle': 'circle',
  'check': 'check',
  'award': 'award',
  'compass': 'compass',
  'activity': 'activity',
  'x': 'x'
};

function toPascal(str) {
  return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

// Verify each mapped icon exists in Lucide
Object.entries(iconReplacements).forEach(([oldName, newName]) => {
  const pascal = toPascal(newName);
  if (!lucide.icons?.[pascal] && !lucide[pascal]) {
    console.error(`❌ ERROR: replacement "${newName}" (from "${oldName}") does NOT exist in Lucide!`);
  } else {
    // console.log(`✅ ${oldName} -> ${newName} (${pascal}) is valid`);
  }
});

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) results = results.concat(walk(p));
    else if (p.endsWith('.ejs')) results.push(p);
  });
  return results;
}

// Apply fixes to all EJS files
walk(path.join(__dirname, 'views')).forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace data-lucide="..."
  for (const [oldIcon, newIcon] of Object.entries(iconReplacements)) {
    if (oldIcon === newIcon) continue;
    
    // Replace exact occurrences inside quotes
    const r1 = new RegExp(`data-lucide=["']${oldIcon}["']`, 'g');
    if (r1.test(content)) {
      content = content.replace(r1, `data-lucide="${newIcon}"`);
      modified = true;
    }

    // Replace inside ternaries like 'oldIcon' or "oldIcon"
    const r2 = new RegExp(`'${oldIcon}'`, 'g');
    if (r2.test(content)) {
      content = content.replace(r2, `'${newIcon}'`);
      modified = true;
    }
    const r3 = new RegExp(`"${oldIcon}"`, 'g');
    if (r3.test(content)) {
      content = content.replace(r3, `"${newIcon}"`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated icons in: ${path.relative(path.join(__dirname, 'views'), filePath)}`);
  }
});

console.log('🎉 All icons synchronized and updated successfully!');

const fs = require('fs');
const path = require('path');

// Read the downloaded lucide.min.js to get all valid icon names
const lucideContent = fs.readFileSync(path.join(__dirname, 'public/lucide.min.js'), 'utf8');

const usedIcons = [
  'activity', 'alert-circle', 'alert-triangle', 'arrow-left', 'award', 'book-open',
  'check', 'check-circle', 'check-circle-2', 'chevron-right', 'circle', 'clock',
  'code-2', 'compass', 'corner-down-right', 'credit-card', 'download', 'edit-2',
  'edit-3', 'external-link', 'eye', 'file-archive', 'file-check', 'file-check-2',
  'file-down', 'file-plus', 'file-text', 'folder-check', 'folder-open', 'folder-plus',
  'folder-tree', 'graduation-cap', 'help-circle', 'image', 'inbox', 'info',
  'layout-dashboard', 'lock', 'log-in', 'log-out', 'message-square', 'network',
  'paperclip', 'play', 'play-circle', 'plus', 'plus-circle', 'qr-code', 'save',
  'send', 'shield-alert', 'shield-check', 'shopping-bag', 'shopping-cart',
  'sparkles', 'trash-2', 'unlock', 'upload-cloud', 'user-plus', 'users',
  'video-off', 'wallet', 'x', 'x-circle', 'zap'
];

console.log('Checking Lucide icons:');
usedIcons.forEach(icon => {
  // Lucide icon names in camelCase or in lucide object
  // Lucide converts kebab-case to camelCase: check-circle-2 -> CheckCircle2 or checkCircle2
  const camel = icon.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
  const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
  const found = lucideContent.includes(`"${icon}"`) || lucideContent.includes(`"${pascal}"`) || lucideContent.includes(`${pascal}:`) || lucideContent.includes(`"${camel}"`);
  if (!found) {
    console.log(`❌ Icon NOT FOUND in Lucide: ${icon} (Pascal: ${pascal})`);
  } else {
    // console.log(`✓ ${icon}`);
  }
});

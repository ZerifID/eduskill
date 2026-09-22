const fs = require('fs');
const path = require('path');

const lucideContent = fs.readFileSync(path.join(__dirname, 'public/lucide.min.js'), 'utf8');

// Test icons
const iconsToCheck = [
  'sparkles', 'layout-dashboard', 'book-open', 'file-check', 'log-out', 'log-in',
  'user-plus', 'check-circle', 'check-circle-2', 'circle-check', 'alert-triangle', 'triangle-alert',
  'plus-circle', 'circle-plus', 'users', 'graduation-cap', 'shopping-bag', 'wallet', 'clock',
  'folder-open', 'plus', 'network', 'edit-3', 'edit-2', 'trash-2', 'file-plus', 'play-circle',
  'circle-play', 'file-text', 'unlock', 'lock', 'corner-down-right', 'x', 'compass', 'code-2',
  'play', 'chevron-right', 'shopping-cart', 'eye', 'file-check-2', 'activity', 'alert-circle',
  'circle-alert', 'upload-cloud', 'send', 'award', 'download', 'file-archive', 'help-circle',
  'circle-help', 'shield-alert', 'shield-check', 'message-square', 'paperclip', 'qr-code',
  'save', 'info', 'video-off', 'zap', 'image', 'file-down', 'circle', 'x-circle', 'circle-x'
];

console.log('Icon Check Results:');
iconsToCheck.forEach(icon => {
  // Check if string contains "icon-name" or similar
  const exists = lucideContent.includes(`"${icon}"`) || lucideContent.includes(`'${icon}'`);
  if (!exists) {
    console.log(`❌ MISSING: "${icon}"`);
  } else {
    console.log(`✅ OK: "${icon}"`);
  }
});

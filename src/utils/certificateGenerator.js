const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

/**
 * ============================================================
 * FONT REGISTRATION (WAJIB — inilah fix utamanya)
 * ============================================================
 * @napi-rs/canvas di Linux TIDAK auto-fallback ke font sistem
 * seperti di browser. Kalau font "Arial"/"Georgia" tidak
 * terdaftar secara eksplisit, ctx.fillText() akan diam-diam
 * gagal render (tidak error, tapi teks jadi invisible).
 *
 * Solusinya: daftarkan file .ttf secara manual dengan alias
 * nama yang SAMA PERSIS dengan yang dipakai di ctx.font di bawah.
 * Ini membuat hasilnya konsisten di Windows, macOS, Linux,
 * maupun di dalam Docker/VPS — tidak tergantung font OS.
 * ============================================================
 */
const FONT_DIR = path.join(__dirname, '../assets/fonts');

const fontsToRegister = [
  { file: 'LiberationSans-Regular.ttf', alias: 'CertSans' },
  { file: 'LiberationSans-Bold.ttf', alias: 'CertSans' }, // bold dipanggil via 'bold' di ctx.font
  { file: 'LiberationSerif-Regular.ttf', alias: 'CertSerif' },
  { file: 'LiberationSerif-Bold.ttf', alias: 'CertSerif' },
  { file: 'LiberationSerif-Italic.ttf', alias: 'CertSerif' },
  { file: 'GreatVibes-Regular.ttf', alias: 'CertScript' },
];

let fontsReady = false;

function ensureFontsRegistered() {
  if (fontsReady) return; // hanya daftar sekali per proses

  if (!fs.existsSync(FONT_DIR)) {
    console.warn(
      `[certificateGenerator] Folder font tidak ditemukan: ${FONT_DIR}. ` +
      `Teks di sertifikat TIDAK AKAN muncul. Taruh file .ttf di folder tsb.`
    );
    fontsReady = true;
    return;
  }

  for (const { file, alias } of fontsToRegister) {
    const fontPath = path.join(FONT_DIR, file);
    if (fs.existsSync(fontPath)) {
      try {
        GlobalFonts.registerFromPath(fontPath, alias);
      } catch (err) {
        console.warn(`[certificateGenerator] Gagal register font ${file}:`, err.message);
      }
    } else {
      console.warn(`[certificateGenerator] File font hilang, dilewati: ${fontPath}`);
    }
  }

  fontsReady = true;
}

/**
 * Helper: Menggambar bentuk Diamond (Belah Ketupat)
 */
function drawDiamond(ctx, x, y, width, height, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - height / 2);
  ctx.lineTo(x + width / 2, y);
  ctx.lineTo(x, y + height / 2);
  ctx.lineTo(x - width / 2, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Helper: Word Wrap untuk memecah teks panjang menjadi beberapa baris
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

/**
 * Generate High-Resolution Professional Certificate
 */
async function generateCertificateImage({ studentName, courseTitle, certCode, certificateCode, issueDate }) {
  ensureFontsRegistered(); // <-- panggil sebelum menggambar apapun

  const finalCertCode = certCode || certificateCode || 'CERT-DEMO';
  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. BACKGROUND: Modern Radial Gradient (Deep Navy to Slate Black)
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, 1200);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. MODERN BORDERS (Clean & Elegant)
  const margin = 50;

  ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(margin + 12, margin + 12, width - (margin + 12) * 2, height - (margin + 12) * 2);

  const cornerLength = 80;
  const offset = margin + 12;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 8;

  const corners = [
    [offset, offset, offset + cornerLength, offset, offset, offset + cornerLength],
    [width - offset, offset, width - offset - cornerLength, offset, width - offset, offset + cornerLength],
    [offset, height - offset, offset + cornerLength, height - offset, offset, height - offset - cornerLength],
    [width - offset, height - offset, width - offset - cornerLength, height - offset, width - offset, height - offset - cornerLength]
  ];

  corners.forEach(([startX, startY, endX1, endY1, endX2, endY2]) => {
    ctx.beginPath();
    ctx.moveTo(endX1, endY1);
    ctx.lineTo(startX, startY);
    ctx.lineTo(endX2, endY2);
    ctx.stroke();
  });

  // 3. HEADER: Brand
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const brandText = 'EDUSKILL ACADEMY OF TECHNOLOGY';
  ctx.font = 'bold 20px "CertSans"';
  ctx.letterSpacing = '8px';
  ctx.fillStyle = '#fbbf24';

  const brandWidth = ctx.measureText(brandText).width;
  ctx.fillText(brandText, width / 2, 175);

  drawDiamond(ctx, (width / 2) - (brandWidth / 2) - 40, 175, 12, 20, '#fbbf24');
  drawDiamond(ctx, (width / 2) + (brandWidth / 2) + 40, 175, 12, 20, '#fbbf24');

  ctx.letterSpacing = '0px';

  // 4. MAIN TITLE
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px "CertSerif"';
  ctx.letterSpacing = '6px';
  ctx.fillText('SERTIFIKAT KELULUSAN', width / 2, 260);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 24px "CertSerif"';
  ctx.letterSpacing = '3px';
  ctx.fillText('Certificate of Completion & Professional Mastery', width / 2, 320);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 150, 370);
  ctx.lineTo(width / 2 + 150, 370);
  ctx.stroke();
  drawDiamond(ctx, width / 2, 370, 16, 24, '#f59e0b');

  // 5. RECIPIENT
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '20px "CertSans"';
  ctx.letterSpacing = '4px';
  ctx.fillText('DIBERIKAN DENGAN BANGGA KEPADA:', width / 2, 450);

  const nameToPrint = studentName || 'Nama Siswa';
  ctx.font = 'bold 76px "CertSerif"';
  ctx.letterSpacing = '2px';

  ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#fef08a';
  ctx.fillText(nameToPrint, width / 2, 540);

  ctx.shadowBlur = 0;

  const nameWidth = ctx.measureText(nameToPrint).width;
  const lineLength = Math.max(nameWidth + 100, 400);
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - lineLength / 2, 590);
  ctx.lineTo(width / 2 + lineLength / 2, 590);
  ctx.stroke();

  // 6. COURSE DETAILS
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px "CertSans"';
  ctx.letterSpacing = '1px';
  ctx.fillText('Atas keberhasilannya menyelesaikan seluruh kurikulum dan evaluasi pada program:', width / 2, 650);

  ctx.shadowColor = 'rgba(96, 165, 250, 0.3)';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 42px "CertSans"';
  ctx.letterSpacing = '2px';

  const courseText = courseTitle || 'Nama Kelas Spesialisasi';
  const maxCourseWidth = width - 400;
  const courseLineHeight = 55;

  wrapText(ctx, courseText, width / 2, 720, maxCourseWidth, courseLineHeight);

  ctx.shadowBlur = 0;

  // 7. FOOTER SECTION
  const footerY = 900;

  // Left: Date & ID
  ctx.textAlign = 'left';
  const leftX = margin + 100;

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 14px "CertSans"';
  ctx.letterSpacing = '3px';
  ctx.fillText('TANGGAL KELULUSAN', leftX, footerY - 25);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px "CertSans"';
  ctx.letterSpacing = '1px';
  ctx.fillText(issueDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), leftX, footerY + 10);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px "CertSans"';
  ctx.letterSpacing = '1px';
  ctx.fillText('ID: ' + finalCertCode, leftX, footerY + 40);

  // Center: Modern Minimalist Badge
  ctx.textAlign = 'center';
  const sealX = width / 2;
  const sealY = footerY;

  ctx.beginPath();
  ctx.arc(sealX, sealY, 65, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sealX, sealY, 55, 0, Math.PI * 2);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px "CertSans"';
  ctx.letterSpacing = '4px';
  ctx.fillText('RESMI', sealX, sealY - 15);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px "CertSans"';
  ctx.letterSpacing = '1px';
  ctx.fillText('VERIFIED', sealX, sealY + 12);

  drawDiamond(ctx, sealX, sealY + 35, 8, 12, '#f59e0b');

  // Right: Signature
  ctx.textAlign = 'right';
  const rightX = width - (margin + 100);

  ctx.fillStyle = '#fbbf24';
  // Fallback ke CertSerif italic kalau font script tidak ter-load
  ctx.font = GlobalFonts.has('CertScript')
    ? 'bold 48px "CertScript"'
    : 'italic bold 42px "CertSerif"';
  ctx.letterSpacing = '2px';
  ctx.fillText('EduSkill Lead', rightX, footerY - 20);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rightX - 280, footerY + 5);
  ctx.lineTo(rightX, footerY + 5);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px "CertSans"';
  ctx.letterSpacing = '1px';
  ctx.fillText('Chief Academic Officer', rightX, footerY + 32);

  ctx.fillStyle = '#64748b';
  ctx.font = '14px "CertSans"';
  ctx.letterSpacing = '1px';
  ctx.fillText('EduSkill Academic Board', rightX, footerY + 58);

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateCertificateImage
};

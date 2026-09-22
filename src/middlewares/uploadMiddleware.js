const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure base upload directories exist
const submissionsDir = path.join(__dirname, '../public/uploads/submissions');
const imagesDir = path.join(__dirname, '../public/uploads/images');

[submissionsDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage for Submissions (ZIP, PDF, max 50MB)
const submissionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, submissionsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'submission-' + uniqueSuffix + ext);
  }
});

const uploadSubmission = multer({
  storage: submissionStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // max 50MB
});

// Memory Storage for Images (to be processed and compressed to WebP by Sharp)
const imageMemoryStorage = multer.memoryStorage();

const uploadImage = multer({
  storage: imageMemoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // max 20MB input
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp|gif|svg|avif|bmp|tiff/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\//.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Format file harus berupa gambar!'));
  }
});

/**
 * Compress and convert image buffer to WebP
 * @param {Buffer} buffer - File buffer from Multer
 * @param {string} prefix - 'img' or 'thumb'
 * @param {number} maxWidth - Max width in pixels (e.g., 1600 for content, 1280 for thumbnail)
 * @param {number} quality - WebP quality 1-100 (default: 80)
 */
async function compressImageToWebP(buffer, prefix = 'img', maxWidth = 1600, quality = 80) {
  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
  const outputPath = path.join(imagesDir, filename);

  const info = await sharp(buffer)
    .rotate() // Auto-orient based on EXIF
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
      fit: 'inside'
    })
    .webp({ quality, effort: 4 })
    .toFile(outputPath);

  return {
    filename,
    url: `/uploads/images/${filename}`,
    size: info.size,
    width: info.width,
    height: info.height
  };
}

module.exports = {
  uploadSubmission,
  uploadImage,
  compressImageToWebP
};

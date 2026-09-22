const express = require('express');
const router = express.Router();
const aiApiController = require('../controllers/aiApiController');
const { verifyAiApiKey } = require('../middlewares/aiAuthMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

// ==========================================
// 1. PUBLIC ENDPOINTS (Schema & Discovery Bebas Akses)
// ==========================================
// AI Agent baca skema & dokumentasi lengkap di sini dulu sebelum beraksi
router.get('/schema', aiApiController.getPublicSchema);
router.get('/docs', aiApiController.getDocsMarkdown);
router.get('/courses', aiApiController.getCourses);
router.get('/courses/:courseId', aiApiController.getCourseDetail);

// ==========================================
// 2. PROTECTED ENDPOINTS (Wajib x-api-key / Bearer Token)
// ==========================================
router.use(verifyAiApiKey);

// Single Resource Management
router.post('/courses', aiApiController.createCourse);
router.post('/courses/:courseId/modules', aiApiController.addModule);
router.post('/courses/:courseId/lessons', aiApiController.addLesson);
router.put('/lessons/:lessonId', aiApiController.updateLesson);
router.delete('/lessons/:lessonId', aiApiController.deleteLesson);

// Batch / All-in-One Course Importer (Cocok buat LLM generator)
router.post('/courses/full-import', aiApiController.fullImportCourse);

// Image Uploader (Auto-Compress to WebP)
router.post('/upload-image', uploadImage.single('image'), aiApiController.uploadImage);

module.exports = router;

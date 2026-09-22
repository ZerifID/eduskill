const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { uploadSubmission } = require('../middlewares/uploadMiddleware');
const { isAuthenticated } = require('../middlewares/authMiddleware');

router.get('/', courseController.getCatalog);
router.get('/my-courses', isAuthenticated, courseController.getMyCourses);
router.get('/course/:slug', courseController.getCourseDetail);
router.get('/course/:slug/learn', courseController.getClassroom);

// Leave / Unenroll Course (Keluar dari Kelas / Hapus Pendaftaran - support POST & GET)
router.post('/course/:slug/unenroll', isAuthenticated, courseController.postUnenrollCourse);
router.get('/course/:slug/unenroll', isAuthenticated, courseController.postUnenrollCourse);

// Final Project Submission & Review Flow
router.get('/course/:slug/final-project', isAuthenticated, courseController.getFinalProject);
router.post('/course/:slug/final-project', isAuthenticated, uploadSubmission.single('submission_file'), courseController.postSubmitFinalProject);

// Certificate Page & Direct Backend Image Exporter
router.get('/certificate/:certCode', courseController.getCertificate);
router.get('/certificate/:certCode/image', courseController.getCertificateImage);

// Progress Toggle
router.post('/api/progress/toggle', courseController.postToggleProgress);

module.exports = router;

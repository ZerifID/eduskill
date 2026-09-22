const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { uploadImage } = require('../middlewares/uploadMiddleware');
const { isAuthenticated, isAdmin } = require('../middlewares/authMiddleware');

// Semua route di sini wajib Admin
router.use(isAuthenticated, isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// API Upload Image (Mendukung Paste Ctrl+V & Form Upload)
router.post('/api/upload-image', uploadImage.single('image'), adminController.postUploadImage);

// Courses Management
router.get('/courses', adminController.getCourses);
router.get('/courses/create', adminController.getCreateCourse);
router.post('/courses/create', uploadImage.single('thumbnail_file'), adminController.postCreateCourse);
router.get('/courses/:id/edit', adminController.getEditCourse);
router.post('/courses/:id/edit', uploadImage.single('thumbnail_file'), adminController.postEditCourse);
router.post('/courses/:id/delete', adminController.postDeleteCourse);

// Module Tree Editor & Lessons
router.get('/courses/:id/modules', adminController.getCourseModules);
router.post('/courses/:id/modules/add', adminController.postAddModule);
router.get('/courses/:courseId/modules/:moduleId/edit', adminController.getEditModule);
router.post('/courses/:courseId/modules/:moduleId/edit', adminController.postEditModule);
router.post('/courses/:courseId/modules/:moduleId/delete', adminController.postDeleteModule);

// Lesson Edit & Delete
router.post('/courses/:id/lessons/add', adminController.postAddLesson);
router.get('/courses/:courseId/lessons/:lessonId/edit', adminController.getEditLesson);
router.post('/courses/:courseId/lessons/:lessonId/edit', adminController.postEditLesson);
router.post('/courses/:courseId/lessons/:lessonId/delete', adminController.postDeleteLesson);

// Final Project Review (Submissions)
router.get('/submissions', adminController.getSubmissions);
router.get('/submissions/:id', adminController.getSubmissionDetail);
router.post('/submissions/:id/review', adminController.postReviewSubmission);

// Students & Orders
router.get('/students', adminController.getStudents);
router.get('/orders', adminController.getOrders);

module.exports = router;

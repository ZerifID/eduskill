const db = require('../config/database');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const { generateCertificateImage } = require('../utils/certificateGenerator');

// Set Marked options with GFM enabled (tables, breaks, lists)
marked.setOptions({
  gfm: true,
  breaks: true
});

function buildModuleTree(modules, lessons, completedLessonIds = new Set()) {
  const moduleMap = {};
  const rootModules = [];

  modules.forEach(m => {
    moduleMap[m.id] = { ...m, submodules: [], lessons: [] };
  });

  // Sort lessons by order_index ASC, id ASC within each module
  lessons.forEach(l => {
    if (moduleMap[l.module_id]) {
      moduleMap[l.module_id].lessons.push({
        ...l,
        is_completed: completedLessonIds.has(l.id)
      });
    }
  });

  Object.values(moduleMap).forEach(m => {
    m.lessons.sort((a, b) => (a.order_index - b.order_index) || (a.id - b.id));
  });

  modules.forEach(m => {
    if (m.parent_id && moduleMap[m.parent_id]) {
      moduleMap[m.parent_id].submodules.push(moduleMap[m.id]);
    } else {
      rootModules.push(moduleMap[m.id]);
    }
  });

  // Sort submodules recursively
  const sortSubmodules = (mods) => {
    mods.sort((a, b) => (a.order_index - b.order_index) || (a.id - b.id));
    mods.forEach(m => {
      if (m.submodules && m.submodules.length > 0) {
        sortSubmodules(m.submodules);
      }
    });
  };
  sortSubmodules(rootModules);

  return rootModules;
}

function getFlattenedLessons(moduleTree) {
  const flattened = [];
  function traverse(mods) {
    mods.forEach(m => {
      if (m.lessons && m.lessons.length > 0) {
        flattened.push(...m.lessons);
      }
      if (m.submodules && m.submodules.length > 0) {
        traverse(m.submodules);
      }
    });
  }
  traverse(moduleTree);
  return flattened;
}

const courseController = {
  // Public Catalog
  getCatalog: (req, res) => {
    const courses = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as total_lessons
      FROM courses c
      WHERE c.is_published = 1
      ORDER BY c.created_at DESC
    `).all();

    res.render('student/catalog', {
      title: 'Katalog Kelas',
      courses
    });
  },

  // My Courses Page (Enrolled courses for student)
  getMyCourses: (req, res) => {
    const userId = req.session.user.id;
    const enrollments = db.prepare(`
      SELECT e.*, c.title, c.slug, c.description, c.thumbnail_url, c.price,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as total_lessons,
        (SELECT COUNT(*) FROM user_progress up JOIN lessons l ON up.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE up.user_id = ? AND m.course_id = c.id) as completed_lessons,
        (SELECT status FROM final_submissions WHERE user_id = ? AND course_id = c.id) as submission_status,
        (SELECT certificate_code FROM final_submissions WHERE user_id = ? AND course_id = c.id AND status = 'approved') as certificate_code
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ? AND e.status = 'active'
      ORDER BY e.enrolled_at DESC
    `).all(userId, userId, userId, userId);

    res.render('student/my-courses', {
      title: 'Kelas Saya',
      enrollments
    });
  },

  // Course Detail (Silabus Tree & Pricing)
  getCourseDetail: (req, res) => {
    const { slug } = req.params;
    const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug);

    if (!course) {
      return res.status(404).render('partials/404', { title: 'Kelas Tidak Ditemukan' });
    }

    // Check if current user is enrolled
    let isEnrolled = false;
    if (req.session && req.session.user) {
      const enrollment = db.prepare(`
        SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active'
      `).get(req.session.user.id, course.id);
      isEnrolled = !!enrollment;
    }

    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC, id ASC').all(course.id);
    const moduleIds = modules.map(m => m.id);
    let lessons = [];
    if (moduleIds.length > 0) {
      const placeholders = moduleIds.map(() => '?').join(',');
      lessons = db.prepare(`SELECT * FROM lessons WHERE module_id IN (${placeholders}) ORDER BY order_index ASC, id ASC`).all(...moduleIds);
    }

    const moduleTree = buildModuleTree(modules, lessons);

    res.render('student/course-detail', {
      title: course.title,
      course,
      moduleTree,
      isEnrolled,
      totalLessons: lessons.length
    });
  },

  // Student Classroom Player (Video / Teks Markdown + Tree Sidebar)
// Student Classroom Player (Video / Teks Markdown + Tree Sidebar)
  getClassroom: (req, res) => {
    const { slug } = req.params;
    const { lesson: lessonIdQuery } = req.query;

    const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug);
    if (!course) {
      return res.status(404).render('partials/404', { title: 'Kelas Tidak Ditemukan' });
    }

    const userId = req.session && req.session.user ? req.session.user.id : null;
    const isEnrolled = userId ? !!db.prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active'").get(userId, course.id) : false;

    // Get modules and lessons
    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC, id ASC').all(course.id);
    const moduleIds = modules.map(m => m.id);
    let lessons = [];
    if (moduleIds.length > 0) {
      const placeholders = moduleIds.map(() => '?').join(',');
      lessons = db.prepare(`SELECT * FROM lessons WHERE module_id IN (${placeholders}) ORDER BY order_index ASC, id ASC`).all(...moduleIds);
    }

    if (lessons.length === 0) {
      req.session.flashError = 'Materi kelas ini belum tersedia.';
      return res.redirect(`/course/${slug}`);
    }

    // Get user completed progress
    let completedLessonIds = new Set();
    if (userId) {
      const progressRows = db.prepare(`
        SELECT up.lesson_id FROM user_progress up
        JOIN lessons l ON up.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        WHERE up.user_id = ? AND m.course_id = ?
      `).all(userId, course.id);
      completedLessonIds = new Set(progressRows.map(r => r.lesson_id));
    }

    // --- PERBAIKAN URUTAN MATERI DIMULAI DI SINI ---
    
    // 1. Bangun struktur Tree Modul lebih awal
    const moduleTree = buildModuleTree(modules, lessons, completedLessonIds);
    
    // 2. Dapatkan urutan materi yang sudah diratakan sesuai hierarki bab/modul
    const orderedLessons = getFlattenedLessons(moduleTree);

    // 3. Tentukan activeLesson, prevLesson, dan nextLesson dari urutan yang sudah benar
    let activeLesson = null;
    let activeLessonIndex = 0;
    if (lessonIdQuery) {
      activeLessonIndex = orderedLessons.findIndex(l => l.id === parseInt(lessonIdQuery, 10));
      if (activeLessonIndex === -1) activeLessonIndex = 0;
    }
    activeLesson = orderedLessons[activeLessonIndex] || orderedLessons[0];

    const prevLesson = activeLessonIndex > 0 ? orderedLessons[activeLessonIndex - 1] : null;
    const nextLesson = activeLessonIndex < orderedLessons.length - 1 ? orderedLessons[activeLessonIndex + 1] : null;
    
    // --- PERBAIKAN URUTAN MATERI SELESAI ---

    // Check submission status if student is enrolled
    let submission = null;
    if (userId) {
      submission = db.prepare('SELECT * FROM final_submissions WHERE user_id = ? AND course_id = ?').get(userId, course.id);
    }

    // ACCESS CONTROL: Free Preview vs Enrolled
    const canAccess = isEnrolled || activeLesson.is_preview === 1 || (req.session && req.session.user && req.session.user.role === 'admin');

    // Calculate progress percentage
    const progressPercent = lessons.length > 0 ? Math.round((completedLessonIds.size / lessons.length) * 100) : 0;

    // Parse Markdown to HTML for Text Articles
    let renderedContentHtml = '';
    if (activeLesson && activeLesson.body_text) {
      const rawHtml = marked.parse(activeLesson.body_text);
      renderedContentHtml = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'code', 'pre', 'hr',
          'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'blockquote'
        ]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title', 'class'],
          code: ['class'],
          span: ['class'],
          th: ['align', 'class'],
          td: ['align', 'class'],
          table: ['class']
        }
      });
    }

    res.render('student/classroom', {
      title: `${activeLesson.title} - ${course.title}`,
      course,
      moduleTree,
      activeLesson,
      prevLesson,
      nextLesson,
      activeLessonIndex,
      totalLessonsCount: lessons.length,
      renderedContentHtml,
      canAccess,
      isEnrolled,
      progressPercent,
      completedLessonIds,
      submission
    });
  },


  
  // Final Project Submission Page
  getFinalProject: (req, res) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }

    const { slug } = req.params;
    const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug);
    if (!course) {
      return res.status(404).render('partials/404', { title: 'Kelas Tidak Ditemukan' });
    }

    const userId = req.session.user.id;
    const isEnrolled = db.prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active'").get(userId, course.id);
    if (!isEnrolled && req.session.user.role !== 'admin') {
      req.session.flashError = 'Kamu belum terdaftar di kelas ini.';
      return res.redirect(`/course/${slug}`);
    }

    const submission = db.prepare('SELECT * FROM final_submissions WHERE user_id = ? AND course_id = ?').get(userId, course.id);

    // Parse Markdown to HTML for Final Project Instructions
    let renderedInstructionsHtml = '';
    if (course.final_project_instructions) {
      const rawHtml = marked.parse(course.final_project_instructions);
      renderedInstructionsHtml = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'code', 'pre', 'hr',
          'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'blockquote'
        ]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title', 'class'],
          code: ['class'],
          span: ['class'],
          th: ['align', 'class'],
          td: ['align', 'class'],
          table: ['class']
        }
      });
    }

    res.render('student/final-project', {
      title: `Tugas Akhir - ${course.title}`,
      course,
      renderedInstructionsHtml,
      submission
    });
  },

  // Submit Final Project Process
  postSubmitFinalProject: (req, res) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }

    const { slug } = req.params;
    const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug);
    if (!course) {
      return res.status(404).render('partials/404', { title: 'Kelas Tidak Ditemukan' });
    }

    const userId = req.session.user.id;
    const { submission_link, submission_notes, text_content } = req.body;
    
    // Support backward compatibility for text/link note fields
    const finalNotes = text_content || submission_notes || submission_link || '';

    let filePath = null;
    let fileName = null;
    if (req.file) {
      filePath = `/uploads/submissions/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    if (!finalNotes.trim() && !filePath) {
      req.session.flashError = 'Harap sertakan catatan/link tugas atau upload file dokumen tugas akhir!';
      return res.redirect(`/course/${slug}/final-project`);
    }

    const existingSub = db.prepare('SELECT id, file_url, file_name, text_content FROM final_submissions WHERE user_id = ? AND course_id = ?').get(userId, course.id);

    const savedFilePath = filePath || (existingSub ? existingSub.file_url : null);
    const savedFileName = fileName || (existingSub ? existingSub.file_name : null);

    if (existingSub) {
      db.prepare(`
        UPDATE final_submissions
        SET text_content = ?, 
            file_url = ?,
            file_name = ?,
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(finalNotes, savedFilePath, savedFileName, existingSub.id);
    } else {
      db.prepare(`
        INSERT INTO final_submissions (user_id, course_id, text_content, file_url, file_name, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(userId, course.id, finalNotes, savedFilePath, savedFileName);
    }

    req.session.flashSuccess = 'Tugas akhir kamu berhasil dikirim! Menunggu review dan evaluasi dari instruktur.';
    return res.redirect(`/course/${slug}/final-project`);
  },

  // Toggle Progress (API)
  postToggleProgress: (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { lessonId } = req.body;
    const userId = req.session.user.id;

    try {
      const exists = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId);
      if (exists) {
        db.prepare('DELETE FROM user_progress WHERE user_id = ? AND lesson_id = ?').run(userId, lessonId);
        return res.json({ success: true, completed: false });
      } else {
        db.prepare('INSERT INTO user_progress (user_id, lesson_id) VALUES (?, ?)').run(userId, lessonId);
        return res.json({ success: true, completed: true });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // Download / View Certificate HTML
  getCertificate: async (req, res) => {
    const { certCode } = req.params;
    const submission = db.prepare(`
      SELECT fs.*, u.name as user_name, c.title as course_title, c.slug as course_slug
      FROM final_submissions fs
      JOIN users u ON fs.user_id = u.id
      JOIN courses c ON fs.course_id = c.id
      WHERE fs.certificate_code = ? AND fs.status = 'approved'
    `).get(certCode);

    if (!submission) {
      return res.status(404).render('partials/404', { title: 'Sertifikat Tidak Ditemukan' });
    }

    res.render('student/certificate', {
      title: `Sertifikat - ${submission.user_name}`,
      sub: submission,
      submission,
      issueDate: new Date(submission.reviewed_at || submission.updated_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    });
  },

  // Direct PNG Certificate Exporter
  getCertificateImage: async (req, res) => {
    const { certCode } = req.params;
    const submission = db.prepare(`
      SELECT fs.*, u.name as user_name, c.title as course_title, c.slug as course_slug
      FROM final_submissions fs
      JOIN users u ON fs.user_id = u.id
      JOIN courses c ON fs.course_id = c.id
      WHERE fs.certificate_code = ? AND fs.status = 'approved'
    `).get(certCode);

    if (!submission) {
      return res.status(404).send('Sertifikat tidak ditemukan');
    }

    try {
      const issueDateStr = new Date(submission.reviewed_at || submission.updated_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const imgBuffer = await generateCertificateImage({
        studentName: submission.user_name,
        courseTitle: submission.course_title,
        certificateCode: submission.certificate_code,
        issueDate: issueDateStr
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="certificate-${submission.certificate_code}.png"`);
      return res.send(imgBuffer);
    } catch (err) {
      return res.status(500).send('Error generating certificate image: ' + err.message);
    }
  },

  // Leave / Unenroll Course (Keluar dari Kelas & Hapus Progress)
  postUnenrollCourse: (req, res) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }

    const { slug } = req.params;
    const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug);
    if (!course) {
      return res.status(404).render('partials/404', { title: 'Kelas Tidak Ditemukan' });
    }

    const userId = req.session.user.id;

    try {
      // 1. Hapus pendaftaran kelas (enrollment)
      db.prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?').run(userId, course.id);

      // 2. Hapus progres belajar materi di kelas ini
      db.prepare(`
        DELETE FROM user_progress 
        WHERE user_id = ? AND lesson_id IN (
          SELECT l.id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?
        )
      `).run(userId, course.id);

      // 3. Hapus pengumpulan tugas akhir jika ada
      db.prepare('DELETE FROM final_submissions WHERE user_id = ? AND course_id = ?').run(userId, course.id);

      req.session.flashSuccess = `Kamu telah berhasil keluar dan membatalkan pendaftaran dari kelas "${course.title}".`;
      return res.redirect('/my-courses');
    } catch (err) {
      console.error('Error un-enrolling course:', err);
      req.session.flashError = 'Gagal keluar dari kelas: ' + err.message;
      return res.redirect('/my-courses');
    }
  }
};

module.exports = courseController;

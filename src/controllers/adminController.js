const db = require('../config/database');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const { compressImageToWebP } = require('../middlewares/uploadMiddleware');

function buildModuleTree(modules, lessons) {
  const moduleMap = {};
  const rootModules = [];

  modules.forEach(m => {
    moduleMap[m.id] = { ...m, submodules: [], lessons: [] };
  });

  lessons.forEach(l => {
    if (moduleMap[l.module_id]) {
      moduleMap[l.module_id].lessons.push(l);
    }
  });

  modules.forEach(m => {
    if (m.parent_id && moduleMap[m.parent_id]) {
      moduleMap[m.parent_id].submodules.push(moduleMap[m.id]);
    } else {
      rootModules.push(moduleMap[m.id]);
    }
  });

  return rootModules;
}

const adminController = {
  // Admin Dashboard
  getDashboard: (req, res) => {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
    const totalCourses = db.prepare("SELECT COUNT(*) as count FROM courses").get().count;
    const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get().count;
    const totalRevenue = db.prepare("SELECT SUM(amount) as sum FROM orders WHERE status = 'paid'").get().sum || 0;
    const pendingSubmissions = db.prepare("SELECT COUNT(*) as count FROM final_submissions WHERE status = 'pending'").get().count;

    const recentOrders = db.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email, c.title as course_title
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN courses c ON o.course_id = c.id
      ORDER BY o.created_at DESC LIMIT 5
    `).all();

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: { totalUsers, totalCourses, totalOrders, totalRevenue, pendingSubmissions },
      recentOrders
    });
  },

  // API Upload Image (Ctrl+V Paste & File Upload) with Auto-Compress to WebP
  postUploadImage: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file gambar yang diupload' });
    }
    try {
      // Compress and convert to WebP (max width 1600px, quality 80%)
      const result = await compressImageToWebP(req.file.buffer, 'lesson-img', 1600, 80);
      return res.json({
        success: true,
        url: result.url,
        filename: result.filename,
        size: result.size,
        width: result.width,
        height: result.height
      });
    } catch (err) {
      console.error('Error compressing image:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengompres gambar: ' + err.message });
    }
  },

  // List Courses
  getCourses: (req, res) => {
    const courses = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as total_modules,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as total_students
      FROM courses c
      ORDER BY c.created_at DESC
    `).all();
    res.render('admin/courses/index', { title: 'Manajemen Kelas', courses });
  },

  // Create Course Page
  getCreateCourse: (req, res) => {
    res.render('admin/courses/create', { title: 'Tambah Kelas Baru' });
  },

  // Process Create Course
  postCreateCourse: async (req, res) => {
    let { title, description, price, thumbnail_url, final_project_title, final_project_instructions, is_published } = req.body;
    if (!title) {
      req.session.flashError = 'Judul kelas wajib diisi!';
      return res.redirect('/admin/courses/create');
    }

    if (req.file) {
      try {
        const result = await compressImageToWebP(req.file.buffer, 'course-thumb', 1280, 82);
        thumbnail_url = result.url;
      } catch (err) {
        console.error('Error compressing course thumbnail:', err);
      }
    }

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);

    const priceVal = parseInt(price, 10) || 0;
    const publishedVal = is_published ? 1 : 0;

    const insert = db.prepare(`
      INSERT INTO courses (title, slug, description, price, thumbnail_url, final_project_title, final_project_instructions, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      slug,
      description || '',
      priceVal,
      thumbnail_url || '',
      final_project_title || 'Proyek Tugas Akhir',
      final_project_instructions || 'Kerjakan tugas akhir sesuai instruksi kelas.',
      publishedVal
    );

    req.session.flashSuccess = 'Kelas baru berhasil dibuat! Sekarang silakan susun modul & materi.';
    return res.redirect(`/admin/courses/${insert.lastInsertRowid}/modules`);
  },

  // Edit Course Page
  getEditCourse: (req, res) => {
    const courseId = req.params.id;
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      req.session.flashError = 'Kelas tidak ditemukan!';
      return res.redirect('/admin/courses');
    }
    res.render('admin/courses/edit', { title: `Edit: ${course.title}`, course });
  },

  // Process Edit Course
  postEditCourse: async (req, res) => {
    const courseId = req.params.id;
    let { title, description, price, thumbnail_url, final_project_title, final_project_instructions, is_published } = req.body;

    if (req.file) {
      try {
        const result = await compressImageToWebP(req.file.buffer, 'course-thumb', 1280, 82);
        thumbnail_url = result.url;
      } catch (err) {
        console.error('Error compressing course thumbnail:', err);
      }
    }

    const priceVal = parseInt(price, 10) || 0;
    const publishedVal = is_published ? 1 : 0;

    db.prepare(`
      UPDATE courses
      SET title = ?, description = ?, price = ?, thumbnail_url = ?, final_project_title = ?, final_project_instructions = ?, is_published = ?
      WHERE id = ?
    `).run(
      title.trim(),
      description || '',
      priceVal,
      thumbnail_url || '',
      final_project_title || 'Proyek Tugas Akhir',
      final_project_instructions || '',
      publishedVal,
      courseId
    );

    req.session.flashSuccess = 'Data kelas & instruksi tugas akhir berhasil diperbarui!';
    return res.redirect('/admin/courses');
  },

  // Delete Course
  postDeleteCourse: (req, res) => {
    const courseId = req.params.id;
    db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    req.session.flashSuccess = 'Kelas dan semua modul/materi terkait berhasil dihapus!';
    return res.redirect('/admin/courses');
  },

  // Module Tree Editor Page
  getCourseModules: (req, res) => {
    const courseId = req.params.id;
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      req.session.flashError = 'Kelas tidak ditemukan!';
      return res.redirect('/admin/courses');
    }

    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC, id ASC').all(courseId);
    
    const moduleIds = modules.map(m => m.id);
    let lessons = [];
    if (moduleIds.length > 0) {
      const placeholders = moduleIds.map(() => '?').join(',');
      lessons = db.prepare(`SELECT * FROM lessons WHERE module_id IN (${placeholders}) ORDER BY order_index ASC, id ASC`).all(...moduleIds);
    }

    const moduleTree = buildModuleTree(modules, lessons);

    res.render('admin/modules/tree-editor', {
      title: `Modul Tree - ${course.title}`,
      course,
      modules,
      moduleTree
    });
  },

  // Add Module
  postAddModule: (req, res) => {
    const courseId = req.params.id;
    const { title, parent_id, order_index } = req.body;

    const parentIdVal = parent_id ? parseInt(parent_id, 10) : null;
    const orderIndexVal = parseInt(order_index, 10) || 0;

    db.prepare(`
      INSERT INTO modules (course_id, parent_id, title, order_index)
      VALUES (?, ?, ?, ?)
    `).run(courseId, parentIdVal, title.trim(), orderIndexVal);

    req.session.flashSuccess = 'Modul baru berhasil ditambahkan!';
    return res.redirect(`/admin/courses/${courseId}/modules`);
  },

  // Edit Module Page
  getEditModule: (req, res) => {
    const { courseId, moduleId } = req.params;
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    const moduleItem = db.prepare('SELECT * FROM modules WHERE id = ?').get(moduleId);
    if (!course || !moduleItem) {
      req.session.flashError = 'Modul tidak ditemukan!';
      return res.redirect(`/admin/courses/${courseId}/modules`);
    }

    const parentModules = db.prepare('SELECT * FROM modules WHERE course_id = ? AND id != ? AND parent_id IS NULL').all(courseId, moduleId);

    res.render('admin/modules/edit-module', {
      title: `Edit Modul: ${moduleItem.title}`,
      course,
      moduleItem,
      parentModules
    });
  },

  // Process Edit Module
  postEditModule: (req, res) => {
    const { courseId, moduleId } = req.params;
    const { title, parent_id, order_index } = req.body;

    const parentIdVal = parent_id ? parseInt(parent_id, 10) : null;
    const orderIndexVal = parseInt(order_index, 10) || 0;

    db.prepare(`
      UPDATE modules
      SET title = ?, parent_id = ?, order_index = ?
      WHERE id = ?
    `).run(title.trim(), parentIdVal, orderIndexVal, moduleId);

    req.session.flashSuccess = 'Modul berhasil diperbarui!';
    return res.redirect(`/admin/courses/${courseId}/modules`);
  },

  // Delete Module
  postDeleteModule: (req, res) => {
    const { courseId, moduleId } = req.params;
    db.prepare('DELETE FROM modules WHERE id = ?').run(moduleId);
    req.session.flashSuccess = 'Modul beserta sub-modul dan materinya berhasil dihapus!';
    return res.redirect(`/admin/courses/${courseId}/modules`);
  },

  // Add Lesson
  postAddLesson: (req, res) => {
    const courseId = req.params.id;
    const { module_id, title, content_type, video_url, body_text, is_preview, order_index } = req.body;

    const isPreviewVal = is_preview ? 1 : 0;
    const orderIndexVal = parseInt(order_index, 10) || 0;

    db.prepare(`
      INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(module_id, title.trim(), content_type || 'text', video_url || '', body_text || '', isPreviewVal, orderIndexVal);

    req.session.flashSuccess = 'Materi berhasil ditambahkan!';
    return res.redirect(`/admin/courses/${courseId}/modules`);
  },

  // Edit Lesson Page
  getEditLesson: (req, res) => {
    const { courseId, lessonId } = req.params;
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
    if (!course || !lesson) {
      req.session.flashError = 'Materi tidak ditemukan!';
      return res.redirect(`/admin/courses/${courseId}/modules`);
    }

    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC, id ASC').all(courseId);

    res.render('admin/modules/edit-lesson', {
      title: `Edit Materi: ${lesson.title}`,
      course,
      lesson,
      modules
    });
  },

  // Process Edit Lesson
  postEditLesson: (req, res) => {
    const { courseId, lessonId } = req.params;
    const { module_id, title, content_type, video_url, body_text, is_preview, order_index } = req.body;

    const isPreviewVal = is_preview ? 1 : 0;
    const orderIndexVal = parseInt(order_index, 10) || 0;

    db.prepare(`
      UPDATE lessons
      SET module_id = ?, title = ?, content_type = ?, video_url = ?, body_text = ?, is_preview = ?, order_index = ?
      WHERE id = ?
    `).run(module_id, title.trim(), content_type || 'text', video_url || '', body_text || '', isPreviewVal, orderIndexVal, lessonId);

    req.session.flashSuccess = 'Materi berhasil diperbarui!';
    return res.redirect(`/admin/courses/${courseId}/modules`);
  },

  // Delete Lesson
  postDeleteLesson: (req, res) => {
    const { courseId, lessonId } = req.params;
    db.prepare('DELETE FROM lessons WHERE id = ?').run(lessonId);
    req.session.flashSuccess = 'Materi berhasil dihapus!';
    return res.redirect(`/admin/courses/${courseId}/modules`);
  },

  // List Submissions (Review Tugas Akhir)
  getSubmissions: (req, res) => {
    const submissions = db.prepare(`
      SELECT fs.*, u.name as user_name, u.email as user_email, c.title as course_title, c.slug as course_slug
      FROM final_submissions fs
      JOIN users u ON fs.user_id = u.id
      JOIN courses c ON fs.course_id = c.id
      ORDER BY 
        CASE WHEN fs.status = 'pending' THEN 1 ELSE 2 END,
        fs.created_at DESC
    `).all();

    res.render('admin/submissions/index', {
      title: 'Review Tugas Akhir Siswa',
      submissions
    });
  },

  // Review Submission Detail
  getSubmissionDetail: (req, res) => {
    const { id } = req.params;
    const sub = db.prepare(`
      SELECT fs.*, u.name as user_name, u.email as user_email, c.title as course_title, c.slug as course_slug, c.final_project_instructions
      FROM final_submissions fs
      JOIN users u ON fs.user_id = u.id
      JOIN courses c ON fs.course_id = c.id
      WHERE fs.id = ?
    `).get(id);

    if (!sub) {
      req.session.flashError = 'Data tugas tidak ditemukan!';
      return res.redirect('/admin/submissions');
    }

    // Parse Markdown to HTML for Final Project Instructions in Admin Review
    let renderedInstructionsHtml = '';
    if (sub.final_project_instructions) {
      const rawHtml = marked.parse(sub.final_project_instructions);
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

    res.render('admin/submissions/review', {
      title: `Review Tugas: ${sub.user_name}`,
      sub,
      renderedInstructionsHtml
    });
  },

  // Process Approve / Reject Submission
  postReviewSubmission: (req, res) => {
    const { id } = req.params;
    const { action, admin_feedback } = req.body; // action: 'approve' or 'reject'

    const sub = db.prepare('SELECT * FROM final_submissions WHERE id = ?').get(id);
    if (!sub) {
      req.session.flashError = 'Tugas tidak ditemukan!';
      return res.redirect('/admin/submissions');
    }

    if (action === 'approve') {
      // Generate certificate code if not exists: CERT-COURSEID-USERID-RANDOM
      const certCode = sub.certificate_code || `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      db.prepare(`
        UPDATE final_submissions
        SET status = 'approved', admin_feedback = ?, certificate_code = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(admin_feedback || 'Selamat! Tugas akhir kamu dinilai luar biasa dan dinyatakan LULUS.', certCode, id);

      req.session.flashSuccess = `Tugas siswa berhasil di-APPROVE! Sertifikat dengan kode [${certCode}] otomatis terbit.`;
    } else if (action === 'reject') {
      db.prepare(`
        UPDATE final_submissions
        SET status = 'rejected', admin_feedback = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(admin_feedback || 'Mohon perbaiki tugas sesuai catatan instruktur dan silakan submit ulang.', id);

      req.session.flashSuccess = 'Tugas siswa ditolak (REJECT). Siswa diarahkan untuk submit ulang perbaikan.';
    }

    return res.redirect('/admin/submissions');
  },

  // List Students
  getStudents: (req, res) => {
    const students = db.prepare(`
      SELECT u.id, u.name, u.email, u.created_at,
        (SELECT COUNT(*) FROM enrollments WHERE user_id = u.id) as total_enrollments
      FROM users u
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `).all();
    res.render('admin/students', { title: 'Daftar Siswa', students });
  },

  // List Transactions
  getOrders: (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email, c.title as course_title
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN courses c ON o.course_id = c.id
      ORDER BY o.created_at DESC
    `).all();
    res.render('admin/orders', { title: 'Daftar Transaksi', orders });
  }
};

module.exports = adminController;

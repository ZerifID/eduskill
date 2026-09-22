const fs = require('fs');
const path = require('path');
const db = require('../config/database');
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

const aiApiController = {
  // 1. PUBLIC SCHEMA DISCOVERY (Tanpa Kunci)
  getPublicSchema: (req, res) => {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    // Read AI_DOCUMENTATION.md markdown content (Khusus AI, tanpa info env/server)
    let aiDocContent = '';
    const docPath = path.join(__dirname, '../../docs/AI_DOCUMENTATION.md');
    try {
      if (fs.existsSync(docPath)) {
        aiDocContent = fs.readFileSync(docPath, 'utf8');
      }
    } catch (err) {
      console.error('Failed reading AI_DOCUMENTATION.md:', err.message);
    }

    return res.json({
      name: 'EduSkill AI Course & Content Automation Engine',
      version: '1.0.0',
      description: 'API ini dirancang untuk AI Agent / LLM agar dapat mempelajari struktur kurikulum platform, membuat kelas, mengelola modul tree, dan memposting materi pembelajaran secara mandiri.',
      authentication: {
        type: 'ApiKey / Bearer Token',
        header_options: [
          'x-api-key: <AI_API_KEY>',
          'Authorization: Bearer <AI_API_KEY>'
        ],
        instructions: 'Gunakan AI_API_KEY yang telah disediakan pada header request untuk mengakses endpoint protected.'
      },
      data_structure: {
        hierarchy: 'Course (Kelas) ➔ Module (Bab Utama / Sub-Bab) ➔ Lesson (Materi / Artikel / Video)',
        content_types: {
          text: 'Materi teks artikel berbasis Markdown & HTML. Mendukung Heading (#), List, Code Snippet, Blockquote, dan gambar WebP ![](url).',
          video: 'Materi video. Memerlukan field video_url (format YouTube embed https://www.youtube.com/embed/... atau direct link MP4).'
        },
        preview_access: {
          is_preview: 1, // 'Baca Gratis' / 'Tonton Gratis' (Dapat diakses publik tanpa login/beli)
          is_locked: 0   // Terkunci, hanya bisa diakses setelah siswa terdaftar / membeli kelas
        }
      },
      endpoints: {
        public: {
          get_schema: {
            method: 'GET',
            path: '/api/v1/schema',
            description: 'Membaca skema data, format JSON, dan panduan integrasi AI (Endpoint ini).'
          },
          get_docs_markdown: {
            method: 'GET',
            path: '/api/v1/docs',
            description: 'Mengambil dokumentasi lengkap khusus AI dalam format Markdown asli.'
          },
          get_catalog_courses: {
            method: 'GET',
            path: '/api/v1/courses',
            description: 'Melihat daftar kelas yang tersedia beserta id, slug, harga, dan silabusnya.'
          }
        },
        protected: {
          create_course: {
            method: 'POST',
            path: '/api/v1/courses',
            description: 'Membuat kelas baru.',
            payload: {
              title: 'String (Wajib) - Judul kelas',
              description: 'String (Opsional) - Penjelasan silabus kelas',
              price: 'Number (Opsional, Default 0) - Harga kelas dalam Rupiah (0 = Gratis)',
              thumbnail_url: 'String (Opsional) - URL banner gambar kelas',
              final_project_title: 'String (Opsional, Default: "Proyek Tugas Akhir") - Judul tugas akhir kelulusan',
              final_project_instructions: 'String (Opsional) - Panduan instruksi tugas akhir lengkap (Mendukung format Markdown lengkap dan gambar Markdown ![caption](url))',
              is_published: 'Number (0 atau 1, Default 1) - Status publish ke katalog siswa'
            }
          },
          add_module: {
            method: 'POST',
            path: '/api/v1/courses/:courseId/modules',
            description: 'Menambahkan Bab Utama atau Sub-Bab ke dalam pohon modul kelas.',
            payload: {
              title: 'String (Wajib) - Judul Bab / Modul',
              parent_id: 'Number | null (Opsional) - Masukkan ID modul induk jika ingin menjadi Sub-Bab',
              order_index: 'Number (Opsional, Default 0) - Urutan tampil bab'
            }
          },
          add_lesson: {
            method: 'POST',
            path: '/api/v1/courses/:courseId/lessons',
            description: 'Menambahkan materi belajar ke dalam modul tertentu.',
            payload: {
              module_id: 'Number (Wajib) - ID modul tempat materi ini berada',
              title: 'String (Wajib) - Judul materi pelajaran',
              content_type: 'String (Wajib) - "text" atau "video"',
              body_text: 'String (Wajib jika text) - Konten artikel dalam format Markdown lengkap',
              video_url: 'String (Wajib jika video) - URL embed YouTube / MP4',
              is_preview: 'Number (0 atau 1, Default 0) - 1 untuk Baca/Tonton Gratis, 0 untuk Terkunci',
              order_index: 'Number (Opsional, Default 0) - Urutan materi dalam bab'
            }
          },
          update_lesson: {
            method: 'PUT',
            path: '/api/v1/lessons/:lessonId',
            description: 'Mengedit atau memperbarui isi materi pembelajaran.',
            payload: {
              title: 'String (Opsional)',
              content_type: 'String ("text" | "video", Opsional)',
              body_text: 'String (Markdown, Opsional)',
              video_url: 'String (Opsional)',
              is_preview: 'Number (0 | 1, Opsional)',
              order_index: 'Number (Opsional)'
            }
          },
          delete_lesson: {
            method: 'DELETE',
            path: '/api/v1/lessons/:lessonId',
            description: 'Menghapus materi pelajaran berdasarkan ID.'
          },
          full_import_batch: {
            method: 'POST',
            path: '/api/v1/courses/full-import',
            description: 'Sakti: AI bisa membuat 1 silabus utuh (Kelas + semua Bab + Sub-bab + Materi) dalam 1 kali request JSON!',
            example_payload: {
              course: {
                title: 'Mastering AI Agent with Node.js',
                description: 'Panduan membangun AI Agent otonom dari nol sampai production.',
                price: 0,
                thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
                final_project_title: 'Tugas Akhir: Deploy AI Agent Webhook',
                final_project_instructions: '## 🎯 Instruksi Tugas Akhir\n\nBuatlah REST API webhook untuk AI Agent dengan kriteria berikut:\n\n1. Memiliki endpoint `/webhook`\n2. Menerima payload JSON dan memproses data\n3. Deploy ke cloud (Vercel/Railway)\n\n![Contoh Arsitektur](/uploads/images/sample-architecture.webp)\n\n**Pengumpulan:** Kirimkan URL repository GitHub dan URL live demo API kamu di form bawah!',
                is_published: 1
              },
              modules: [
                {
                  title: 'Bab 1: Pondasi & Arsitektur AI',
                  order_index: 1,
                  lessons: [
                    {
                      title: '01. Pengenalan LLM & Function Calling',
                      content_type: 'text',
                      body_text: '# Pengenalan LLM\n\nModel bahasa besar (LLM) bekerja dengan cara...',
                      is_preview: 1,
                      order_index: 1
                    },
                    {
                      title: '02. Video Demo AI Workflow',
                      content_type: 'video',
                      video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                      is_preview: 1,
                      order_index: 2
                    }
                  ],
                  submodules: [
                    {
                      title: 'Sub-Bab 1.1: Setup Environment',
                      order_index: 1,
                      lessons: [
                        {
                          title: 'Instalasi Package & Node Runtime',
                          content_type: 'text',
                          body_text: '```bash\nnpm install express @napi-rs/canvas sharp\n```',
                          is_preview: 0,
                          order_index: 1
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          },
          upload_image: {
            method: 'POST',
            path: '/api/v1/upload-image',
            description: 'Upload gambar untuk materi / thumbnail. Otomatis dikompres & diubah ke format WebP ringan.',
            content_type: 'multipart/form-data (field name: "image")',
            returns: {
              success: true,
              url: '/uploads/images/lesson-img-12345678.webp',
              size: 142300,
              width: 1600,
              height: 900
            }
          }
        }
      },
      documentation_markdown: aiDocContent,
      quick_start_example: {
        curl_read_schema: `curl -X GET "${baseUrl}/api/v1/schema"`,
        curl_read_raw_docs: `curl -X GET "${baseUrl}/api/v1/docs"`,
        curl_post_course: `curl -X POST "${baseUrl}/api/v1/courses/full-import" -H "x-api-key: <YOUR_KEY>" -H "Content-Type: application/json" -d @course_syllabus.json`
      }
    });
  },

  // 1.1 PUBLIC RAW DOCS MARKDOWN (GET /api/v1/docs) - Pure AI Guide Only
  getDocsMarkdown: (req, res) => {
    const docPath = path.join(__dirname, '../../docs/AI_DOCUMENTATION.md');
    try {
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf8');
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        return res.send(content);
      }
      return res.status(404).send('# 404 AI Documentation Not Found');
    } catch (err) {
      return res.status(500).send('# Error reading documentation: ' + err.message);
    }
  },

  // 2. GET ALL COURSES (Public / AI Exploration)
  getCourses: (req, res) => {
    try {
      const courses = db.prepare(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as total_modules,
          (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as total_lessons
        FROM courses c
        ORDER BY c.created_at DESC
      `).all();

      return res.json({
        success: true,
        count: courses.length,
        courses
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // 3. GET SINGLE COURSE DETAIL WITH MODULE TREE
  getCourseDetail: (req, res) => {
    try {
      const { courseId } = req.params;
      const course = db.prepare('SELECT * FROM courses WHERE id = ? OR slug = ?').get(courseId, courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
      }

      const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC, id ASC').all(course.id);
      const moduleIds = modules.map(m => m.id);
      let lessons = [];
      if (moduleIds.length > 0) {
        const placeholders = moduleIds.map(() => '?').join(',');
        lessons = db.prepare(`SELECT * FROM lessons WHERE module_id IN (${placeholders}) ORDER BY order_index ASC, id ASC`).all(...moduleIds);
      }

      const moduleTree = buildModuleTree(modules, lessons);

      return res.json({
        success: true,
        course,
        modules_count: modules.length,
        lessons_count: lessons.length,
        curriculum: moduleTree
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // 4. CREATE COURSE (Protected)
  createCourse: (req, res) => {
    try {
      const { title, description, price, thumbnail_url, final_project_title, final_project_instructions, is_published } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Field "title" (judul kelas) wajib diisi!' });
      }

      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);

      const priceVal = parseInt(price, 10) || 0;
      const publishedVal = (is_published === undefined || is_published === null) ? 1 : (is_published ? 1 : 0);

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
        final_project_instructions || 'Kerjakan tugas akhir sesuai instruksi kelas untuk mendapatkan sertifikat.',
        publishedVal
      );

      const newCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(insert.lastInsertRowid);

      return res.status(201).json({
        success: true,
        message: 'Kelas berhasil dibuat oleh AI!',
        course: newCourse,
        endpoints: {
          add_module: `/api/v1/courses/${newCourse.id}/modules`,
          add_lesson: `/api/v1/courses/${newCourse.id}/lessons`
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // 5. ADD MODULE (Protected)
  addModule: (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, parent_id, order_index } = req.body;

      const course = db.prepare('SELECT id, title FROM courses WHERE id = ?').get(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Field "title" modul wajib diisi!' });
      }

      const parentIdVal = parent_id ? parseInt(parent_id, 10) : null;
      const orderIndexVal = parseInt(order_index, 10) || 0;

      const insert = db.prepare(`
        INSERT INTO modules (course_id, parent_id, title, order_index)
        VALUES (?, ?, ?, ?)
      `).run(course.id, parentIdVal, title.trim(), orderIndexVal);

      const newModule = db.prepare('SELECT * FROM modules WHERE id = ?').get(insert.lastInsertRowid);

      return res.status(201).json({
        success: true,
        message: parentIdVal ? 'Sub-Bab berhasil ditambahkan!' : 'Bab Utama berhasil ditambahkan!',
        module: newModule
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // 6. ADD LESSON (Protected)
  addLesson: (req, res) => {
    try {
      const { courseId } = req.params;
      const { module_id, title, content_type, video_url, body_text, is_preview, order_index } = req.body;

      const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
      }

      if (!module_id) {
        return res.status(400).json({ success: false, message: 'Field "module_id" wajib disertakan!' });
      }

      const mod = db.prepare('SELECT id FROM modules WHERE id = ? AND course_id = ?').get(module_id, course.id);
      if (!mod) {
        return res.status(404).json({ success: false, message: `Modul dengan ID [${module_id}] tidak ditemukan di kelas ini!` });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Field "title" materi wajib diisi!' });
      }

      const contentTypeVal = (content_type === 'video') ? 'video' : 'text';
      const isPreviewVal = is_preview ? 1 : 0;
      const orderIndexVal = parseInt(order_index, 10) || 0;

      const insert = db.prepare(`
        INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        module_id,
        title.trim(),
        contentTypeVal,
        video_url || '',
        body_text || '',
        isPreviewVal,
        orderIndexVal
      );

      const newLesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(insert.lastInsertRowid);

      return res.status(201).json({
        success: true,
        message: 'Materi berhasil diposting oleh AI!',
        lesson: newLesson
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // 7. UPDATE LESSON (Protected)
  updateLesson: (req, res) => {
    try {
      const { lessonId } = req.params;
      const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
      if (!lesson) {
        return res.status(404).json({ success: false, message: 'Materi tidak ditemukan' });
      }

      const { title, content_type, video_url, body_text, is_preview, order_index, module_id } = req.body;

      const updatedModuleId = module_id ? parseInt(module_id, 10) : lesson.module_id;
      const updatedTitle = title ? title.trim() : lesson.title;
      const updatedContentType = content_type ? (content_type === 'video' ? 'video' : 'text') : lesson.content_type;
      const updatedVideoUrl = (video_url !== undefined) ? video_url : lesson.video_url;
      const updatedBodyText = (body_text !== undefined) ? body_text : lesson.body_text;
      const updatedIsPreview = (is_preview !== undefined) ? (is_preview ? 1 : 0) : lesson.is_preview;
      const updatedOrderIndex = (order_index !== undefined) ? parseInt(order_index, 10) : lesson.order_index;

      db.prepare(`
        UPDATE lessons
        SET module_id = ?, title = ?, content_type = ?, video_url = ?, body_text = ?, is_preview = ?, order_index = ?
        WHERE id = ?
      `).run(
        updatedModuleId,
        updatedTitle,
        updatedContentType,
        updatedVideoUrl,
        updatedBodyText,
        updatedIsPreview,
        updatedOrderIndex,
        lessonId
      );

      const resultLesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);

      return res.json({
        success: true,
        message: 'Materi berhasil diperbarui!',
        lesson: resultLesson
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // 8. DELETE LESSON (Protected)
  deleteLesson: (req, res) => {
    try {
      const { lessonId } = req.params;
      const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
      if (!lesson) {
        return res.status(404).json({ success: false, message: 'Materi tidak ditemukan' });
      }

      db.prepare('DELETE FROM lessons WHERE id = ?').run(lessonId);

      return res.json({
        success: true,
        message: `Materi dengan ID [${lessonId}] berhasil dihapus.`
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // 9. BATCH / FULL IMPORT (Protected - AI Favourite)
  fullImportCourse: (req, res) => {
    try {
      const { course, modules } = req.body;
      if (!course || !course.title) {
        return res.status(400).json({ success: false, message: 'Objek "course" dengan "title" wajib disertakan!' });
      }

      const slug = course.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);

      const priceVal = parseInt(course.price, 10) || 0;
      const publishedVal = (course.is_published === undefined || course.is_published === null) ? 1 : (course.is_published ? 1 : 0);

      // 1. Insert Course
      const courseInsert = db.prepare(`
        INSERT INTO courses (title, slug, description, price, thumbnail_url, final_project_title, final_project_instructions, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        course.title.trim(),
        slug,
        course.description || '',
        priceVal,
        course.thumbnail_url || '',
        course.final_project_title || 'Proyek Tugas Akhir',
        course.final_project_instructions || 'Kerjakan tugas akhir sesuai instruksi kelas.',
        publishedVal
      );

      const newCourseId = courseInsert.lastInsertRowid;
      let totalModulesCreated = 0;
      let totalLessonsCreated = 0;

      // Helper to process modules & submodules recursively
      function processModules(modList, parentId = null) {
        if (!Array.isArray(modList)) return;

        modList.forEach((m, mIdx) => {
          const modInsert = db.prepare(`
            INSERT INTO modules (course_id, parent_id, title, order_index)
            VALUES (?, ?, ?, ?)
          `).run(newCourseId, parentId, m.title || `Bab ${mIdx + 1}`, m.order_index || (mIdx + 1));

          const createdModuleId = modInsert.lastInsertRowid;
          totalModulesCreated++;

          // Insert Lessons under this module
          if (Array.isArray(m.lessons)) {
            m.lessons.forEach((l, lIdx) => {
              const contentType = (l.content_type === 'video') ? 'video' : 'text';
              db.prepare(`
                INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                createdModuleId,
                l.title || `Materi ${lIdx + 1}`,
                contentType,
                l.video_url || '',
                l.body_text || '',
                l.is_preview ? 1 : 0,
                l.order_index || (lIdx + 1)
              );
              totalLessonsCreated++;
            });
          }

          // Process Submodules if any
          if (Array.isArray(m.submodules)) {
            processModules(m.submodules, createdModuleId);
          }
        });
      }

      if (Array.isArray(modules)) {
        processModules(modules, null);
      }

      const createdCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(newCourseId);

      return res.status(201).json({
        success: true,
        message: 'Batch import silabus kelas berhasil dibuat oleh AI!',
        stats: {
          course_id: newCourseId,
          course_title: createdCourse.title,
          course_slug: createdCourse.slug,
          total_modules: totalModulesCreated,
          total_lessons: totalLessonsCreated
        },
        view_url: `/course/${createdCourse.slug}`,
        admin_url: `/admin/courses/${newCourseId}/modules`
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // 10. UPLOAD IMAGE FOR AI (Protected - Auto-WebP)
  uploadImage: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file gambar yang dikirim (field: "image")' });
    }
    try {
      const result = await compressImageToWebP(req.file.buffer, 'ai-img', 1600, 80);
      return res.json({
        success: true,
        url: result.url,
        filename: result.filename,
        size: result.size,
        width: result.width,
        height: result.height,
        markdown_tag: `![Gambar](${result.url})`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal kompres gambar: ' + err.message });
    }
  }
};

module.exports = aiApiController;

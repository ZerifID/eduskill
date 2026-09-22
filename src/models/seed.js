const db = require('../config/database');
const bcrypt = require('bcryptjs');

console.log('🌱 Starting database seeding...');

// 1. Seed Demo Students
const studentPass = bcrypt.hashSync('student123', 10);
const userInsert = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, password_hash, role)
  VALUES (?, ?, ?, 'student')
`);
userInsert.run('Budi Santoso', 'budi@gmail.com', studentPass);
userInsert.run('Siti Rahma', 'siti@gmail.com', studentPass);

const budi = db.prepare("SELECT id FROM users WHERE email = 'budi@gmail.com'").get();

// 2. Seed Demo Course 1 (Node.js Masterclass - Berbayar)
const checkCourse1 = db.prepare("SELECT id FROM courses WHERE slug = 'master-nodejs-backend-architecture'").get();
let course1Id;
if (!checkCourse1) {
  const insertCourse1 = db.prepare(`
    INSERT INTO courses (title, slug, description, price, thumbnail_url, is_published)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    'Master Node.js & Database Architecture',
    'master-nodejs-backend-architecture',
    'Panduan lengkap membangun REST API enterprise, skema database SQLite/PostgreSQL, autentikasi session/JWT, dan integrasi webhook pembayaran.',
    199000,
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80'
  );
  course1Id = insertCourse1.lastInsertRowid;

  // Modul 1 (Free Preview)
  const m1 = db.prepare(`
    INSERT INTO modules (course_id, parent_id, title, order_index)
    VALUES (?, NULL, 'Bab 1: Pengenalan & Fundamental Node.js', 1)
  `).run(course1Id).lastInsertRowid;

  db.prepare(`
    INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    m1,
    '01. Pengantar Arsitektur Backend & Roadmap Belajar',
    'video',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'Selamat datang di kelas Master Node.js! Di bab awal ini kita akan membedah bagaimana Node.js bekerja secara asinkronus dan non-blocking I/O.\n\nPastikan kamu sudah menginstall Node.js versi LTS.',
    1, // Free Preview
    1
  );

  db.prepare(`
    INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    m1,
    '02. Setup Project & Environment Variables (.env)',
    'text',
    '',
    'Langkah-langkah persiapan workspace:\n1. Jalankan `npm init -y`\n2. Install package utama: express, dotenv, better-sqlite3\n3. Buat file .env untuk menyimpan session secret.',
    1, // Free Preview
    2
  );

  // Modul 2 (Locked / Premium)
  const m2 = db.prepare(`
    INSERT INTO modules (course_id, parent_id, title, order_index)
    VALUES (?, NULL, 'Bab 2: Database Design & SQLite Relations', 2)
  `).run(course1Id).lastInsertRowid;

  db.prepare(`
    INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    m2,
    '03. Desain Skema Tabel & Relasi Modul Tree Bertingkat',
    'video',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'Di materi premium ini kita membedah relasi tabel `modules` dengan self-referencing `parent_id` untuk menciptakan struktur pohon tak terbatas.',
    0, // Locked
    1
  );

  // Sub-Modul Tree
  const subM2 = db.prepare(`
    INSERT INTO modules (course_id, parent_id, title, order_index)
    VALUES (?, ?, 'Sub-Bab: Optimasi Indexing & Foreign Keys', 1)
  `).run(course1Id, m2).lastInsertRowid;

  db.prepare(`
    INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    subM2,
    '04. PRAGMA WAL Mode & Query Tuning SQLite',
    'text',
    '',
    'Gunakan PRAGMA journal_mode = WAL untuk meningkatkan throughput konkurensi database SQLite pada aplikasi Node.js.',
    0, // Locked
    1
  );

  // Modul 3 (Locked / Premium)
  const m3 = db.prepare(`
    INSERT INTO modules (course_id, parent_id, title, order_index)
    VALUES (?, NULL, 'Bab 3: Payment Gateway & Webhook Automation', 3)
  `).run(course1Id).lastInsertRowid;

  db.prepare(`
    INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    m3,
    '05. Menerima Webhook & Auto-Unlock Hak Akses Siswa',
    'video',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'Pelajari cara memvalidasi webhook payload, update status order menjadi PAID, dan otomatis insert ke tabel enrollments.',
    0, // Locked
    1
  );
}

// 3. Seed Demo Course 2 (Kelas Gratis)
const checkCourse2 = db.prepare("SELECT id FROM courses WHERE slug = 'dasar-html-css-modern'").get();
if (!checkCourse2) {
  const insertCourse2 = db.prepare(`
    INSERT INTO courses (title, slug, description, price, thumbnail_url, is_published)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    'Dasar HTML5 & Tailwind CSS Modern',
    'dasar-html-css-modern',
    'Belajar dasar pembuatan layout website yang responsif, bersih, dan modern menggunakan utility-first CSS framework.',
    0, // Gratis
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80'
  );
  const course2Id = insertCourse2.lastInsertRowid;

  const mFree = db.prepare(`
    INSERT INTO modules (course_id, parent_id, title, order_index)
    VALUES (?, NULL, 'Bab 1: Struktur Semantic HTML5', 1)
  `).run(course2Id).lastInsertRowid;

  db.prepare(`
    INSERT INTO lessons (module_id, title, content_type, video_url, body_text, is_preview, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    mFree,
    '01. Semantic Tags & SEO Basics',
    'text',
    '',
    'Gunakan tag seperti header, nav, main, article, section, dan footer untuk membuat web yang ramah mesin pencari.',
    1,
    1
  );
}

console.log('✅ Seeding database selesai dengan contoh data kelas & modul tree!');

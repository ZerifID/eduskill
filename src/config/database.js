const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & Foreign Keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student', -- 'admin' or 'student'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price INTEGER NOT NULL DEFAULT 0, -- in IDR (Rupiah)
      thumbnail_url TEXT,
      final_project_title TEXT DEFAULT 'Proyek Tugas Akhir',
      final_project_instructions TEXT DEFAULT 'Kerjakan tugas akhir sesuai instruksi kelas dan submit link repo / file zip / deskripsi hasil kerjamu di sini.',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      parent_id INTEGER DEFAULT NULL, -- for nested sub-modules (tree)
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES modules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'text', 'quiz'
      video_url TEXT,
      body_text TEXT,
      is_preview INTEGER NOT NULL DEFAULT 0, -- 1: Free Preview, 0: Locked
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'expired'
      payment_ref TEXT,
      payment_type TEXT,
      payment_url TEXT,
      qr_url TEXT,
      uniq_id TEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(user_id, course_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, lesson_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS final_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      submission_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'both'
      text_content TEXT,
      file_url TEXT,
      file_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      admin_feedback TEXT,
      certificate_code TEXT UNIQUE,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);

  // Auto-migration columns if already exists
  try { db.exec('ALTER TABLE orders ADD COLUMN payment_url TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN qr_url TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN uniq_id TEXT;'); } catch (e) {}
  try { db.exec("ALTER TABLE courses ADD COLUMN final_project_title TEXT DEFAULT 'Proyek Tugas Akhir';"); } catch (e) {}
  try { db.exec("ALTER TABLE courses ADD COLUMN final_project_instructions TEXT DEFAULT 'Kerjakan tugas akhir sesuai instruksi kelas dan submit file / teks hasil kerjamu di sini.';"); } catch (e) {}

  // Seed default admin user if not exists
  const checkAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get('admin@elearning.com');
  if (!checkAdmin) {
    const defaultPassword = 'admin123';
    const hash = bcrypt.hashSync(defaultPassword, 10);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run('Administrator', 'admin@elearning.com', hash, 'admin');
    console.log('✅ Default admin user created: admin@elearning.com / admin123');
  }
}

initDatabase();

module.exports = db;

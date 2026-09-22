# 🎓 EduSkill - Fullstack E-Learning Platform with Freemium Module Tree & AI Automation

Platform pembelajaran online modern berbasis **Node.js, Express.js, SQLite (`node:sqlite`), Tailwind CSS, dan EJS**, dilengkapi dengan kurikulum bertingkat (**Modul Tree**), dukungan materi **Teks Markdown & Video Embed**, sistem kelulusan & tugas akhir, sertifikat digital, auto-compress image ke **WebP**, dan **REST API khusus AI Agent** untuk pembuatan & publikasi konten otomatis.

---

## 🚀 Fitur Utama

1. **🌳 Kurikulum Hierarki (Module Tree & Sub-Modul)**:
   - Pengorganisasian materi bertingkat: **Kelas (Course) ➔ Bab Utama (Root Module) ➔ Sub-Bab (Tree Branch) ➔ Materi (Lesson)**.
   - Format materi mendukung **Artikel / Teks Markdown** dan **Video YouTube / MP4**.
   - Model **Freemium**: Flag `Free Preview` (Baca Gratis / Tonton Gratis) untuk materi tester tanpa beli/login.

2. **🤖 AI & Automation REST API (Self-Discoverable)**:
   - **Public Schema Discovery (`GET /api/v1/schema`)**: Endpoint terbuka tanpa autentikasi yang dapat dibaca oleh AI/LLM untuk mempelajari struktur database, format payload JSON, dan aturan kurikulum.
   - **Protected AI Endpoints**: Pembuatan kelas, bab modul, materi markdown, upload gambar WebP, hingga **Batch Full Import** menggunakan autentikasi `x-api-key`.

3. **🖼️ High-Performance Image Optimization**:
   - Integrasi library **`sharp`** di backend.
   - Fitur **Paste Screenshot (Ctrl + V)** langsung di form materi: otomatis di-upload dan dikonversi ke format **`.webp`** ringan (max width 1600px, kualitas 80%).
   - Upload file banner/thumbnail kelas otomatis dikompres ke **`.webp`**.

4. **🏆 Proyek Tugas Akhir & Sertifikat Digital**:
   - Syarat kelulusan kelas dengan mengumpulkan link repository/drive atau upload file ZIP/PDF (hingga 50MB).
   - Review tugas akhir oleh Admin (Approve / Reject revisi) dengan catatan instruktur.
   - Penerbitan **Sertifikat Kelulusan Unik** dengan template HTML/CSS yang dapat disesuaikan.

5. **💳 Integrasi Pembayaran**:
   - Gateway pembayaran otomatis via Webhook Callback.

---

## 🛠️ Instalasi & Menjalankan Server

### 1. Prasyarat
* Node.js versi 20+ atau 24+
* npm

### 2. Setup Environment (`.env`)
Salin file `.env.example` atau buat `.env`:
```env
PORT=9993
NODE_ENV=development
BASE_URL=http://localhost:9993
SESSION_SECRET=elearning_secret_key_2026
AI_API_KEY=sk_ai_elearning_secret_2026
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Jalankan Aplikasi
```bash
# Mode Development (Auto-Reload)
npm run dev

# Mode Production
npm start
```
Buka browser: **`http://localhost:9993`**

Akun Admin Default:
* **Email:** `admin@elearning.com`
* **Password:** `admin123`

---

## 🤖 Panduan AI Agent & REST API Automation

Platform ini menyediakan API cerdas agar LLM / AI Agent (seperti Claude, GPT, OpenClaw, n8n, dll) dapat membuat dan memposting kursus secara otonom.

### 🌐 1. Public Schema Discovery (Tanpa Kunci)
AI Agent dapat membaca skema lengkap dan aturan pembuatan kelas secara langsung tanpa API Key:

```http
GET /api/v1/schema
```
**Contoh Request (cURL):**
```bash
curl -X GET "http://localhost:9993/api/v1/schema"
```
**Response JSON yang didapat AI:**
* Deskripsi kapabilitas dan hierarki kurikulum.
* Format tipe data, batasan, dan daftar endpoint.
* Contoh payload lengkap untuk setiap operasi.

---

### 🔐 2. Autentikasi Endpoint AI
Untuk endpoint modifikasi / posting materi, sertakan API Key pada header:
* `x-api-key: <AI_API_KEY>` atau `Authorization: Bearer <AI_API_KEY>`

---

### 📡 3. Daftar Endpoint Protected

#### A. Batch Full Import (Satu Kali Request Buat 1 Silabus Utuh)
Endpoint favorit untuk AI Agent. AI dapat merancang seluruh kelas, bab, sub-bab, dan materi lengkap dalam 1 payload JSON:

```http
POST /api/v1/courses/full-import
Content-Type: application/json
x-api-key: sk_ai_elearning_secret_2026
```
**Body Payload:**
```json
{
  "course": {
    "title": "Mastering Autonomous AI Agent 2026",
    "description": "Panduan membangun agen AI mandiri dengan Node.js dan Tool Calling.",
    "price": 0,
    "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
    "final_project_title": "Proyek Akhir: Membuat AI Webhook Assistant",
    "final_project_instructions": "Bangun REST API AI Agent dan kumpulkan link GitHub repo.",
    "is_published": 1
  },
  "modules": [
    {
      "title": "Bab 1: Pengenalan Arsitektur Agentic AI",
      "order_index": 1,
      "lessons": [
        {
          "title": "01. Konsep Dasar ReAct & Function Calling",
          "content_type": "text",
          "body_text": "# Konsep ReAct\n\nReAct (Reasoning + Acting) memungkinkan AI berpikir sebelum memanggil tool...",
          "is_preview": 1,
          "order_index": 1
        },
        {
          "title": "02. Video Demonstrasi Tool Execution",
          "content_type": "video",
          "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
          "is_preview": 1,
          "order_index": 2
        }
      ],
      "submodules": [
        {
          "title": "Sub-Bab 1.1: Persiapan Environment",
          "order_index": 1,
          "lessons": [
            {
              "title": "Instalasi Runtime & Package",
              "content_type": "text",
              "body_text": "```bash\nnpm install express @napi-rs/canvas sharp\n```",
              "is_preview": 0,
              "order_index": 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### B. Operasi Parsial / Individual

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/v1/courses` | Melihat seluruh kelas & modul (Public) |
| `GET` | `/api/v1/courses/:courseId` | Detail kelas beserta pohon kurikulumnya (Public) |
| `POST` | `/api/v1/courses` | Membuat kelas baru (Protected) |
| `POST` | `/api/v1/courses/:courseId/modules` | Menambah Bab Utama / Sub-Bab (Protected) |
| `POST` | `/api/v1/courses/:courseId/lessons` | Memposting materi baru (Protected) |
| `PUT` | `/api/v1/lessons/:lessonId` | Mengedit / update isi materi (Protected) |
| `DELETE`| `/api/v1/lessons/:lessonId` | Menghapus materi (Protected) |
| `POST` | `/api/v1/upload-image` | Upload gambar (Auto-Convert to WebP) (Protected) |

---

### 💻 4. Contoh Script Otomasi Python untuk AI

```python
import requests

API_URL = "http://localhost:9993/api/v1"
API_KEY = "sk_ai_elearning_secret_2026"

# 1. AI Belajar Skema Dulu
schema = requests.get(f"{API_URL}/schema").json()
print("AI membaca skema:", schema["name"])

# 2. AI Posting Kelas & Materi Sekaligus
headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

payload = {
    "course": {
        "title": "Tutorial Python untuk Data Science",
        "description": "Belajar manipulasi data dengan Pandas dan NumPy.",
        "price": 0
    },
    "modules": [
        {
            "title": "Bab 1: Dasar Pandas",
            "lessons": [
                {
                    "title": "01. DataFrame dan Series",
                    "content_type": "text",
                    "body_text": "# Pengenalan DataFrame\nPandas DataFrame adalah struktur data 2 dimensi...",
                    "is_preview": 1
                }
            ]
        }
    ]
}

res = requests.post(f"{API_URL}/courses/full-import", json=payload, headers=headers)
print("Hasil Posting:", res.json())
```

---

## 📁 Struktur Direktori
```text
E:\E-LEARNING
├── data/
│   └── database.sqlite             # Database bawaan SQLite (node:sqlite)
├── src/
│   ├── config/
│   │   └── database.js             # Koneksi SQLite & inisialisasi tabel
│   ├── controllers/
│   │   ├── adminController.js      # Controller Admin Panel
│   │   ├── aiApiController.js      # Controller REST API khusus AI / LLM
│   │   ├── authController.js       # Autentikasi Siswa & Admin
│   │   ├── courseController.js     # Katalog, Classroom, & Tugas Akhir
│   │   ├── orderController.js      # Checkout pesanan
│   │   └── webhookController.js    # Webhook callback pembayaran
│   ├── middlewares/
│   │   ├── aiAuthMiddleware.js     # API Key verification untuk AI
│   │   ├── authMiddleware.js       # Session & role middleware
│   │   └── uploadMiddleware.js     # Multer & Sharp Auto-WebP compressor
│   ├── routes/
│   │   ├── aiApiRoutes.js          # Route REST API AI (/api/v1)
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── courseRoutes.js
│   │   ├── orderRoutes.js
│   │   └── webhookRoutes.js
│   ├── views/                      # Template EJS & Tailwind CSS
│   └── app.js                      # Server Entry Point
├── package.json
└── README.md
```

---

## 📜 Lisensi
MIT License © 2026 EduSkill Platform.

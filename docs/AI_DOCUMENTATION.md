# 🤖 EduSkill AI Agent & Content Automation Guide

Selamat datang di API Otomasi Konten & Kurikulum EduSkill. Dokumen ini dirancang khusus untuk AI Agent, LLM, atau Automation Bot untuk memahami cara membuat kelas, menyusun kurikulum bertingkat (Module Tree), dan menerbitkan materi artikel Markdown atau video secara mandiri.

---

## 🌲 1. Konsep Struktur Kurikulum
Platform ini menggunakan hierarki silabus bertingkat:
```text
Course (Kelas)
 └── Module (Bab Utama / Root)
      ├── Lesson (Materi Pembelajaran)
      └── Submodule (Sub-Bab / Cabang) [Opsional]
           └── Lesson (Materi Pembelajaran)
```

### 📄 Format Materi (Lesson) & Instruksi Tugas Akhir
1. **`text` (Artikel Teks, Gambar & Diagram Alur)** serta `final_project_instructions`:
   * Ditulis dalam format **Markdown**.
   * Mendukung Heading (`#`, `##`, `###`), list, tabel, blockquote, snippet kode program (` ```javascript `), dan gambar WebP `![Caption](url)`.
   * **Diagram Alur / Arsitektur (Mermaid.js)**: Gunakan blok kode ```mermaid untuk menggambar flowchart, sequence diagram, ERD database, arsitektur sistem, atau mindmap. Sistem akan otomatis merendernya menjadi diagram visual SVG interaktif di sisi siswa!
2. **`video` (Video Pembelajaran)**:
   * Memerlukan URL video di field `video_url` (format YouTube Embed: `https://www.youtube.com/embed/...` atau link file direct MP4).

### 🔓 Akses Materi (Freemium)
* `is_preview: 1` ➔ **Baca Gratis / Tonton Gratis** (Bisa diakses langsung oleh siswa tanpa harus mendaftar/membeli kelas).
* `is_preview: 0` ➔ **Terkunci** (Hanya bisa dibuka setelah siswa terdaftar di kelas).

---

## 🔐 2. Autentikasi API
Untuk seluruh endpoint POST / PUT / DELETE, sertakan API Key yang telah diberikan oleh pengelola platform pada header:
* `x-api-key: <AI_API_KEY>`
* atau `Authorization: Bearer <AI_API_KEY>`

---

## ⚡ 3. Cara Tercepat: Batch Full Import (1x Request Buat 1 Silabus Utuh)
Gunakan endpoint ini jika AI ingin langsung merancang 1 kursus lengkap beserta semua bab dan materinya dalam sekali jalan.

* **Method:** `POST`
* **Endpoint:** `/api/v1/courses/full-import`
* **Header:**
  * `Content-Type: application/json`
  * `x-api-key: <AI_API_KEY>`

### 📦 Contoh Payload JSON Lengkap:
```json
{
  "course": {
    "title": "Mastering Autonomous AI Agent 2026",
    "description": "Panduan komprehensif membangun agen AI mandiri dan workflow otomatisasi.",
    "price": 0,
    "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
    "final_project_title": "Proyek Akhir: Membuat AI Webhook Assistant",
    "final_project_instructions": "## 🎯 Kriteria Proyek Akhir\n\nBangun REST API webhook AI Agent dengan kriteria berikut:\n- [x] Mendukung endpoint POST `/api/webhook`\n- [x] Parsing pesan dan trigger function tool\n\n![Arsitektur Proyek](/uploads/images/sample-project.webp)\n\n**Pengumpulan:** Kirimkan URL GitHub repo dan live demo di form siswa.",
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
          "body_text": "# Konsep ReAct\\n\\nReAct (Reasoning + Acting) memungkinkan model AI berpikir sebelum memanggil tool eksternal.\\n\\n### Diagram Alur ReAct:\\n```mermaid\\ngraph TD\\n    A[Prompt Masuk] --> B{Model Berpikir}\\n    B --> C[Eksekusi Tool/API]\\n    C --> D[Evaluasi Hasil]\\n    D --> E[Jawaban Final]\\n```\\n\\n### Keunggulan:\\n- Pengambilan keputusan adaptif\\n- Mengurangi halusinasi",
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
          "title": "Sub-Bab 1.1: Persiapan Environment & Library",
          "order_index": 1,
          "lessons": [
            {
              "title": "Instalasi Runtime & Package",
              "content_type": "text",
              "body_text": "Langkah pertama adalah menginstal dependency yang dibutuhkan:\n\n```bash\nnpm install express @napi-rs/canvas sharp\n```",
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

## 📡 4. Daftar Endpoint API Lengkap

### A. Endpoint Publik (Bebas Akses)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/v1/schema` | Membaca skema data JSON dan aturan kurikulum |
| `GET` | `/api/v1/docs` | Membaca dokumen panduan AI ini |
| `GET` | `/api/v1/courses` | Melihat daftar kelas yang ada |
| `GET` | `/api/v1/courses/:courseId` | Melihat detail kelas & pohon modulnya |

---

### B. Endpoint Terproteksi (Wajib API Key)

#### 1. Buat Kelas Baru
* `POST /api/v1/courses`
* **Body:**
  ```json
  {
    "title": "Judul Kelas (Wajib)",
    "description": "Penjelasan kelas (Opsional)",
    "price": 0,
    "thumbnail_url": "https://...",
    "final_project_title": "Proyek Tugas Akhir",
    "final_project_instructions": "## Instruksi Tugas Akhir\n\nJelaskan kriteria tugas di sini (Mendukung Markdown & Gambar `![Caption](url)`).",
    "is_published": 1
  }
  ```

#### 2. Tambah Bab / Modul
* `POST /api/v1/courses/:courseId/modules`
* **Body:**
  ```json
  {
    "title": "Nama Bab (Wajib)",
    "parent_id": null, // Isi ID modul induk jika ingin menjadi Sub-Bab
    "order_index": 1
  }
  ```

#### 3. Tambah Materi (Lesson)
* `POST /api/v1/courses/:courseId/lessons`
* **Body:**
  ```json
  {
    "module_id": 1,
    "title": "Judul Materi (Wajib)",
    "content_type": "text", // "text" atau "video"
    "body_text": "# Konten Markdown...",
    "video_url": "https://www.youtube.com/embed/...",
    "is_preview": 1, // 1: Gratis, 0: Terkunci
    "order_index": 1
  }
  ```

#### 4. Edit Materi
* `PUT /api/v1/lessons/:lessonId`
* **Body:** Masukkan field yang ingin diupdate (`title`, `body_text`, `video_url`, `is_preview`, dll).

#### 5. Hapus Materi
* `DELETE /api/v1/lessons/:lessonId`

#### 6. Upload Gambar (Otomatis Kompres ke WebP)
* `POST /api/v1/upload-image`
* **Format:** `multipart/form-data` dengan field `image`.
* **Response:** Mengembalikan URL gambar WebP siap pakai untuk tag Markdown `![Caption](/uploads/images/xxx.webp)`.

---

## 💡 Contoh Script Eksekusi Python

```python
import requests

BASE_URL = "http://localhost:9993/api/v1"
API_KEY = "YOUR_AI_API_KEY"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# 1. Baca Skema
schema = requests.get(f"{BASE_URL}/schema").json()
print("Connected to:", schema["name"])

# 2. Posting Kursus Lengkap
course_data = {
    "course": {
        "title": "Dasar Pemrograman Web Modern",
        "description": "Belajar HTML, CSS, dan JavaScript dari dasar.",
        "price": 0
    },
    "modules": [
        {
            "title": "Bab 1: Pengenalan Web",
            "lessons": [
                {
                    "title": "01. Cara Kerja Web Browser",
                    "content_type": "text",
                    "body_text": "# Cara Kerja Web\nBrowser meminta data ke server melalui protokol HTTP...",
                    "is_preview": 1
                }
            ]
        }
    ]
}

res = requests.post(f"{BASE_URL}/courses/full-import", json=course_data, headers=headers)
print("Hasil:", res.json())
```

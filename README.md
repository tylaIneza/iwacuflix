# Iwacuflix 🎬

A Netflix-style streaming platform built with Next.js, Express, and MongoDB.

---

## Project Structure

```
iwacuflix/
├── backend/          # Express API + MongoDB
│   ├── src/
│   │   ├── models/   # Content.js, User.js
│   │   ├── routes/   # auth.js, content.js, admin.js
│   │   ├── middleware/auth.js
│   │   └── index.js
│   ├── uploads/      # Uploaded thumbnail images
│   └── .env.example
└── frontend/         # Next.js 14 (App Router) + Tailwind
    ├── app/
    │   ├── page.tsx              # Public home
    │   ├── watch/[id]/page.tsx   # Video watch page
    │   └── admin/                # Admin dashboard
    │       ├── page.tsx          # Login
    │       ├── dashboard/
    │       ├── upload/
    │       └── manage/
    ├── components/
    └── lib/          # API helpers, auth/localStorage utils
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)

### 2. Backend

```bash
cd backend
cp .env.example .env          # edit if needed
npm install
npm run dev
# → http://localhost:5000
```

The first run auto-creates an admin user using the credentials in `.env`.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

---

## Default Admin Credentials

| Field    | Default                |
|----------|------------------------|
| Email    | admin@iwacuflix.com    |
| Password | admin123               |

Change these in `backend/.env` before deploying.

---

## Environment Variables

**backend/.env**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/iwacuflix
JWT_SECRET=change_me_to_something_long_and_random
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@iwacuflix.com
ADMIN_PASSWORD=admin123
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## API Reference

### Public
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | /api/content          | List all published content |
| GET    | /api/content/:id      | Get single content item  |

### Auth
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | /api/auth/login       | Admin login → JWT        |
| GET    | /api/auth/verify      | Verify JWT               |

### Admin (JWT required)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/admin/stats                | Dashboard stats          |
| GET    | /api/admin/content              | List all content         |
| POST   | /api/admin/content              | Create content           |
| PUT    | /api/admin/content/:id          | Update content           |
| PUT    | /api/admin/content/:id/publish  | Toggle publish           |
| DELETE | /api/admin/content/:id          | Delete content           |
| POST   | /api/admin/upload               | Upload thumbnail image   |

---

## Video URL Formats

The video player supports:

| Format                                          | Example                                              |
|-------------------------------------------------|------------------------------------------------------|
| Cloudflare Stream embed URL                     | `https://iframe.cloudflarestream.com/{videoId}`      |
| Bare Cloudflare Stream video ID (32 hex chars)  | `abc123...` (auto-wrapped in iframe embed)           |
| Direct MP4 / HLS URL                            | `https://example.com/video.mp4`                      |

---

## Features

- **Public** — Browse all movies/series, watch without signing in
- **Search** — Live client-side search by title/category/description
- **Continue Watching** — localStorage-based progress tracking (no login required)
- **Autoplay next episode** — Automatically queues next episode when one ends
- **Admin Login** — JWT-secured admin portal at `/admin`
- **Upload** — Add movies or series with thumbnail upload or URL
- **Manage** — Edit, delete, publish/unpublish any content
- **Responsive** — Mobile + desktop layouts

---

## Tech Stack

| Layer    | Technology                         |
|----------|------------------------------------|
| Frontend | Next.js 14 (App Router), Tailwind  |
| Backend  | Node.js, Express                   |
| Database | MongoDB + Mongoose                 |
| Auth     | JWT (jsonwebtoken + bcryptjs)      |
| Video    | Cloudflare Stream / HTML5 video    |
| Uploads  | Multer (local, 5 MB limit)         |

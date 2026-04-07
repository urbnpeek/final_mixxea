# MIXXEA RECORDS — Full Stack Website
## Electronic Music Label & FreqVault Agency

---

## 🚀 Quick Start (3 steps)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your email credentials

# 3. Run the server
npm run dev
```

Open: **http://localhost:3000**
Admin: Click **"Admin ⚙"** button in the nav

---

## 📁 Project Structure

```
mixxea-vscode/
│
├── server.js                   ← Express server (entry point)
├── package.json
├── .env.example                ← Copy to .env and configure
├── mixxea.code-workspace       ← Open this in VS Code
│
├── public/                     ← Static files served to browser
│   ├── index.html              ← Full website (all sections)
│   ├── js/
│   │   ├── app.js              ← Frontend API integration
│   │   └── admin.js            ← Admin panel live data
│   └── uploads/                ← Auto-created on first run
│       ├── audio/              ← Track previews, demo submissions
│       ├── artwork/            ← Release artwork, artist photos
│       └── contracts/          ← Signed contract PDFs
│
├── src/api/                    ← Backend route handlers
│   ├── db.js                   ← JSON data store (swap for DB later)
│   ├── middleware.js            ← Auth guards
│   ├── mailer.js               ← Email (Nodemailer)
│   ├── auth.js                 ← Admin + Artist portal login
│   ├── releases.js             ← Releases CRUD + file upload
│   ├── artists.js              ← Artist profiles CRUD
│   ├── demos.js                ← A&R demo submissions
│   ├── newsletter.js           ← Subscriber list + campaign send
│   ├── bookings.js             ← FreqVault booking requests
│   ├── events.js               ← Shows/events CRUD
│   ├── royalties.js            ← Royalty statements
│   └── news.js                 ← Blog/news posts
│
└── data/                       ← JSON data files (auto-created)
    ├── releases.json
    ├── artists.json
    ├── demos.json
    ├── bookings.json
    ├── events.json
    ├── newsletter.json
    ├── royalties.json
    ├── news.json
    └── artistPortalUsers.json
```

---

## 🔑 Admin Access

Default credentials (set in `.env`):
- **Email:** `admin@mixxea.com`
- **Password:** `MixxeaAdmin2025!`

Change these in your `.env` before going live.

---

## 📧 Email Setup (Newsletter + Notifications)

Edit `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password   # Generate at myaccount.google.com/apppasswords
```

**In development** with no SMTP config, emails are logged to the console instead.

---

## 🎵 Audio Player

Uses **Howler.js** (7KB, free, open source — loaded from CDN).

To add real audio previews:
1. Upload 30-second MP3 files via Admin → Release Manager
2. The player will automatically use `/uploads/audio/filename.mp3`

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/admin/login` | Admin login |
| GET | `/api/releases` | All releases |
| POST | `/api/releases` | Create release (admin) |
| PUT | `/api/releases/:id` | Update release (admin) |
| DELETE | `/api/releases/:id` | Delete release (admin) |
| GET | `/api/artists` | All artists |
| POST | `/api/artists` | Create artist (admin) |
| GET | `/api/demos` | All demos (admin) |
| POST | `/api/demos/submit` | Submit demo (public) |
| PUT | `/api/demos/:id/status` | Update demo status (admin) |
| POST | `/api/newsletter/subscribe` | Subscribe (public) |
| GET | `/api/newsletter/subscribers` | All subscribers (admin) |
| POST | `/api/newsletter/send` | Send campaign (admin) |
| GET | `/api/bookings` | All bookings (admin) |
| POST | `/api/bookings/inquire` | Submit booking (public) |
| GET | `/api/events` | All events (public) |
| POST | `/api/events` | Create event (admin) |
| GET | `/api/royalties` | All royalties (admin) |
| POST | `/api/royalties` | Add royalty (admin) |
| GET | `/api/news` | Published news (public) |
| POST | `/api/news` | Create post (admin) |

---

## 🔄 Upgrading to a Real Database

The `src/api/db.js` file uses JSON files by default.
To upgrade to PostgreSQL:

```bash
npm install pg
```

Replace `db.get()` / `db.set()` calls with SQL queries.
The API route files don't need to change — only `db.js`.

---

## 🚢 Deployment (Vercel / Railway)

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Railway:**
1. Push to GitHub
2. Connect repo in railway.app
3. Set environment variables in Railway dashboard
4. Deploy

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| express | Web server |
| express-session | Admin/artist sessions |
| multer | File uploads (audio, artwork) |
| nodemailer | Email (newsletters, notifications) |
| bcryptjs | Password hashing |
| uuid | Unique IDs |
| dotenv | Environment variables |
| cors | Cross-origin requests |
| helmet | Security headers |
| nodemon | Auto-restart in dev |

---

## 🎨 Frontend Libraries (CDN — no install needed)

| Library | Purpose |
|---------|---------|
| Howler.js 2.2.3 | Audio player (free, 7KB) |
| Google Fonts | Anton + Syne + Syne Mono |

---

Built by Mixxea Records © 2025

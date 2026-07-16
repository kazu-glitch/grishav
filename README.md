# OtakuHub — Anime Watch-Party Planner

OtakuHub is a coursework web application for planning anime watch parties, tracking an anime catalogue, and discussing events. It demonstrates authenticated, role-based user and session management with a Flask API, Jinja2 frontend, JavaScript client, and MySQL persistence.

Project scope, requirements traceability, and the security design are documented in [docs/PROJECT_PROPOSAL.md](docs/PROJECT_PROPOSAL.md) and [docs/SECURITY.md](docs/SECURITY.md).

The Flask frontend uses Jinja2 templates, HTML, CSS, and JavaScript for a responsive dashboard with authentication, sessions, image uploads, Jikan search, and MySQL persistence.

## Folder Structure

```text
otakuhub_flask/
  app.py                 Flask app and REST API routes
  auth.py                User registration, login, logout, and session routes
  db.py                  MySQL connection helpers
  init_db.py             Creates and seeds the database
  requirements.txt       Python dependencies
  .env.example           Environment variable template
  database/
    schema.sql           MySQL tables
    seed.sql             Demo records
  static/
    app.js               Frontend logic connected to /api/state
    styles.css           UI styles
  templates/
    index.html           Flask-rendered page
  tests/
    test_auth.py         Authentication and session tests
```

## Setup

1. Create and activate a virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and update your MySQL password:

```bash
copy .env.example .env
```

Set a unique `SECRET_KEY` in `.env` before using sessions. Do not commit `.env`; the local file is ignored by Git.

4. Create and seed the MySQL database:

```bash
python init_db.py
```

Run `python init_db.py` again after schema or seed changes. It recreates the demo database, so only do this when you are okay resetting local demo records.

You can also run the SQL manually:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p otakuhub < database/seed.sql
```

5. Start Flask:

```bash
flask run
```

Open:

```text
http://127.0.0.1:5000
```

Create the first account through the sign-up form. New accounts receive the `user` role. An existing administrator assigns the `admin` role through the database administration process. The seed data deliberately does not create a default website account.

## User roles

| Role | Access |
| --- | --- |
| Guest | Browse public catalogue and sign in/register. |
| User | Session-backed profile, comments, and local planning interactions. |
| Admin | All user capabilities plus the Admin dashboard and MySQL-backed shared catalogue updates. |

## API Routes

```text
GET    /api/health
GET    /api/csrf-token
GET    /api/auth/me
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/state
PUT    /api/state

GET    /api/rooms
POST   /api/rooms
PUT    /api/rooms/<room_id>
DELETE /api/rooms/<room_id>

GET    /api/anime
POST   /api/anime
PUT    /api/anime/<anime_id>
DELETE /api/anime/<anime_id>

GET    /api/videos
POST   /api/videos

GET    /api/comments
POST   /api/comments
PUT    /api/comments/<comment_id>
DELETE /api/comments/<comment_id>

GET    /api/schedules
POST   /api/schedules
PUT    /api/schedules/<schedule_id>
DELETE /api/schedules/<schedule_id>

GET    /api/news
GET    /api/users
GET    /api/users/<user_id>
GET    /api/profile
POST   /api/uploads
GET    /api/jikan/search
```

The frontend loads from `/api/state`. Replacing the shared dashboard state is restricted to administrators and requires a valid CSRF token and logged-in session. Login, registration, and logout are the only authenticated API exceptions to the CSRF check.

### Enabling saved trailer links on an existing database

If you created the MySQL database before the trailer feature was added, run
`database/migrations/001_add_anime_trailer.sql` once. New installations already
include this column through `database/schema.sql`.

### Adding an anime video

Use `POST /api/videos` to save a video link for any anime. Send `animeTitle`, `title`, and an HTTP(S) `videoUrl`; `episode` and `thumbnailUrl` are optional. For example:

```json
{
  "animeTitle": "Frieren: Beyond Journey's End",
  "title": "Episode 1",
  "episode": 1,
  "videoUrl": "https://video.example.com/frieren-episode-1",
  "thumbnailUrl": "https://images.example.com/frieren.jpg"
}
```

## Tests

```bash
python -m pytest
```

Always run tests through the active virtual environment with `python -m pytest`. The pytest configuration adds the project root to Python's import path, so the Flask modules load consistently. The tests mock database calls for auth flows, so they can run without a live MySQL server.

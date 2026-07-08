# OtakuHub Flask + MySQL

Full-stack anime watch party platform with a Flask API, MySQL database, and the OtakuHub frontend served from Flask. The demo data uses Naruto, One Piece, Attack on Titan, and Hunter x Hunter poster URLs from MyAnimeList data returned by Jikan, plus genre and studio metadata for richer anime cards.

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
    assets/              Local PNG artwork
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

Set a unique `SECRET_KEY` in `.env` before using sessions outside local development.

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

Demo login:

```text
grishav@example.com / otakuhub123
```

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

The frontend loads from `/api/state` and saves dashboard changes back to MySQL through `PUT /api/state`. Data-changing API requests require a CSRF token and a logged-in session, except for login/register/logout routes.

## Tests

```bash
pytest
```

The tests mock database calls for auth flows, so they can run without a live MySQL server.

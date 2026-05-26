# OtakuHub Flask + MySQL

Full-stack anime watch party platform with a Flask API, MySQL database, and the OtakuHub frontend served from Flask.

## Folder Structure

```text
otakuhub_flask/
  app.py                 Flask app and REST API routes
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

4. Create and seed the MySQL database:

```bash
python init_db.py
```

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

## API Routes

```text
GET    /api/health
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
```

The frontend loads from `/api/state` and saves dashboard changes back to MySQL through `PUT /api/state`.

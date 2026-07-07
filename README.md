# OtakuHub

OtakuHub is a Flask and MySQL anime watch-party dashboard. It gives users a place to manage watch rooms, track anime progress, schedule premiere nights, post comments, save reactions, upload poster art, and search Jikan for anime details.

The project also includes the older static frontend files in the repo root, but the main web app lives in `otakuhub_flask/`.

## What It Does

- Create, edit, and delete anime watch rooms
- Join rooms and track live viewer counts
- Manage an anime library with favorites, ratings, status, and episode progress
- Search Jikan for anime titles, poster art, genre, studio, rating, and episode counts
- Upload local images for room and anime artwork
- Add calendar events for premieres, finales, and watch parties
- Post comments and review-style messages with anime-themed reactions
- Browse discovery rails for trending and group-watch recommendations
- View library insights such as top rated anime, most used reaction, and next title to finish
- Register, log in, and save changes through Flask sessions
- Protect API writes with CSRF tokens
- Switch between dark and light themes

## Tech Stack

- Python 3
- Flask
- MySQL
- Vanilla JavaScript
- HTML and CSS

## Project Structure

```text
.
|-- README.md
|-- index.html
|-- styles.css
|-- app.js
|-- docs/
|   |-- API_REFERENCE.md
|   |-- DATABASE_ERD.md
|   |-- SECURITY_ARCHITECTURE.md
|   `-- TESTING.md
`-- otakuhub_flask/
    |-- app.py
    |-- auth.py
    |-- db.py
    |-- init_db.py
    |-- requirements.txt
    |-- .env.example
    |-- database/
    |   |-- schema.sql
    |   `-- seed.sql
    |-- static/
    |   |-- app.js
    |   |-- styles.css
    |   |-- assets/
    |   `-- uploads/
    `-- templates/
        `-- index.html
```

## Documentation

- [API Reference](docs/API_REFERENCE.md)
- [Database ERD](docs/DATABASE_ERD.md)
- [Security Architecture](docs/SECURITY_ARCHITECTURE.md)
- [Testing Notes](docs/TESTING.md)

## Run The Web App

Open a terminal from the repository root:

```powershell
cd otakuhub_flask
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and set your MySQL password:

```env
FLASK_APP=app.py
FLASK_DEBUG=1
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=otakuhub
```

Create and seed the database:

```powershell
python init_db.py
```

Start Flask:

```powershell
flask run
```

Open the app:

```text
http://127.0.0.1:5000
```

Demo login:

```text
mika@example.com / otakuhub123
```

## Database Notes

`python init_db.py` runs both SQL files:

- `otakuhub_flask/database/schema.sql`
- `otakuhub_flask/database/seed.sql`

Running it again resets the local demo data. That is useful while developing, but do not run it if you are trying to keep local changes in the database.

You can also run the SQL manually:

```powershell
mysql -u root -p < database/schema.sql
mysql -u root -p otakuhub < database/seed.sql
```

## Useful Routes

```text
GET    /
GET    /api/health
GET    /api/state
PUT    /api/state
GET    /api/news
GET    /api/discovery
GET    /api/jikan/search?q=naruto
POST   /api/uploads
```

The app also has CRUD routes for auth, rooms, anime, comments, and schedules.

## Uploads And Jikan

Uploads are saved to:

```text
otakuhub_flask/static/uploads/
```

The folder keeps a `.gitkeep`, but uploaded images are ignored by git so test files do not end up in commits.

Jikan search needs the Flask backend running because the browser calls `/api/jikan/search`, and Flask then contacts the Jikan API. If Jikan is down or your network is offline, the rest of the app still works with local/demo data.

## Troubleshooting

If Flask cannot connect to MySQL, check that MySQL is running and that `.env` has the correct username, password, host, port, and database name.

If `flask run` says it cannot find the app, make sure you are inside `otakuhub_flask/` and that `.env` contains `FLASK_APP=app.py`.

If image upload fails, make sure the backend is running and you are logged in. Uploads use a CSRF token from `/api/csrf-token`, so opening the HTML file directly will not support uploads.

If the page loads but database changes do not save, visit:

```text
http://127.0.0.1:5000/api/health
```

The response should include `"status": "ok"` and `"database": "connected"`.

## Demonstration Video

Add your unlisted YouTube or Google Drive video link here before submission:

```text
TODO: paste demonstration video link
```

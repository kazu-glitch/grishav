import json
import os
import secrets
import time
from pathlib import Path
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen
import uuid

from flask import Flask, jsonify, render_template, request, session
from mysql.connector import Error
from werkzeug.utils import secure_filename

from auth import auth_bp, current_user
from db import execute, fetch_all, fetch_one, get_connection

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", secrets.token_hex(32))
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "0") == "1"
app.config["JSON_SORT_KEYS"] = False
app.register_blueprint(auth_bp)
SERVICE_NAME = "otakuhub-flask"


def create_app(test_config=None):
    if test_config:
        app.config.update(test_config)
    return app

UPLOAD_FOLDER = Path(app.root_path) / "static" / "uploads"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
JIKAN_CACHE = {}
JIKAN_TTL = 900
JIKAN_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
JIKAN_MAX_ATTEMPTS = 2

JIKAN_FALLBACK = [
    {
        "title": "Naruto",
        "episodes": 220,
        "rating": 8.0,
        "status": "planned",
        "genre": "Ninja Adventure",
        "studio": "Pierrot",
        "imageUrl": "https://cdn.myanimelist.net/images/anime/1141/142503l.jpg",
        "malUrl": "https://myanimelist.net/anime/20/Naruto",
    },
    {
        "title": "One Piece",
        "episodes": 1122,
        "rating": 8.7,
        "status": "planned",
        "genre": "Pirate Adventure",
        "studio": "Toei Animation",
        "imageUrl": "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg",
        "malUrl": "https://myanimelist.net/anime/21/One_Piece",
    },
    {
        "title": "Attack on Titan",
        "episodes": 25,
        "rating": 8.6,
        "status": "planned",
        "genre": "Dark Fantasy",
        "studio": "Wit Studio",
        "imageUrl": "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
        "malUrl": "https://myanimelist.net/anime/16498/Shingeki_no_Kyojin",
    },
    {
        "title": "Hunter x Hunter",
        "episodes": 148,
        "rating": 9.0,
        "status": "planned",
        "genre": "Action Adventure",
        "studio": "Madhouse",
        "imageUrl": "https://cdn.myanimelist.net/images/anime/1337/99013l.jpg",
        "malUrl": "https://myanimelist.net/anime/11061/Hunter_x_Hunter_2011",
    },
]

NEWS = [
    {
        "title": "Spring simulcast slate locks in three premiere windows",
        "text": "The seasonal calendar added new late-night drops and two same-day dub watch windows.",
    },
    {
        "title": "Studio panel confirms extended finale runtime",
        "text": "The finale event is now scheduled as a 48-minute watch party with host notes enabled.",
    },
    {
        "title": "OtakuHub recommendation tuning improved",
        "text": "Favorites, rating history, and episode progress now influence suggested group watches.",
    },
]

DISCOVERY_RAILS = [
    {
        "title": "Trending with hosts",
        "items": [
            {"title": "Frieren: Beyond Journey's End", "tag": "Fantasy", "match": 96},
            {"title": "Demon Slayer: Hashira Training Arc", "tag": "Action", "match": 91},
            {"title": "Jujutsu Kaisen", "tag": "Supernatural", "match": 89},
        ],
    },
    {
        "title": "Good for group nights",
        "items": [
            {"title": "Haikyu!!", "tag": "Sports", "match": 94},
            {"title": "Spy x Family", "tag": "Comedy", "match": 90},
            {"title": "Mob Psycho 100", "tag": "Action Comedy", "match": 88},
        ],
    },
    {
        "title": "Short watch commitments",
        "items": [
            {"title": "Cyberpunk: Edgerunners", "tag": "Sci-fi", "match": 87},
            {"title": "Odd Taxi", "tag": "Mystery", "match": 85},
            {"title": "Erased", "tag": "Thriller", "match": 83},
        ],
    },
]


def new_id(prefix):
    return f"{prefix}-{uuid.uuid4()}"


def ok(payload=None, status=200):
    return jsonify(payload if payload is not None else {"ok": True}), status


def json_body():
    return request.get_json(silent=True) or {}


def admin_required():
    user = current_user()
    if not user:
        return ok({"error": "Login required for this action"}, 401)
    if user.get("role") != "admin":
        return ok({"error": "Administrator access is required"}, 403)
    return None


def is_allowed_image(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


@app.before_request
def protect_api_writes():
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None
    if not request.path.startswith("/api/") or request.path == "/api/csrf-token":
        return None

    token = request.headers.get("X-CSRFToken") or request.headers.get("X-CSRF-Token")
    if token and secrets.compare_digest(token, csrf_token()):
        if request.path.startswith("/api/auth/"):
            return None
        if current_user():
            return None
        return ok({"error": "Login required for this action"}, 401)
    return ok({"error": "CSRF token missing or invalid"}, 403)


@app.after_request
def apply_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


def parse_reactions(value):
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return {}


def room_to_json(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "anime": row["anime"],
        "episode": row["episode"],
        "capacity": row["capacity"],
        "viewers": row["viewers"],
        "status": row["status"],
        "imageUrl": row.get("image_url"),
        "trailerUrl": row.get("trailer_url"),
        "reactions": parse_reactions(row["reactions"]),
    }


def anime_to_json(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "episodes": row["episodes"],
        "watched": row["watched"],
        "rating": float(row["rating"]),
        "status": row["status"],
        "favorite": bool(row["favorite"]),
        "genre": row.get("genre", "Shonen"),
        "studio": row.get("studio", "Studio TBA"),
        "imageUrl": row.get("image_url"),
    }


def video_to_json(row):
    return {
        "id": row["id"],
        "animeTitle": row["anime_title"],
        "title": row["title"],
        "episode": row["episode"],
        "videoUrl": row["video_url"],
        "thumbnailUrl": row.get("thumbnail_url"),
    }


def comment_to_json(row):
    return {
        "id": row["id"],
        "author": row["author"],
        "target": row["target"],
        "message": row["message"],
        "reaction": row["reaction"],
        "createdAt": row["created_at_ms"],
    }


def schedule_to_json(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "date": row["date"].isoformat(),
        "time": str(row["time"])[:5],
        "type": row["type"],
    }


def user_to_json(row):
    return {
        "id": row["id"],
        "displayName": row["display_name"],
        "username": row["username"],
        "bio": row["bio"],
        "avatarUrl": row["avatar_url"],
        "role": row["role"],
    }


def notification_to_json(row):
    return row["message"]


def fallback_jikan_items(query):
    normalized = query.lower()
    matches = [
        item for item in JIKAN_FALLBACK
        if normalized in item["title"].lower() or normalized in item["genre"].lower()
    ]
    return matches or JIKAN_FALLBACK[:3]


def fetch_jikan_payload(url):
    """Fetch Jikan once more for transient upstream and rate-limit failures."""
    last_error = None
    for attempt in range(JIKAN_MAX_ATTEMPTS):
        try:
            req = Request(url, headers={"User-Agent": "OtakuHub/1.0", "Accept": "application/json"})
            with urlopen(req, timeout=8) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            last_error = error
            if error.code not in JIKAN_RETRYABLE_STATUS_CODES:
                break
        except (OSError, URLError, json.JSONDecodeError) as error:
            last_error = error

        if attempt < JIKAN_MAX_ATTEMPTS - 1:
            time.sleep(0.5)
    raise last_error


@app.errorhandler(Error)
def database_error(error):
    app.logger.exception("Database request failed: %s", error)
    return ok({"error": "Database error"}, 500)


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    with get_connection() as connection:
        connection.ping(reconnect=True)
    return ok({
        "status": "ok",
        "service": SERVICE_NAME,
        "database": "connected",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    })


@app.get("/api/news")
def get_news():
    return ok(NEWS)


@app.get("/api/discovery")
def get_discovery():
    return ok(DISCOVERY_RAILS)


@app.get("/api/csrf-token")
def get_csrf_token():
    return ok({"csrf_token": csrf_token()})


@app.post("/api/uploads")
def upload_image():
    image = request.files.get("image")
    if not image or not image.filename:
        return ok({"error": "No image selected"}, 400)
    if not is_allowed_image(image.filename):
        return ok({"error": "Use a JPG, PNG, GIF, or WebP image"}, 400)

    extension = image.filename.rsplit(".", 1)[1].lower()
    safe_name = secure_filename(image.filename.rsplit(".", 1)[0]) or "upload"
    filename = f"{safe_name}-{uuid.uuid4().hex}.{extension}"
    image.save(UPLOAD_FOLDER / filename)
    return ok({"url": f"/static/uploads/{filename}", "filename": filename}, 201)


@app.get("/api/jikan/search")
def search_jikan():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return ok([])

    cache_key = query.lower()
    cached = JIKAN_CACHE.get(cache_key)
    if cached and time.time() - cached["created_at"] < JIKAN_TTL:
        return ok(cached["items"])

    url = f"https://api.jikan.moe/v4/anime?q={quote(query)}&limit=8&sfw=true"
    try:
        payload = fetch_jikan_payload(url)
    except (OSError, URLError, json.JSONDecodeError) as error:
        items = fallback_jikan_items(query)
        JIKAN_CACHE[cache_key] = {"created_at": time.time(), "items": items}
        return ok({"items": items, "source": "local-fallback", "detail": "Jikan is temporarily unavailable."})

    items = []
    for anime in payload.get("data", []):
        images = anime.get("images", {}).get("jpg", {})
        titles = anime.get("titles", [])
        english_title = next((item.get("title") for item in titles if item.get("type") == "English"), None)
        items.append({
            "title": english_title or anime.get("title_english") or anime.get("title"),
            "episodes": anime.get("episodes") or 1,
            "rating": anime.get("score") or 7.0,
            "status": "planned",
            "genre": ", ".join(genre.get("name") for genre in anime.get("genres", [])[:2]) or "Anime",
            "studio": ", ".join(studio.get("name") for studio in anime.get("studios", [])[:2]) or "Studio TBA",
            "imageUrl": images.get("large_image_url") or images.get("image_url"),
            "trailerUrl": anime.get("trailer", {}).get("url"),
            "malUrl": anime.get("url"),
        })

    JIKAN_CACHE[cache_key] = {"created_at": time.time(), "items": items}
    return ok(items)


@app.get("/api/users")
def list_users():
    access_error = admin_required()
    if access_error:
        return access_error
    return ok([user_to_json(row) for row in fetch_all("SELECT * FROM users ORDER BY created_at DESC")])


@app.get("/api/users/<user_id>")
def get_user(user_id):
    user = fetch_one("SELECT * FROM users WHERE id = %s", (user_id,))
    if not user:
        return ok({"error": "User not found"}, 404)
    return ok(user_to_json(user))


@app.get("/api/profile")
def get_profile():
    user = current_user()
    if not user:
        return ok({"error": "Login required"}, 401)
    return ok(user_to_json(user))


@app.get("/api/state")
def get_state():
    rooms = [room_to_json(row) for row in fetch_all("SELECT * FROM watch_rooms ORDER BY created_at DESC")]
    anime = [anime_to_json(row) for row in fetch_all("SELECT * FROM anime_lists ORDER BY created_at DESC")]
    comments = [comment_to_json(row) for row in fetch_all("SELECT * FROM comments ORDER BY created_at_ms DESC")]
    schedules = [schedule_to_json(row) for row in fetch_all("SELECT * FROM schedules ORDER BY date, time")]
    notifications = [notification_to_json(row) for row in fetch_all("SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT 12")]
    return ok({
        "rooms": rooms,
        "anime": anime,
        "comments": comments,
        "schedules": schedules,
        "notifications": notifications,
        "theme": "dark",
    })


@app.put("/api/state")
def replace_state():
    access_error = admin_required()
    if access_error:
        return access_error
    data = json_body()
    rooms = data.get("rooms", [])
    anime = data.get("anime", [])
    comments = data.get("comments", [])
    schedules = data.get("schedules", [])
    notifications = data.get("notifications", [])

    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM notifications")
        cursor.execute("DELETE FROM comments")
        cursor.execute("DELETE FROM schedules")
        cursor.execute("DELETE FROM anime_lists")
        cursor.execute("DELETE FROM watch_rooms")

        cursor.executemany(
            """
            INSERT INTO watch_rooms (id, name, anime, episode, capacity, viewers, status, image_url, reactions)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    room.get("id", new_id("room")),
                    room.get("name", "Untitled room"),
                    room.get("anime", "Unknown anime"),
                    int(room.get("episode", 1)),
                    int(room.get("capacity", 2)),
                    int(room.get("viewers", 0)),
                    room.get("status", "Scheduled"),
                    room.get("imageUrl"),
                    json.dumps(room.get("reactions", {}), ensure_ascii=False),
                )
                for room in rooms
            ],
        )
        cursor.executemany(
            """
            INSERT INTO anime_lists (id, title, episodes, watched, rating, status, favorite, genre, studio, image_url, trailer_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    item.get("id", new_id("anime")),
                    item.get("title", "Untitled anime"),
                    int(item.get("episodes", 1)),
                    int(item.get("watched", 0)),
                    float(item.get("rating", 0)),
                    item.get("status", "planned"),
                    bool(item.get("favorite", False)),
                    item.get("genre", "Shonen"),
                    item.get("studio", "Studio TBA"),
                    item.get("imageUrl"),
                    item.get("trailerUrl"),
                )
                for item in anime
            ],
        )
        cursor.executemany(
            """
            INSERT INTO comments (id, author, target, message, reaction, created_at_ms)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    comment.get("id", new_id("comment")),
                    comment.get("author", "Anonymous"),
                    comment.get("target", "Global Chat"),
                    comment.get("message", ""),
                    comment.get("reaction", "Ninja Hype"),
                    int(comment.get("createdAt", int(time.time() * 1000))),
                )
                for comment in comments
            ],
        )
        cursor.executemany(
            """
            INSERT INTO schedules (id, title, date, time, type)
            VALUES (%s, %s, %s, %s, %s)
            """,
            [
                (
                    schedule.get("id", new_id("schedule")),
                    schedule.get("title", "Untitled event"),
                    schedule.get("date"),
                    schedule.get("time"),
                    schedule.get("type", "Premiere"),
                )
                for schedule in schedules
            ],
        )
        cursor.executemany(
            "INSERT INTO notifications (message) VALUES (%s)",
            [(message,) for message in notifications[:12]],
        )
        connection.commit()
        cursor.close()

    return get_state()


@app.get("/api/rooms")
def list_rooms():
    return ok([room_to_json(row) for row in fetch_all("SELECT * FROM watch_rooms ORDER BY created_at DESC")])


@app.post("/api/rooms")
def create_room():
    data = json_body()
    room_id = data.get("id", new_id("room"))
    execute(
        """
        INSERT INTO watch_rooms (id, name, anime, episode, capacity, viewers, status, image_url, reactions)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            room_id,
            data["name"],
            data["anime"],
            int(data["episode"]),
            int(data["capacity"]),
            int(data.get("viewers", 0)),
            data.get("status", "Scheduled"),
            data.get("imageUrl"),
            json.dumps(data.get("reactions", {}), ensure_ascii=False),
        ),
    )
    return ok(room_to_json(fetch_one("SELECT * FROM watch_rooms WHERE id = %s", (room_id,))), 201)


@app.put("/api/rooms/<room_id>")
def update_room(room_id):
    data = json_body()
    execute(
        """
        UPDATE watch_rooms
        SET name = %s, anime = %s, episode = %s, capacity = %s, viewers = %s, status = %s, image_url = %s, reactions = %s
        WHERE id = %s
        """,
        (
            data["name"],
            data["anime"],
            int(data["episode"]),
            int(data["capacity"]),
            int(data.get("viewers", 0)),
            data.get("status", "Scheduled"),
            data.get("imageUrl"),
            json.dumps(data.get("reactions", {}), ensure_ascii=False),
            room_id,
        ),
    )
    return ok(room_to_json(fetch_one("SELECT * FROM watch_rooms WHERE id = %s", (room_id,))))


@app.delete("/api/rooms/<room_id>")
def delete_room(room_id):
    execute("DELETE FROM watch_rooms WHERE id = %s", (room_id,))
    return ok()


@app.get("/api/anime")
def list_anime():
    return ok([anime_to_json(row) for row in fetch_all("SELECT * FROM anime_lists ORDER BY created_at DESC")])


@app.get("/api/videos")
def list_videos():
    return ok([
        video_to_json(row)
        for row in fetch_all("SELECT * FROM anime_videos ORDER BY created_at DESC")
    ])


@app.post("/api/videos")
def create_video():
    data = json_body()
    anime_title = data.get("animeTitle", "").strip()
    title = data.get("title", "").strip()
    video_url = data.get("videoUrl", "").strip()

    if not anime_title or not title or not video_url:
        return ok({"error": "Anime title, video title, and video URL are required"}, 400)
    if urlparse(video_url).scheme not in {"http", "https"}:
        return ok({"error": "Video URL must use http or https"}, 400)

    video_id = data.get("id", new_id("video"))
    execute(
        """
        INSERT INTO anime_videos (id, anime_title, title, episode, video_url, thumbnail_url)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            video_id,
            anime_title,
            title,
            data.get("episode"),
            video_url,
            data.get("thumbnailUrl"),
        ),
    )
    return ok(video_to_json(fetch_one("SELECT * FROM anime_videos WHERE id = %s", (video_id,))), 201)


@app.post("/api/anime")
def create_anime():
    data = json_body()
    anime_id = data.get("id", new_id("anime"))
    execute(
        """
        INSERT INTO anime_lists (id, title, episodes, watched, rating, status, favorite, genre, studio, image_url, trailer_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (anime_id, data["title"], int(data["episodes"]), int(data.get("watched", 0)), float(data.get("rating", 0)), data.get("status", "planned"), bool(data.get("favorite", False)), data.get("genre", "Shonen"), data.get("studio", "Studio TBA"), data.get("imageUrl"), data.get("trailerUrl")),
    )
    return ok(anime_to_json(fetch_one("SELECT * FROM anime_lists WHERE id = %s", (anime_id,))), 201)


@app.put("/api/anime/<anime_id>")
def update_anime(anime_id):
    data = json_body()
    execute(
        """
        UPDATE anime_lists
        SET title = %s, episodes = %s, watched = %s, rating = %s, status = %s, favorite = %s, genre = %s, studio = %s, image_url = %s, trailer_url = %s
        WHERE id = %s
        """,
        (data["title"], int(data["episodes"]), int(data.get("watched", 0)), float(data.get("rating", 0)), data.get("status", "planned"), bool(data.get("favorite", False)), data.get("genre", "Shonen"), data.get("studio", "Studio TBA"), data.get("imageUrl"), data.get("trailerUrl"), anime_id),
    )
    return ok(anime_to_json(fetch_one("SELECT * FROM anime_lists WHERE id = %s", (anime_id,))))


@app.delete("/api/anime/<anime_id>")
def delete_anime(anime_id):
    execute("DELETE FROM anime_lists WHERE id = %s", (anime_id,))
    return ok()


@app.get("/api/comments")
def list_comments():
    return ok([comment_to_json(row) for row in fetch_all("SELECT * FROM comments ORDER BY created_at_ms DESC")])


@app.post("/api/comments")
def create_comment():
    data = json_body()
    comment_id = data.get("id", new_id("comment"))
    execute(
        """
        INSERT INTO comments (id, author, target, message, reaction, created_at_ms)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (comment_id, data["author"], data["target"], data["message"], data.get("reaction", "Ninja Hype"), int(data.get("createdAt", int(time.time() * 1000)))),
    )
    return ok(comment_to_json(fetch_one("SELECT * FROM comments WHERE id = %s", (comment_id,))), 201)


@app.put("/api/comments/<comment_id>")
def update_comment(comment_id):
    data = json_body()
    execute(
        """
        UPDATE comments
        SET author = %s, target = %s, message = %s, reaction = %s, created_at_ms = %s
        WHERE id = %s
        """,
        (data["author"], data["target"], data["message"], data.get("reaction", "Ninja Hype"), int(data.get("createdAt", int(time.time() * 1000))), comment_id),
    )
    return ok(comment_to_json(fetch_one("SELECT * FROM comments WHERE id = %s", (comment_id,))))


@app.delete("/api/comments/<comment_id>")
def delete_comment(comment_id):
    execute("DELETE FROM comments WHERE id = %s", (comment_id,))
    return ok()


@app.get("/api/schedules")
def list_schedules():
    return ok([schedule_to_json(row) for row in fetch_all("SELECT * FROM schedules ORDER BY date, time")])


@app.post("/api/schedules")
def create_schedule():
    data = json_body()
    schedule_id = data.get("id", new_id("schedule"))
    execute(
        """
        INSERT INTO schedules (id, title, date, time, type)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (schedule_id, data["title"], data["date"], data["time"], data.get("type", "Premiere")),
    )
    return ok(schedule_to_json(fetch_one("SELECT * FROM schedules WHERE id = %s", (schedule_id,))), 201)


@app.put("/api/schedules/<schedule_id>")
def update_schedule(schedule_id):
    data = json_body()
    execute(
        """
        UPDATE schedules
        SET title = %s, date = %s, time = %s, type = %s
        WHERE id = %s
        """,
        (data["title"], data["date"], data["time"], data.get("type", "Premiere"), schedule_id),
    )
    return ok(schedule_to_json(fetch_one("SELECT * FROM schedules WHERE id = %s", (schedule_id,))))


@app.delete("/api/schedules/<schedule_id>")
def delete_schedule(schedule_id):
    execute("DELETE FROM schedules WHERE id = %s", (schedule_id,))
    return ok()


if __name__ == "__main__":
    app.run(debug=True)

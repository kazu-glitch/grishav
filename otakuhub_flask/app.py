import json
import time
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, render_template, request
from mysql.connector import Error

from db import execute, fetch_all, fetch_one, get_connection

app = Flask(__name__)

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


def new_id(prefix):
    return f"{prefix}-{uuid.uuid4()}"


def ok(payload=None, status=200):
    return jsonify(payload if payload is not None else {"ok": True}), status


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


@app.errorhandler(Error)
def database_error(error):
    return ok({"error": "Database error", "detail": str(error)}, 500)


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    with get_connection() as connection:
        connection.ping(reconnect=True)
    return ok({
        "status": "ok",
        "service": "otakuhub-flask",
        "database": "connected",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    })


@app.get("/api/news")
def get_news():
    return ok(NEWS)


@app.get("/api/users")
def list_users():
    return ok([user_to_json(row) for row in fetch_all("SELECT * FROM users ORDER BY created_at DESC")])


@app.get("/api/users/<user_id>")
def get_user(user_id):
    user = fetch_one("SELECT * FROM users WHERE id = %s", (user_id,))
    if not user:
        return ok({"error": "User not found"}, 404)
    return ok(user_to_json(user))


@app.get("/api/profile")
def get_profile():
    user = fetch_one("SELECT * FROM users ORDER BY created_at LIMIT 1")
    if not user:
        return ok({"error": "No profile found"}, 404)
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
    data = request.get_json(force=True)
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
            INSERT INTO anime_lists (id, title, episodes, watched, rating, status, favorite, genre, studio, image_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
    data = request.get_json(force=True)
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
    data = request.get_json(force=True)
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


@app.post("/api/anime")
def create_anime():
    data = request.get_json(force=True)
    anime_id = data.get("id", new_id("anime"))
    execute(
        """
        INSERT INTO anime_lists (id, title, episodes, watched, rating, status, favorite, genre, studio, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (anime_id, data["title"], int(data["episodes"]), int(data.get("watched", 0)), float(data.get("rating", 0)), data.get("status", "planned"), bool(data.get("favorite", False)), data.get("genre", "Shonen"), data.get("studio", "Studio TBA"), data.get("imageUrl")),
    )
    return ok(anime_to_json(fetch_one("SELECT * FROM anime_lists WHERE id = %s", (anime_id,))), 201)


@app.put("/api/anime/<anime_id>")
def update_anime(anime_id):
    data = request.get_json(force=True)
    execute(
        """
        UPDATE anime_lists
        SET title = %s, episodes = %s, watched = %s, rating = %s, status = %s, favorite = %s, genre = %s, studio = %s, image_url = %s
        WHERE id = %s
        """,
        (data["title"], int(data["episodes"]), int(data.get("watched", 0)), float(data.get("rating", 0)), data.get("status", "planned"), bool(data.get("favorite", False)), data.get("genre", "Shonen"), data.get("studio", "Studio TBA"), data.get("imageUrl"), anime_id),
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
    data = request.get_json(force=True)
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
    data = request.get_json(force=True)
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
    data = request.get_json(force=True)
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
    data = request.get_json(force=True)
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

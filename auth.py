import re

from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from db import execute, fetch_one

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def auth_response(payload=None, status=200):
    return jsonify(payload if payload is not None else {"ok": True}), status


def public_user(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "displayName": row["display_name"],
        "username": row["username"],
        "email": row.get("email"),
        "bio": row.get("bio"),
        "avatarUrl": row.get("avatar_url"),
        "role": row.get("role", "user"),
    }


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return fetch_one(
        "SELECT id, display_name, username, email, bio, avatar_url, role FROM users WHERE id = %s",
        (user_id,),
    )


@auth_bp.get("/me")
def me():
    user = current_user()
    if not user:
        return auth_response({"user": None}, 401)
    return auth_response({"user": public_user(user)})


@auth_bp.post("/register")
def register():
    data = request.get_json(force=True)
    display_name = (data.get("displayName") or data.get("display_name") or "").strip()
    username = (data.get("username") or "").strip().lower()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if len(display_name) < 2:
        return auth_response({"error": "Display name must be at least 2 characters."}, 400)
    if not re.fullmatch(r"[a-z0-9_]{3,30}", username):
        return auth_response({"error": "Username must be 3-30 lowercase letters, numbers, or underscores."}, 400)
    if not EMAIL_RE.fullmatch(email):
        return auth_response({"error": "Enter a valid email address."}, 400)
    if len(password) < 8:
        return auth_response({"error": "Password must be at least 8 characters."}, 400)

    existing = fetch_one("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
    if existing:
        return auth_response({"error": "That username or email is already registered."}, 409)

    user_id = f"user-{username}"
    execute(
        """
        INSERT INTO users (id, display_name, username, email, password_hash, bio, avatar_url, role)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'user')
        """,
        (
            user_id,
            display_name,
            username,
            email,
            generate_password_hash(password),
            "New OtakuHub member.",
            None,
        ),
    )
    execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
    preserve_csrf_token()
    session["user_id"] = user_id
    return auth_response({"user": public_user(fetch_one("SELECT * FROM users WHERE id = %s", (user_id,)))}, 201)


@auth_bp.post("/login")
def login():
    data = request.get_json(force=True)
    identifier = (data.get("identifier") or data.get("email") or data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    user = fetch_one("SELECT * FROM users WHERE username = %s OR email = %s", (identifier, identifier))
    if not user or not user.get("password_hash") or not check_password_hash(user["password_hash"], password):
        return auth_response({"error": "Invalid username/email or password."}, 401)

    preserve_csrf_token()
    session["user_id"] = user["id"]
    execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = %s", (user["id"],))
    user["last_login_at"] = None
    return auth_response({"user": public_user(user)})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return auth_response({"ok": True})


def preserve_csrf_token():
    """Clear pre-auth session state while retaining the valid form token."""
    csrf_token = session.get("csrf_token")
    session.clear()
    if csrf_token:
        session["csrf_token"] = csrf_token

import pytest
from urllib.error import URLError
from werkzeug.security import check_password_hash

import auth
import app as app_module
from app import create_app

pytestmark = pytest.mark.test


@pytest.fixture()
def client(monkeypatch):
    users = {}

    def fake_fetch_one(query, params=None):
        params = params or ()
        normalized = " ".join(query.lower().split())

        if "where username = %s or email = %s" in normalized:
            identifier_a, identifier_b = params
            return next(
                (
                    user
                    for user in users.values()
                    if user["username"] == identifier_a or user["email"] == identifier_b
                ),
                None,
            )

        if "where id = %s" in normalized:
            return users.get(params[0])

        return None

    def fake_execute(query, params=None):
        if query.lstrip().upper().startswith("UPDATE USERS SET LAST_LOGIN_AT"):
            return
        (
            user_id,
            display_name,
            username,
            email,
            password_hash,
            bio,
            avatar_url,
        ) = params
        users[user_id] = {
            "id": user_id,
            "display_name": display_name,
            "displayName": display_name,
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "bio": bio,
            "avatar_url": avatar_url,
            "role": "user",
        }

    monkeypatch.setattr(auth, "fetch_one", fake_fetch_one)
    monkeypatch.setattr(auth, "execute", fake_execute)

    flask_app = create_app({"TESTING": True, "SECRET_KEY": "pytest-secret"})
    flask_app.config["TEST_USERS"] = users
    with flask_app.test_client() as test_client:
        yield test_client


def csrf_headers(client):
    token = client.get("/api/csrf-token").get_json()["csrf_token"]
    return {"X-CSRFToken": token}


def test_csrf_token_response_is_not_cacheable(client):
    response = client.get("/api/csrf-token")

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store, max-age=0"


def test_register_creates_user_and_session(client):
    response = client.post(
        "/api/auth/register",
        json={
            "displayName": "Kazu Host",
            "username": "kazu",
            "email": "kazu@example.com",
            "password": "secret123",
        },
        headers=csrf_headers(client),
    )

    assert response.status_code == 201
    assert response.get_json()["user"]["username"] == "kazu"

    stored = client.application.config["TEST_USERS"]["user-kazu"]
    assert check_password_hash(stored["password_hash"], "secret123")

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["displayName"] == "Kazu Host"


def test_login_rejects_bad_password(client):
    client.post(
        "/api/auth/register",
        json={
            "displayName": "Grishav Rimal",
            "username": "grishav",
            "email": "grishav@example.com",
            "password": "otakuhub123",
        },
        headers=csrf_headers(client),
    )

    response = client.post(
        "/api/auth/login",
        json={"identifier": "grishav@example.com", "password": "wrong-password"},
        headers=csrf_headers(client),
    )

    assert response.status_code == 401
    assert "Invalid" in response.get_json()["error"]


def test_login_and_logout(client):
    client.post(
        "/api/auth/register",
        json={
            "displayName": "Ren",
            "username": "ren",
            "email": "ren@example.com",
            "password": "secret123",
        },
        headers=csrf_headers(client),
    )

    logout = client.post("/api/auth/logout", json={}, headers=csrf_headers(client))
    assert logout.status_code == 200

    login = client.post(
        "/api/auth/login",
        json={"identifier": "ren", "password": "secret123"},
        headers=csrf_headers(client),
    )
    assert login.status_code == 200
    assert login.get_json()["user"]["email"] == "ren@example.com"

    logout = client.post("/api/auth/logout", json={}, headers=csrf_headers(client))
    assert logout.status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_profile_returns_the_signed_in_users_profile(client):
    client.post(
        "/api/auth/register",
        json={
            "displayName": "Profile Owner",
            "username": "profileowner",
            "email": "profile@example.com",
            "password": "secret123",
        },
        headers=csrf_headers(client),
    )

    response = client.get("/api/profile")

    assert response.status_code == 200
    assert response.get_json()["displayName"] == "Profile Owner"
    assert response.get_json()["username"] == "profileowner"


def test_api_write_requires_csrf_token(client):
    response = client.post("/api/rooms", json={})

    assert response.status_code == 403
    assert "CSRF" in response.get_json()["error"]


def test_api_write_requires_login(client):
    response = client.post("/api/rooms", json={}, headers=csrf_headers(client))

    assert response.status_code == 401
    assert response.get_json()["error"] == "Login required for this action"


def test_shared_state_write_requires_an_administrator(client):
    client.post(
        "/api/auth/register",
        json={
            "displayName": "Regular Member",
            "username": "member",
            "email": "member@example.com",
            "password": "secret123",
        },
        headers=csrf_headers(client),
    )

    response = client.put("/api/state", json={}, headers=csrf_headers(client))

    assert response.status_code == 403
    assert response.get_json()["error"] == "Administrator access is required"


def test_jikan_search_uses_secondary_catalogue_when_jikan_is_unavailable(client, monkeypatch):
    app_module.JIKAN_CACHE.clear()

    def unavailable_jikan(*args, **kwargs):
        raise URLError("offline")

    monkeypatch.setattr(app_module, "fetch_jikan_payload", unavailable_jikan)
    monkeypatch.setattr(app_module, "fetch_anilist_payload", lambda query: {
        "data": {"Page": {"media": [{
            "title": {"english": "Frieren: Beyond Journey's End", "romaji": "Sousou no Frieren"},
            "episodes": 28,
            "averageScore": 90,
            "genres": ["Adventure", "Drama"],
            "studios": {"nodes": [{"name": "Madhouse"}]},
            "coverImage": {"large": "https://example.com/frieren.jpg"},
            "trailer": None,
            "siteUrl": "https://anilist.co/anime/154587",
        }]}}}
    )

    response = client.get("/api/jikan/search?q=frieren")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["source"] == "secondary"
    assert payload["items"][0]["title"] == "Frieren: Beyond Journey's End"


def test_video_submission_rejects_non_web_url(client):
    client.post(
        "/api/auth/register",
        json={
            "displayName": "Video Host",
            "username": "videohost",
            "email": "video@example.com",
            "password": "secret123",
        },
        headers=csrf_headers(client),
    )

    response = client.post(
        "/api/videos",
        json={
            "animeTitle": "Naruto",
            "title": "Episode 1",
            "videoUrl": "file:///local-video.mp4",
        },
        headers=csrf_headers(client),
    )

    assert response.status_code == 400
    assert "http or https" in response.get_json()["error"]

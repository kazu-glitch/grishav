# OtakuHub API Reference

Base URL when running locally:

```text
http://127.0.0.1:5000
```

## Health

```http
GET /api/health
```

Checks whether Flask can connect to MySQL.

Successful responses include the service name, database connection status, and UTC check time.

```json
{
  "status": "ok",
  "service": "otakuhub-flask",
  "database": "connected",
  "checkedAt": "2026-06-14T00:00:00+00:00"
}
```

## Full App State

```http
GET /api/state
```

Returns rooms, anime, comments, schedules, notifications, and theme data for the dashboard.

```http
PUT /api/state
```

Replaces the demo app state in MySQL. The frontend uses this route when saving dashboard changes.

Write requests under `/api/` require a valid `X-CSRFToken` header. Data-changing application routes also require a logged-in user session.

## Authentication And Sessions

```http
GET  /api/csrf-token
GET  /api/auth/me
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

Registration stores a hashed password in MySQL and starts a Flask session. Login accepts either username or email. Logout clears the current session.

Example login body:

```json
{
  "identifier": "grishav@example.com",
  "password": "otakuhub123"
}
```

The demo admin account is `grishav@example.com` / `otakuhub123`.

## Users And Profile

```http
GET /api/users
GET /api/users/<user_id>
GET /api/profile
```

User records include:

- display name
- username
- bio
- avatar URL
- platform role

## Watch Rooms

```http
GET /api/rooms
POST /api/rooms
PUT /api/rooms/<room_id>
DELETE /api/rooms/<room_id>
```

Watch room records include:

- room name
- anime title
- episode number
- capacity
- viewer count
- status
- poster image URL
- anime-themed reactions

## Anime Lists

```http
GET /api/anime
POST /api/anime
PUT /api/anime/<anime_id>
DELETE /api/anime/<anime_id>
```

Anime records include:

- title
- total episodes
- watched episodes
- rating
- watching status
- favorite flag
- genre
- studio
- poster image URL

## Comments

```http
GET /api/comments
POST /api/comments
PUT /api/comments/<comment_id>
DELETE /api/comments/<comment_id>
```

Comment records include:

- author
- target anime or room
- message
- reaction label
- created timestamp

## Schedules

```http
GET /api/schedules
POST /api/schedules
PUT /api/schedules/<schedule_id>
DELETE /api/schedules/<schedule_id>
```

Schedule records include:

- event title
- date
- time
- event type

## News

```http
GET /api/news
```

Returns static anime news items used by the dashboard news panel.

## Images And Anime Search

```http
POST /api/uploads
GET  /api/jikan/search?q=naruto
```

Uploads accept JPG, PNG, GIF, and WebP files up to 8 MB. Jikan search fetches safe anime metadata and caches results briefly to reduce external API calls.

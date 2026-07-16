# OtakuHub Project Proposal

## Application idea and scope

OtakuHub is an anime watch-party planner. Registered members can maintain a profile, browse a shared anime catalogue, join the community experience, and use Jikan search to help discover anime. Administrators manage the shared catalogue, schedules, watch rooms, and platform dashboard.

The project is intentionally scoped as a simple Flask web application rather than a streaming service. It does not host or distribute anime video files.

## Requirements traceability

| Coursework requirement | OtakuHub implementation |
| --- | --- |
| Creative web application with users and sessions | Anime watch-party planning, registration, login, logout, profile, role-aware navigation, and Flask sessions. |
| Template-based frontend | Flask renders `templates/index.html` with Jinja2; styling and interactions are in `static/styles.css` and `static/app.js`. |
| Flask backend/API | `app.py` exposes REST-style `/api` endpoints; `auth.py` provides an authentication blueprint. |
| Persistent database | MySQL schema and seed files are in `database/`; connection helpers are in `db.py`. |
| Security architecture | Password hashes, CSRF protection, HTTP-only SameSite session cookies, validation, role checks, security headers, and parameterized SQL. |
| Version control | Repository is initialized with Git; `.env`, virtual environments, caches, and bytecode are ignored. |

## Main user journeys

1. A visitor registers with a display name, unique username, email address, and an eight-character minimum password.
2. The server hashes the password, stores the account in MySQL, and starts a protected Flask session.
3. The signed-in member sees their own display name, username, bio, avatar, and role on the profile page.
4. An administrator can open the Admin dashboard and persist shared catalogue changes.
5. A member signs out, clearing their server-signed session data.

## Testing evidence

Run `pytest` from the project directory. The automated suite covers registration, password hashing, login/logout, session profile ownership, CSRF checks, role enforcement, Jikan fallback behaviour, and database-schema expectations.

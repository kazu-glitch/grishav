# Security Design

## Security controls

| Risk | Control |
| --- | --- |
| Password disclosure | Passwords are stored with Werkzeug's `generate_password_hash`; comparison uses `check_password_hash`. |
| Session theft | Flask sessions use a secret key and HTTP-only, SameSite cookies. The secret is read from the ignored `.env` file. |
| Cross-site request forgery | Every state-changing API request requires a session-bound CSRF token, except the authentication routes needed to establish/end a session. |
| Unauthorized shared changes | The backend checks the `admin` role before replacing shared MySQL state or viewing the user directory. The UI also hides the admin controls from non-admin users. |
| SQL injection | All database values are passed as parameters to MySQL Connector queries. |
| Invalid input | Registration validates display name, username, email format, and eight-character minimum password length. Uploads restrict extension and file size. |
| Information disclosure | Database errors are logged server-side but return a generic client response. Security headers prevent framing, MIME sniffing, and unnecessary browser permissions. |

## Deployment notes

- Set `FLASK_DEBUG=0` outside development.
- Generate a long, unique `SECRET_KEY` for each deployment.
- Use a dedicated least-privilege MySQL account rather than a MySQL administrator account in production.
- Serve the site with HTTPS and set `SESSION_COOKIE_SECURE=1`.
- Keep `.env` private and never commit passwords or API keys.

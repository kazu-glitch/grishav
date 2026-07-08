# Testing Notes

OtakuHub includes automated tests for the most important user and session management flows.

## Automated Coverage

Current tests cover:

- user registration
- password hashing
- session restoration through `/api/auth/me`
- failed login handling
- login and logout
- CSRF rejection for missing tokens
- login-required rejection for protected API writes

Run the tests from the Flask project folder:

```powershell
cd otakuhub_flask
pytest
```

If `pytest` is unavailable, install dependencies first:

```powershell
pip install -r requirements.txt
```

## Manual Test Checklist

- Start MySQL and run `python init_db.py`.
- Start Flask with `flask run`.
- Open `http://127.0.0.1:5000`.
- Login with `grishav@example.com` and `otakuhub123`.
- Add a watch room and confirm it remains after refresh.
- Add an anime manually and with Jikan search.
- Upload a valid image and confirm the preview updates.
- Logout and confirm protected writes require login.
- Try registering a duplicate username or email and confirm the app rejects it.

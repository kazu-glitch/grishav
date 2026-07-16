"""Add the user login-activity column without recreating the database."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db import get_connection


def main():
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'users'
              AND column_name = 'last_login_at'
            """
        )
        exists = cursor.fetchone()[0]
        if not exists:
            cursor.execute(
                "ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL"
            )
            connection.commit()
        cursor.close()
    print("User activity column ready.")


if __name__ == "__main__":
    main()

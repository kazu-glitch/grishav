import os
from contextlib import contextmanager

import mysql.connector
from dotenv import load_dotenv

load_dotenv()


def db_config(include_database=True):
    config = {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
    }
    if include_database:
        config["database"] = os.getenv("MYSQL_DATABASE", "otakuhub")
    return config


@contextmanager
def get_connection(include_database=True):
    connection = mysql.connector.connect(**db_config(include_database=include_database))
    try:
        yield connection
    except Exception:
        # Keep a failed write from leaking into a later operation when callers
        # reuse a connection implementation with an open transaction.
        connection.rollback()
        raise
    finally:
        connection.close()


def fetch_all(query, params=None):
    with get_connection() as connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params or ())
        rows = cursor.fetchall()
        cursor.close()
        return rows


def fetch_one(query, params=None):
    with get_connection() as connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params or ())
        row = cursor.fetchone()
        cursor.close()
        return row


def execute(query, params=None):
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, params or ())
        connection.commit()
        cursor.close()


def execute_many(query, rows):
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.executemany(query, rows)
        connection.commit()
        cursor.close()

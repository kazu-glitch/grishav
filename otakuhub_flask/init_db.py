from pathlib import Path

from db import get_connection

BASE_DIR = Path(__file__).resolve().parent


def run_sql_file(cursor, path):
    sql = path.read_text(encoding="utf-8")
    statements = [statement.strip() for statement in sql.split(";") if statement.strip()]
    for statement in statements:
        cursor.execute(statement)


def main():
    with get_connection(include_database=False) as connection:
        cursor = connection.cursor()
        run_sql_file(cursor, BASE_DIR / "database" / "schema.sql")
        run_sql_file(cursor, BASE_DIR / "database" / "seed.sql")
        connection.commit()
        cursor.close()
    print("OtakuHub database initialized.")


if __name__ == "__main__":
    main()

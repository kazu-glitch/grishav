from pathlib import Path


SCHEMA_PATH = Path(__file__).resolve().parents[1] / "database" / "schema.sql"


def test_schema_defines_all_api_tables_and_query_indexes():
    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    for table in (
        "users",
        "watch_rooms",
        "anime_lists",
        "anime_videos",
        "comments",
        "schedules",
        "notifications",
    ):
        assert f"CREATE TABLE {table}" in schema

    for index in (
        "idx_watch_rooms_status_created",
        "idx_anime_lists_status_favorite",
        "idx_anime_videos_title_created",
        "idx_comments_target_created",
        "idx_schedules_date_time",
        "idx_notifications_created",
    ):
        assert f"CREATE INDEX {index}" in schema


def test_seed_data_includes_anime_video_for_the_video_api():
    seed_path = SCHEMA_PATH.with_name("seed.sql")
    seed = seed_path.read_text(encoding="utf-8")

    assert "INSERT INTO anime_videos" in seed
    assert "https://" in seed

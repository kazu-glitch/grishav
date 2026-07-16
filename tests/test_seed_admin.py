from pathlib import Path

def test_seed_does_not_create_a_default_website_account():
    seed = (Path(__file__).resolve().parents[1] / "database" / "seed.sql").read_text(encoding="utf-8")

    assert "INSERT INTO users" not in seed
    assert "admin@otakuhub.local" not in seed

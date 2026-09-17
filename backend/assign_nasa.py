import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


connection = sqlite3.connect(DB_PATH)

connection.execute("""
    UPDATE episodes
    SET podcast_id = 1
    WHERE podcast_id IS NULL
""")

connection.commit()

updated = connection.execute("""
    SELECT COUNT(*)
    FROM episodes
    WHERE podcast_id = 1
""").fetchone()[0]

print(f"NASA episodes connected: {updated}")

connection.close()
import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


connection = sqlite3.connect(DB_PATH)

connection.execute("""
    ALTER TABLE episodes
    ADD COLUMN podcast_id INTEGER
""")

connection.commit()

print("podcast_id column added to episodes.")

connection.close()
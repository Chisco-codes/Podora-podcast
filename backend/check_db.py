import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"

connection = sqlite3.connect(DB_PATH)

print("\nDATABASE")
print(DB_PATH)

print("\nEPISODES COLUMNS")

columns = connection.execute("""
    PRAGMA table_info(episodes)
""").fetchall()

for column in columns:
    print(column)

print("\nPODCASTS")

podcasts = connection.execute("""
    SELECT id, title
    FROM podcasts
""").fetchall()

for podcast in podcasts:
    print(podcast)

print("\nNASA EPISODES")

episode_count = connection.execute("""
    SELECT COUNT(*)
    FROM episodes
    WHERE podcast_id = 1
""").fetchone()[0]

print(episode_count)

connection.close()
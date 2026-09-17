import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"

connection = sqlite3.connect(DB_PATH)

# Create the new episodes table with an ID
connection.execute("""
    CREATE TABLE episodes_new (
        id INTEGER PRIMARY KEY,
        title TEXT,
        description TEXT,
        published TIMESTAMP,
        duration INTEGER,
        episode_number INTEGER,
        season_number TEXT,
        episode_url TEXT,
        media_url TEXT,
        media_type TEXT,
        duration_minutes REAL,
        published_year INTEGER,
        published_month INTEGER,
        published_weekday TEXT,
        podcast_id INTEGER
    )
""")

# Copy the existing episodes into the new table
connection.execute("""
    INSERT INTO episodes_new (
        id,
        title,
        description,
        published,
        duration,
        episode_number,
        season_number,
        episode_url,
        media_url,
        media_type,
        duration_minutes,
        published_year,
        published_month,
        published_weekday,
        podcast_id
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY rowid),
        title,
        description,
        published,
        duration,
        episode_number,
        season_number,
        episode_url,
        media_url,
        media_type,
        duration_minutes,
        published_year,
        published_month,
        published_weekday,
        podcast_id
    FROM episodes
""")

# Remove the old table
connection.execute("DROP TABLE episodes")

# Rename the new table
connection.execute("""
    ALTER TABLE episodes_new
    RENAME TO episodes
""")

connection.commit()

print("Episodes table migrated successfully.")

# Verify the migration
columns = connection.execute("""
    PRAGMA table_info(episodes)
""").fetchall()

print("\nEPISODES COLUMNS")

for column in columns:
    print(column)

count = connection.execute("""
    SELECT COUNT(*)
    FROM episodes
""").fetchone()[0]

print(f"\nTOTAL EPISODES: {count}")

id_range = connection.execute("""
    SELECT MIN(id), MAX(id)
    FROM episodes
""").fetchone()

print(f"ID RANGE: {id_range[0]} - {id_range[1]}")

connection.close()
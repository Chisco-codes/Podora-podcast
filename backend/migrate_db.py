import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


connection = sqlite3.connect(DB_PATH)

connection.execute("""
    CREATE TABLE IF NOT EXISTS podcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        rss_url TEXT,
        website_url TEXT
    )
""")

connection.commit()
connection.close()

print("Podcasts table created successfully.")
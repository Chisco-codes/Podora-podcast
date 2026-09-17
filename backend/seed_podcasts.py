import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


connection = sqlite3.connect(DB_PATH)

connection.execute("""
    INSERT INTO podcasts (
        title,
        description,
        rss_url,
        website_url
    )
    VALUES (?, ?, ?, ?)
""", (
    "Houston We Have a Podcast",
    "NASA's podcast featuring conversations about space, science and exploration.",
    "https://www.nasa.gov/feeds/podcasts/houston-we-have-a-podcast",
    "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/"
))

connection.commit()
connection.close()

print("NASA podcast added successfully.")
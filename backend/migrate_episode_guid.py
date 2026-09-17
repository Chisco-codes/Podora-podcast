import sqlite3

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


connection = sqlite3.connect(DB_PATH)
cursor = connection.cursor()


cursor.execute(
    """
    ALTER TABLE episodes
    ADD COLUMN guid TEXT
    """
)


connection.commit()
connection.close()


print("Added guid column to episodes.")
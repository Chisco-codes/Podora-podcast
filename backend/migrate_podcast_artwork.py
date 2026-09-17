import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


connection = sqlite3.connect(DB_PATH)
cursor = connection.cursor()


columns = cursor.execute(
    "PRAGMA table_info(podcasts)"
).fetchall()

column_names = [column[1] for column in columns]


if "artwork_url" not in column_names:
    cursor.execute(
        """
        ALTER TABLE podcasts
        ADD COLUMN artwork_url TEXT
        """
    )

    print("artwork_url column added successfully.")

else:
    print("artwork_url column already exists.")


connection.commit()
connection.close()
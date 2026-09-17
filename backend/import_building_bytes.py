import sqlite3
import feedparser

from pathlib import Path
from html import unescape
from bs4 import BeautifulSoup


# -------------------------
# RSS FEED
# -------------------------

RSS_URL = "https://anchor.fm/s/e5887170/podcast/rss"


# -------------------------
# DATABASE
# -------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"

connection = sqlite3.connect(DB_PATH)
cursor = connection.cursor()


# -------------------------
# HELPER FUNCTIONS
# -------------------------

def clean_description(description):
    if not description:
        return None

    description = unescape(description)

    soup = BeautifulSoup(description, "html.parser")

    return soup.get_text(" ", strip=True)


def convert_duration(duration):
    if not duration:
        return None

    try:
        parts = duration.split(":")

        if len(parts) == 3:
            hours, minutes, seconds = map(int, parts)
            return hours * 3600 + minutes * 60 + seconds

        if len(parts) == 2:
            minutes, seconds = map(int, parts)
            return minutes * 60 + seconds

        if len(parts) == 1:
            return int(parts[0])

    except (ValueError, AttributeError):
        return None

    return None


# -------------------------
# READ RSS FEED
# -------------------------

feed = feedparser.parse(RSS_URL)

print("Podcast:", feed.feed.get("title"))
print("Episodes found:", len(feed.entries))


# -------------------------
# REMOVE OLD BUILDING BYTES
# -------------------------

existing_podcast = cursor.execute(
    "SELECT id FROM podcasts WHERE rss_url = ?",
    (RSS_URL,)
).fetchone()

if existing_podcast:
    existing_id = existing_podcast[0]

    cursor.execute(
        "DELETE FROM episodes WHERE podcast_id = ?",
        (existing_id,)
    )

    cursor.execute(
        "DELETE FROM podcasts WHERE id = ?",
        (existing_id,)
    )

    print(f"Removed previous Building Bytes data (podcast ID: {existing_id}).")

# -------------------------
# INSERT PODCAST
# -------------------------

cursor.execute(
    """
    INSERT INTO podcasts (
        title,
        description,
        rss_url,
        website_url
    )
    VALUES (?, ?, ?, ?)
    """,
    (
        feed.feed.get("title"),
        clean_description(feed.feed.get("description")),
        RSS_URL,
        feed.feed.get("link"),
    )
)

podcast_id = cursor.lastrowid

print("Created podcast ID:", podcast_id)


# -------------------------
# INSERT EPISODES
# -------------------------

for episode in feed.entries:

    # Media
    enclosures = episode.get("enclosures", [])

    if enclosures:
        media_url = enclosures[0].get("href")
        media_type = enclosures[0].get("type")
    else:
        media_url = None
        media_type = None


    # Duration
    duration = convert_duration(
        episode.get("itunes_duration")
    )

    if duration is not None:
        duration_minutes = duration / 60
    else:
        duration_minutes = None


    # Published
    published = episode.get("published")


    # Insert
    cursor.execute(
        """
        INSERT INTO episodes (
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            episode.get("title"),

            clean_description(
                episode.get("summary")
            ),

            published,

            duration,

            episode.get("itunes_episode"),

            episode.get("itunes_season"),

            episode.get("link"),

            media_url,

            media_type,

            duration_minutes,

            None,

            None,

            None,

            podcast_id,
        )
    )


# -------------------------
# SAVE
# -------------------------

connection.commit()

connection.close()


print("Building Bytes import complete!")
import sqlite3
import feedparser

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


connection = sqlite3.connect(DB_PATH)
cursor = connection.cursor()


# --------------------------------
# GET ALL PODCASTS
# --------------------------------

podcasts = cursor.execute(
    """
    SELECT id, title, rss_url
    FROM podcasts
    """
).fetchall()


for podcast_id, podcast_title, rss_url in podcasts:

    print()
    print("=" * 50)
    print("Podcast:", podcast_title)
    print("RSS:", rss_url)

    # --------------------------------
    # READ RSS FEED
    # --------------------------------

    feed = feedparser.parse(rss_url)

    print("RSS episodes:", len(feed.entries))

    # --------------------------------
    # CREATE EPISODE LOOKUP
    # --------------------------------

    rss_episodes = {}

    for episode in feed.entries:

        episode_url = episode.get("link")
        guid = episode.get("id")

        if episode_url and guid:
            rss_episodes[episode_url] = guid

    # --------------------------------
    # GET DATABASE EPISODES
    # --------------------------------

    database_episodes = cursor.execute(
        """
        SELECT id, episode_url
        FROM episodes
        WHERE podcast_id = ?
        AND guid IS NULL
        """,
        (podcast_id,)
    ).fetchall()

    updated = 0
    missing = 0

    # --------------------------------
    # MATCH DATABASE → RSS
    # --------------------------------

    for episode_id, episode_url in database_episodes:

        if episode_url in rss_episodes:

            guid = rss_episodes[episode_url]

            cursor.execute(
                """
                UPDATE episodes
                SET guid = ?
                WHERE id = ?
                """,
                (guid, episode_id)
            )

            updated += 1

        else:
            missing += 1

    print("GUIDs updated:", updated)
    print("Could not match:", missing)


connection.commit()
connection.close()


print()
print("GUID backfill complete!")
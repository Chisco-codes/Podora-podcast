import sqlite3
import tempfile
from pathlib import Path

import rss_importer


# --------------------------------
# CREATE TEMPORARY DATABASE
# --------------------------------

original_db = rss_importer.DB_PATH

with tempfile.TemporaryDirectory() as temp_dir:

    temp_dir = Path(temp_dir)

    temp_db = temp_dir / "test_podcast.db"
    test_rss = temp_dir / "test_feed.xml"

    # Copy the real database
    temp_db.write_bytes(original_db.read_bytes())

    # Make importer use temporary database
    rss_importer.DB_PATH = temp_db

    # --------------------------------
    # GET EXISTING LOOSE TALK EPISODES
    # --------------------------------

    connection = sqlite3.connect(temp_db)

    rows = connection.execute(
        """
        SELECT
            guid,
            title,
            description,
            published,
            episode_url
        FROM episodes
        WHERE podcast_id = 5
        """
    ).fetchall()

    # --------------------------------
    # POINT PODCAST ID 5 TO TEST RSS
    # --------------------------------

    connection.execute(
        """
        UPDATE podcasts
        SET rss_url = ?
        WHERE id = 5
        """,
        (test_rss.as_uri(),)
    )

    connection.commit()
    connection.close()

    # --------------------------------
    # CREATE TEST RSS
    # --------------------------------

    rss_entries = ""

    for row in rows:

        guid, title, description, published, episode_url = row

        rss_entries += f"""
        <item>
            <title>{title}</title>
            <guid>{guid}</guid>
            <description>{description or ""}</description>
            <pubDate>{published or ""}</pubDate>
            <link>{episode_url or ""}</link>
        </item>
        """

    # Add ONE genuinely new episode
    rss_entries += """
        <item>
            <title>TEST NEW EPISODE</title>
            <guid>TEST-NEW-EPISODE-999</guid>
            <description>This is a fake new episode for testing.</description>
            <pubDate>Mon, 14 Sep 2026 12:00:00 GMT</pubDate>
            <link>https://example.com/test-new-episode</link>
        </item>
    """

    rss_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>Loose Talk</title>
        <description>Test RSS feed</description>
        <link>https://example.com/loose-talk</link>
        {rss_entries}
    </channel>
</rss>
"""

    test_rss.write_text(rss_content, encoding="utf-8")

    print("Test RSS created.")
    print("Existing RSS episodes:", len(rows))
    print("New test episode: 1")
    print("Expected RSS episodes:", len(rows) + 1)

    # --------------------------------
    # CHECK BEFORE IMPORT
    # --------------------------------

    connection = sqlite3.connect(temp_db)

    before = connection.execute(
        """
        SELECT COUNT(*)
        FROM episodes
        WHERE podcast_id = 5
        """
    ).fetchone()[0]

    connection.close()

    print("Episodes before import:", before)

    # --------------------------------
    # RUN IMPORTER
    # --------------------------------

    rss_importer.import_podcast(
        test_rss.as_uri()
    )

    # --------------------------------
    # CHECK AFTER IMPORT
    # --------------------------------

    connection = sqlite3.connect(temp_db)

    after = connection.execute(
        """
        SELECT COUNT(*)
        FROM episodes
        WHERE podcast_id = 5
        """
    ).fetchone()[0]

    new_episode = connection.execute(
        """
        SELECT title, guid
        FROM episodes
        WHERE podcast_id = 5
        AND guid = ?
        """,
        ("TEST-NEW-EPISODE-999",)
    ).fetchone()

    connection.close()

    print("Episodes after import:", after)
    print("New episode found:", new_episode)
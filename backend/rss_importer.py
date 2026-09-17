import sqlite3
import feedparser

from datetime import timezone
from pathlib import Path
from html import unescape
from email.utils import parsedate_to_datetime

from bs4 import BeautifulSoup


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


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


def import_podcast(rss_url):

    print("Reading RSS feed...")
    print(rss_url)

    feed = feedparser.parse(rss_url)

    print("Podcast:", feed.feed.get("title"))
    print("Episodes found:", len(feed.entries))

    print("\n--- RSS IMAGE DATA ---")
    print("feed.image:", feed.feed.get("image"))
    print("feed.itunes_image:", feed.feed.get("itunes_image"))
    print("feed.media_thumbnail:", feed.feed.get("media_thumbnail"))
    print("----------------------\n")

    new_episodes = 0
    existing_episodes = 0

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    # --------------------------------
    # GET PODCAST ARTWORK
    # --------------------------------

    artwork_url = None

    itunes_image = feed.feed.get("image", {})

    if isinstance(itunes_image, dict):
        artwork_url = itunes_image.get("href")

    # Fallback for feeds that expose artwork differently
    if not artwork_url:
        artwork_url = feed.feed.get("itunes_image")

    print("Artwork:", artwork_url)

    # --------------------------------
    # CHECK IF PODCAST ALREADY EXISTS
    # --------------------------------

    existing_podcast = cursor.execute(
        """
        SELECT id
        FROM podcasts
        WHERE rss_url = ?
        """,
        (rss_url,)
    ).fetchone()

    if existing_podcast:

        podcast_id = existing_podcast[0]

        print(
            f"Podcast already exists with ID {podcast_id}."
        )

        # Update artwork if available
        if artwork_url:
            cursor.execute(
                """
                UPDATE podcasts
                SET artwork_url = ?
                WHERE id = ?
                """,
                (artwork_url, podcast_id)
            )

            print("Podcast artwork updated.")

    else:

        # --------------------------------
        # CREATE PODCAST
        # --------------------------------

        cursor.execute(
            """
            INSERT INTO podcasts (
                title,
                description,
                rss_url,
                website_url,
                artwork_url
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                feed.feed.get("title"),
                clean_description(
                    feed.feed.get("description")
                ),
                rss_url,
                feed.feed.get("link"),
                artwork_url,
            )
        )

        podcast_id = cursor.lastrowid

        print("Created podcast ID:", podcast_id)

    # --------------------------------
    # CREATE EPISODES
    # --------------------------------

    for episode in feed.entries:

        # --------------------------------
        # GET EPISODE GUID
        # --------------------------------

        guid = episode.get("id")

        if not guid:

            print(
                "Skipping episode without GUID:",
                episode.get("title")
            )

            continue

        # --------------------------------
        # CHECK IF EPISODE ALREADY EXISTS
        # --------------------------------

        existing_episode = cursor.execute(
            """
            SELECT id
            FROM episodes
            WHERE podcast_id = ?
            AND guid = ?
            """,
            (podcast_id, guid)
        ).fetchone()

        if existing_episode:

            existing_episodes += 1

            continue

        # --------------------------------
        # GET MEDIA
        # --------------------------------

        enclosures = episode.get("enclosures", [])

        if enclosures:

            media_url = enclosures[0].get("href")
            media_type = enclosures[0].get("type")

        else:

            media_url = None
            media_type = None

        # --------------------------------
        # GET DURATION
        # --------------------------------

        duration = convert_duration(
            episode.get("itunes_duration")
        )

        if duration is not None:

            duration_minutes = duration / 60

        else:

            duration_minutes = None

        # --------------------------------
        # GET PUBLISHED DATE
        # --------------------------------

        published = episode.get("published")

        published_year = None
        published_month = None
        published_weekday = None

        if published:

            try:

                parsed_date = parsedate_to_datetime(
                    published
                )

                if parsed_date.tzinfo is None:

                    parsed_date = parsed_date.replace(
                        tzinfo=timezone.utc
                    )

                # Store everything in UTC
                parsed_date = parsed_date.astimezone(
                    timezone.utc
                )

                published = parsed_date.isoformat()

                published_year = parsed_date.year
                published_month = parsed_date.month
                published_weekday = parsed_date.strftime(
                    "%A"
                )

            except (
                TypeError,
                ValueError,
                OverflowError
            ):

                pass

        # --------------------------------
        # INSERT EPISODE
        # --------------------------------

        cursor.execute(
            """
            INSERT INTO episodes (
                guid,
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                guid,
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
                published_year,
                published_month,
                published_weekday,
                podcast_id,
            )
        )

        new_episodes += 1

    # --------------------------------
    # IMPORT SUMMARY
    # --------------------------------

    print("Existing episodes:", existing_episodes)
    print("New episodes:", new_episodes)

    connection.commit()
    connection.close()

    print("Import complete!")

    return podcast_id

if __name__ == "__main__":
    import_podcast(
        "https://feeds.acast.com/public/shows/with-an-s"
    )
import sqlite3
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


# Database path
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


def normalize_published(value):
    if not value:
        return None

    # Try RSS/RFC 2822 date format
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError, OverflowError):

        # Try ISO format
        try:
            parsed = datetime.fromisoformat(
                value.replace("Z", "+00:00")
            )
        except (TypeError, ValueError):
            return None

    # Make sure timezone exists
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    # Convert everything to UTC
    parsed = parsed.astimezone(timezone.utc)

    return (
        parsed.isoformat(),
        parsed.year,
        parsed.month,
        parsed.strftime("%A")
    )


connection = sqlite3.connect(DB_PATH)

rows = connection.execute(
    """
    SELECT id, published
    FROM episodes
    """
).fetchall()

updated = 0
failed = 0

for episode_id, published in rows:

    result = normalize_published(published)

    if result is None:
        failed += 1
        continue

    published_iso, year, month, weekday = result

    connection.execute(
        """
        UPDATE episodes
        SET
            published = ?,
            published_year = ?,
            published_month = ?,
            published_weekday = ?
        WHERE id = ?
        """,
        (
            published_iso,
            year,
            month,
            weekday,
            episode_id
        )
    )

    updated += 1


connection.commit()
connection.close()

print(f"Episodes processed: {len(rows)}")
print(f"Episodes updated: {updated}")
print(f"Episodes failed: {failed}")
print("Published date backfill complete!")
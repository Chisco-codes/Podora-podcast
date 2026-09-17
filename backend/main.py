# Podcast Backend

from pathlib import Path
import os
import sqlite3
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv(
            "FRONTEND_URL",
            "http://localhost:5173"
        )
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Episode Model
class Episode(BaseModel):
    id: int
    title: str
    description: str | None
    published: str | None
    duration: int | None
    episode_number: int | None
    season_number: str | None
    episode_url: str | None
    media_url: str
    media_type: str
    duration_minutes: float | None
    published_year: int | None
    published_month: int | None
    published_weekday: str | None


# Podcast Model
class Podcast(BaseModel):
    id: int
    title: str
    description: str | None
    rss_url: str | None
    website_url: str | None
    artwork_url: str | None


# Small beta analytics event model.
# Only product-usage information needed for early testing is collected.
class AnalyticsEvent(BaseModel):
    session_id: str
    event_type: str
    episode_id: int | None = None
    podcast_id: int | None = None
    source: str | None = None
    value: float | None = None


# Database
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "podcast.db"


def get_db_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_analytics_table():
    connection = get_db_connection()

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            episode_id INTEGER,
            podcast_id INTEGER,
            source TEXT,
            value REAL,
            created_at TEXT NOT NULL
        )
        """
    )

    connection.commit()
    connection.close()


ensure_analytics_table()


# Episodes Endpoint
@app.get("/episodes")
def get_episodes(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    connection = get_db_connection()

    total = connection.execute(
        "SELECT COUNT(*) FROM episodes"
    ).fetchone()[0]

    rows = connection.execute(
    """
    SELECT
        episodes.*,
        podcasts.title AS podcast_title
    FROM episodes
    JOIN podcasts
        ON episodes.podcast_id = podcasts.id
    ORDER BY published DESC
    LIMIT ?
    OFFSET ?
    """,
    (limit, offset)
).fetchall()

    connection.close()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "results": [dict(row) for row in rows]
    }


# Search Endpoint
@app.get("/episodes/search")
def search_episodes(
    q: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    connection = get_db_connection()

    search_term = f"%{q}%"

    total = connection.execute(
        """
        SELECT COUNT(*)
        FROM episodes
        JOIN podcasts
            ON episodes.podcast_id = podcasts.id
        WHERE
            episodes.title LIKE ?
            OR episodes.description LIKE ?
            OR podcasts.title LIKE ?
            OR podcasts.description LIKE ?
        """,
        (search_term, search_term, search_term, search_term)
    ).fetchone()[0]

    rows = connection.execute(
        """
        SELECT
            episodes.*,
            podcasts.title AS podcast_title
        FROM episodes
        JOIN podcasts
            ON episodes.podcast_id = podcasts.id
        WHERE
            episodes.title LIKE ?
            OR episodes.description LIKE ?
            OR podcasts.title LIKE ?
            OR podcasts.description LIKE ?
        ORDER BY episodes.published DESC
        LIMIT ?
        OFFSET ?
        """,
        (
            search_term,
            search_term,
            search_term,
            search_term,
            limit,
            offset
        )
    ).fetchall()

    connection.close()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "query": q,
        "results": [dict(row) for row in rows]
    }


# Podcasts Endpoint
@app.get("/podcasts", response_model=list[Podcast])
def get_podcasts():
    connection = get_db_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM podcasts
        ORDER BY id
        """
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


# Podcast Episodes Endpoint
@app.get("/podcasts/{podcast_id}/episodes")
def get_podcast_episodes(
    podcast_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    connection = get_db_connection()

    podcast = connection.execute(
        """
        SELECT *
        FROM podcasts
        WHERE id = ?
        """,
        (podcast_id,)
    ).fetchone()

    if podcast is None:
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Podcast not found"
        )

    total = connection.execute(
        """
        SELECT COUNT(*)
        FROM episodes
        WHERE podcast_id = ?
        """,
        (podcast_id,)
    ).fetchone()[0]

    rows = connection.execute(
        """
        SELECT *
        FROM episodes
        WHERE podcast_id = ?
        ORDER BY published DESC
        LIMIT ?
        OFFSET ?
        """,
        (podcast_id, limit, offset)
    ).fetchall()

    connection.close()

    return {
        "podcast": dict(podcast),
        "total": total,
        "limit": limit,
        "offset": offset,
        "results": [dict(row) for row in rows]
    }


# Get One Episode
@app.get("/episodes/{episode_id}", response_model=Episode)
def get_episode(episode_id: int):
    connection = get_db_connection()

    row = connection.execute(
        """
        SELECT *
        FROM episodes
        WHERE id = ?
        """,
        (episode_id,)
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Episode not found"
        )

    return dict(row)


# Debug Endpoint
@app.get("/debug/episode/{episode_id}")
def debug_episode(episode_id: int):
    connection = get_db_connection()

    row = connection.execute(
        """
        SELECT *
        FROM episodes
        WHERE id = ?
        """,
        (episode_id,)
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Episode not found"
        )

    data = dict(row)

    return {
        "data": data,
        "types": {
            key: type(value).__name__
            for key, value in data.items()
        }
    }


# Small beta analytics endpoint
@app.post("/analytics/events")
def record_analytics_event(event: AnalyticsEvent):
    connection = get_db_connection()

    connection.execute(
        """
        INSERT INTO analytics_events (
            session_id,
            event_type,
            episode_id,
            podcast_id,
            source,
            value,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event.session_id,
            event.event_type,
            event.episode_id,
            event.podcast_id,
            event.source,
            event.value,
            datetime.now(timezone.utc).isoformat(),
        )
    )

    connection.commit()
    connection.close()

    return {"status": "ok"}


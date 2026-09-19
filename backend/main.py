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

DB_PATH = Path(
    os.getenv(
        "DB_PATH",
        str(BASE_DIR / "podcast.db")
    )
)


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

    query = q.strip()

    if not query:
        connection.close()

        return {
            "total": 0,
            "limit": limit,
            "offset": offset,
            "query": q,
            "results": []
        }

    search_terms = [
        term.strip()
        for term in query.split()
        if term.strip()
    ]

    if not search_terms:
        connection.close()

        return {
            "total": 0,
            "limit": limit,
            "offset": offset,
            "query": q,
            "results": []
        }

    # Stage 1:
    # Try a strict multi-word search first.
    exact_query = " AND ".join(
        f'"{term.replace(chr(34), "")}"'
        for term in search_terms
    )

    exact_total = connection.execute(
        """
        SELECT COUNT(*)
        FROM podcast_search
        WHERE podcast_search MATCH ?
        """,
        (exact_query,)
    ).fetchone()[0]

    if exact_total > 0:
        rows = connection.execute(
            """
            SELECT
                episodes.*,
                podcasts.title AS podcast_title,
                podcasts.artwork_url AS podcast_image_url
            FROM podcast_search
            JOIN episodes
                ON episodes.id = podcast_search.rowid
            JOIN podcasts
                ON episodes.podcast_id = podcasts.id
            WHERE podcast_search MATCH ?
            ORDER BY rank
            LIMIT ?
            OFFSET ?
            """,
            (
                exact_query,
                limit,
                offset
            )
        ).fetchall()

        connection.close()

        return {
            "total": exact_total,
            "limit": limit,
            "offset": offset,
            "query": q,
            "results": [dict(row) for row in rows]
        }

      # Stage 2:
    # Only broaden the search when every search term exists
    # somewhere in the indexed dataset.
    #
    # This prevents a query such as:
    #
    #     "ashanti region"
    #
    # from becoming a broad search for only "region" when
    # "ashanti" has no indexed matches.
    term_queries = []

    for term in search_terms:
        term_query = f'"{term.replace(chr(34), "")}"'

        term_total = connection.execute(
            """
            SELECT COUNT(*)
            FROM podcast_search
            WHERE podcast_search MATCH ?
            """,
            (term_query,)
        ).fetchone()[0]

        if term_total == 0:
            connection.close()

            return {
                "total": 0,
                "limit": limit,
                "offset": offset,
                "query": q,
                "results": []
            }

        term_queries.append(term_query)

    # All terms exist, so a broader OR search is now allowed.
    broad_query = " OR ".join(term_queries)

    broad_total = connection.execute(
        """
        SELECT COUNT(*)
        FROM podcast_search
        WHERE podcast_search MATCH ?
        """,
        (broad_query,)
    ).fetchone()[0]

    rows = connection.execute(
        """
        SELECT
            episodes.*,
            podcasts.title AS podcast_title,
            podcasts.artwork_url AS podcast_image_url
        FROM podcast_search
        JOIN episodes
            ON episodes.id = podcast_search.rowid
        JOIN podcasts
            ON episodes.podcast_id = podcasts.id
        WHERE podcast_search MATCH ?
        ORDER BY rank
        LIMIT ?
        OFFSET ?
        """,
        (
            broad_query,
            limit,
            offset
        )
    ).fetchall()

    connection.close()

    return {
        "total": broad_total,
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


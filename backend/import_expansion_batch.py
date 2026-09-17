"""Import the first measured content expansion batch into the podcast database.

Run this from the backend directory after confirming rss_importer.py is the
working version used by the project:

    python import_expansion_batch.py
"""

from rss_importer import import_podcast

FEEDS = [
    # Ghana
    (
        "Stay By Plan",
        "https://anchor.fm/s/5e60e18c/podcast/rss",
    ),
    (
        "Talk No Dey Cook Rice Podcast",
        "https://feeds.buzzsprout.com/2373502.rss",
    ),
    (
        "The Peswa Podcast",
        "https://feeds.buzzsprout.com/2423582.rss",
    ),
    # Nigeria / pan-African technology
    (
        "Africa Tech Radio",
        "https://feed.podbean.com/programmes/feed.xml",
    ),
    # Kenya / East Africa
    (
        "The Mwango Capital Podcast",
        "https://api.substack.com/feed/podcast/262782.rss",
    ),
]


if __name__ == "__main__":
    for name, rss_url in FEEDS:
        print("\n" + "=" * 72)
        print(f"IMPORTING: {name}")
        print(rss_url)
        print("=" * 72)

        try:
            import_podcast(rss_url)
            print(f"Finished: {name}")
        except Exception as exc:
            print(f"FAILED: {name}")
            print(f"Reason: {exc}")
            print("Continuing with the next feed...")

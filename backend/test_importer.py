from rss_importer import import_podcast


RSS_URL = "https://feeds.transistor.fm/loose-talk"


podcast_id = import_podcast(RSS_URL)

print("Podcast ID:", podcast_id)
import feedparser


RSS_URL = "https://feeds.transistor.fm/loose-talk"

feed = feedparser.parse(RSS_URL)

for episode in feed.entries[:5]:
    print("TITLE:", episode.get("title"))
    print("GUID:", episode.get("id"))
    print("LINK:", episode.get("link"))
    print("-" * 50)
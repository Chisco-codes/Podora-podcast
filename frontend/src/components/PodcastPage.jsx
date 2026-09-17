import EpisodeCard from "./EpisodeCard";

function PodcastPage({
  podcast,
  episodes,
  totalEpisodes,
  onBack,
  onPlay,
  onOpenEpisode,
}) {
  return (
    <section className="podcast-page">
      {/* Back navigation */}
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      {/* Podcast header */}
      <div className="podcast-page-header">
        {/* Podcast artwork */}
        <div className="podcast-page-artwork">
          {podcast.artwork_url ? (
            <img
              src={podcast.artwork_url}
              alt={`${podcast.title} artwork`}
            />
          ) : (
            <div className="podcast-page-artwork-placeholder">
              PODCAST
            </div>
          )}
        </div>

        {/* Podcast information */}
        <div className="podcast-page-info">
          <p className="podcast-page-label">
            PODCAST
          </p>

          <h1>{podcast.title}</h1>

          <p className="podcast-page-description">
            {podcast.description}
          </p>

          <p className="podcast-page-count">
            {totalEpisodes} episodes
          </p>

          <button className="follow-button">
            Follow
          </button>
        </div>
      </div>

      {/* Podcast episodes */}
      <div className="podcast-page-episodes">
        <div className="section-heading">
          <div>
            <h2>Episodes</h2>

            <p>
              Latest episodes from this podcast
            </p>
          </div>
        </div>

        {/* Flat episode rows */}
        <div className="episode-list">
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              onPlay={onPlay}
              onOpenEpisode={onOpenEpisode}
              podcastArtworkUrl={podcast.artwork_url}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PodcastPage;
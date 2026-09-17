import formatDuration from "../utils/formatDuration";

function formatDate(dateString) {
  if (!dateString) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function EpisodePage({
  episode,
  podcast,
  onBack,
  onPlay,
}) {
  if (!episode) return null;

  return (
    <section className="episode-page">
      <button className="back-button" onClick={onBack}>
        ← Back to podcast
      </button>

      <div className="episode-page-header">
        <p className="episode-page-label">
          {podcast?.title || "PODCAST"}
        </p>

        <h1>{episode.title}</h1>

        <div className="episode-page-meta">
          <span>
            {formatDate(episode.published)}
          </span>

          <span aria-hidden="true">
            ·
          </span>

          <span>
            {formatDuration(
              episode.duration_minutes
            )}
          </span>
        </div>

        <button
          className="episode-page-play"
          onClick={() => onPlay(episode)}
        >
          ▶ Play episode
        </button>
      </div>

      <div className="episode-page-content">
        <h2>About this episode</h2>

        <p>
          {episode.description ||
            "No description available."}
        </p>
      </div>

      {podcast && (
        <div className="episode-page-podcast">
          <p className="episode-page-label">
            PODCAST
          </p>

          <h2>{podcast.title}</h2>

          <p>
            {podcast.description}
          </p>
        </div>
      )}
    </section>
  );
}

export default EpisodePage;
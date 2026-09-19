import { useState } from "react";
import formatDuration from "../utils/formatDuration";

function formatDate(dateString) {
  if (!dateString) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function EpisodeCard({ episode, onPlay, onOpenEpisode, podcastArtworkUrl }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="episode-card">
      <div className="episode-artwork">
        {podcastArtworkUrl && !imageFailed ? (
          <img
  src={podcastArtworkUrl}
  alt=""
 onLoad={() => {
  setImageFailed(false);
}}
  onError={() => {
    console.log("IMAGE FAILED:", podcastArtworkUrl);
    setImageFailed(true);
  }}
/>
        ) : (
          <div className="episode-artwork-placeholder">PODCAST</div>
        )}
      </div>

      <div className="episode-content">
        <div className="episode-topline">
          {episode.podcast_title && (
            <span className="episode-podcast">{episode.podcast_title}</span>
          )}

          {episode.episode_number !== null &&
            episode.episode_number !== undefined && (
              <span className="episode-number">
                EP {episode.episode_number}
              </span>
            )}
        </div>

        <button
          className="episode-title-button"
          onClick={() => onOpenEpisode(episode)}
        >
          {episode.title}
        </button>

        {episode.description && (
          <p className="episode-description">{episode.description}</p>
        )}

        <div className="episode-meta">
          <span>{formatDate(episode.published)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDuration(episode.duration_minutes)}</span>
        </div>
      </div>

      <button className="play-button" onClick={() => onPlay(episode)}>
        <span aria-hidden="true">▶</span>
        <span>Play</span>
      </button>
    </article>
  );
}

export default EpisodeCard;

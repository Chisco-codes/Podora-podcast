import { useEffect, useState } from "react";

import EpisodeCard from "./EpisodeCard";

function PodcastPage({
  podcast,
  episodes,
  totalEpisodes,
  onBack,
  onPlay,
  onOpenEpisode,
  onLoadMore,
  isLoadingMore,
  episodeSearchQuery,
  onEpisodeSearch,
  onClearEpisodeSearch,
  isSearchingEpisodes,
}) {
  const [searchInput, setSearchInput] =
    useState(episodeSearchQuery || "");

  const isSearching = Boolean(
    episodeSearchQuery?.trim()
  );

  const hasMoreEpisodes =
    !isSearching &&
    episodes.length < totalEpisodes;

  useEffect(() => {
    setSearchInput(episodeSearchQuery || "");
  }, [episodeSearchQuery]);

  function handleSubmit(event) {
    event.preventDefault();

    onEpisodeSearch?.(searchInput);
  }

  function handleClearSearch() {
    setSearchInput("");
    onClearEpisodeSearch?.();
  }

  return (
    <section className="podcast-page">
      {/* Back navigation */}
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ← Back to discovery
      </button>

      {/* Podcast header */}
      <div className="podcast-page-header">
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
        </div>
      </div>

      {/* Podcast episodes */}
      <div className="podcast-page-episodes">
        <div className="section-heading">
          <div>
            <h2>Episodes</h2>

            <p>
              {isSearching
                ? `Search results for "${episodeSearchQuery}"`
                : "Latest episodes from this podcast"}
            </p>
          </div>
        </div>

        {/* Podcast episode search */}
        <form
          className="podcast-episode-tools"
          onSubmit={handleSubmit}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            placeholder="Search episodes in this podcast..."
            aria-label="Search episodes in this podcast"
          />

          {searchInput && (
            <button
              type="button"
              className="podcast-episode-clear"
              onClick={handleClearSearch}
            >
              Clear
            </button>
          )}

          <button
            type="submit"
            className="podcast-episode-search-button"
            disabled={isSearchingEpisodes}
          >
            {isSearchingEpisodes
              ? "Searching..."
              : "Search"}
          </button>
        </form>

        {/* Search result count */}
        {isSearching && (
          <div className="podcast-search-summary">
            {episodes.length}{" "}
            {episodes.length === 1
              ? "episode"
              : "episodes"}{" "}
            found
          </div>
        )}

        {/* Episode list */}
        {episodes.length === 0 ? (
          <div className="episodes-message">
            {isSearching
              ? "No episodes found."
              : "No episodes available."}
          </div>
        ) : (
          <div className="episode-list">
            {episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                onPlay={onPlay}
                onOpenEpisode={onOpenEpisode}
                podcastArtworkUrl={
                  podcast.artwork_url
                }
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMoreEpisodes && (
          <div className="podcast-load-more">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore
                ? "Loading..."
                : "Load more episodes"}
            </button>
          </div>
        )}

        {/* Clear search */}
        {isSearching && (
          <div className="podcast-search-footer">
            <button
              type="button"
              onClick={handleClearSearch}
            >
              ← Back to all episodes
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default PodcastPage;
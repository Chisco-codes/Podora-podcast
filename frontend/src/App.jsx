import { useCallback, useEffect, useRef, useState } from "react";

import SearchBar from "./components/SearchBar";
import EpisodeCard from "./components/EpisodeCard";
import AudioPlayer from "./components/AudioPlayer";
import PodcastPage from "./components/PodcastPage";
import EpisodePage from "./components/EpisodePage";

import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const ANALYTICS_SESSION_KEY = "podora_beta_session_id";

const PAGE_SIZE = 20;
const HOME_PAGE_SIZE = 6;

function getAnalyticsSessionId() {
  const existingSession = window.localStorage.getItem(
    ANALYTICS_SESSION_KEY
  );

  if (existingSession) {
    return existingSession;
  }

  const newSession =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  window.localStorage.setItem(
    ANALYTICS_SESSION_KEY,
    newSession
  );

  return newSession;
}

function trackEvent({
  event_type,
  episode_id = null,
  podcast_id = null,
  source = null,
  value = null,
}) {
  fetch(`${API_URL}/analytics/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: getAnalyticsSessionId(),
      event_type,
      episode_id,
      podcast_id,
      source,
      value,
    }),
  }).catch(() => {});
}

function App() {
  // -------------------------
  // PODCAST STATE
  // -------------------------

  const [podcasts, setPodcasts] = useState([]);
  const [selectedPodcast, setSelectedPodcast] = useState(null);

  const [podcastEpisodes, setPodcastEpisodes] = useState([]);
  const [podcastTotalEpisodes, setPodcastTotalEpisodes] =
    useState(0);

  const [isLoadingEpisodes, setIsLoadingEpisodes] =
    useState(false);

  const [podcastEpisodeSearchQuery, setPodcastEpisodeSearchQuery] =
    useState("");

  const [podcastEpisodeSearchResults, setPodcastEpisodeSearchResults] =
    useState([]);

  const [isSearchingPodcastEpisodes, setIsSearchingPodcastEpisodes] =
    useState(false);

  // -------------------------
  // EPISODE STATE
  // -------------------------

  const [episodes, setEpisodes] = useState([]);

  const [selectedEpisode, setSelectedEpisode] =
    useState(null);

  const [currentEpisode, setCurrentEpisode] =
    useState(null);

  const [audioEpisodes, setAudioEpisodes] =
    useState([]);

  // -------------------------
  // VIEW STATE
  // -------------------------

  const [currentView, setCurrentView] =
    useState("home");

  const [activeFooterDocument, setActiveFooterDocument] =
    useState(null);

  // -------------------------
  // MAIN SEARCH STATE
  // -------------------------

  const [searchQuery, setSearchQuery] =
    useState("");

  // -------------------------
  // PAGINATION STATE
  // -------------------------

  const [page, setPage] = useState(0);

  const [totalEpisodes, setTotalEpisodes] =
    useState(0);

  // -------------------------
  // AUDIO PLAYER REF
  // -------------------------

  const audioPlayerRef = useRef(null);

  // -------------------------
  // FEATURED IMAGE STATE
  // -------------------------

  const [featuredImageFailed, setFeaturedImageFailed] =
    useState(false);

  useEffect(() => {
    setFeaturedImageFailed(false);
  }, [episodes[0]?.id]);

  // -------------------------
  // KEEP NEW VIEWS AT TOP
  // -------------------------

  useEffect(() => {
    if (currentView === "podcast" || currentView === "episode") {
      window.scrollTo({
        top: 0,
        behavior: "auto",
      });
    }
  }, [currentView]);

  // -------------------------
  // LOAD PODCASTS
  // -------------------------

  useEffect(() => {
    trackEvent({
      event_type: "page_view",
      source: "home",
    });

    fetch(`${API_URL}/podcasts`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load podcasts: ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        setPodcasts(data);

        if (data.length > 0) {
          setSelectedPodcast(data[0]);
        }
      })
      .catch((error) => {
        console.error(
          "Error loading podcasts:",
          error
        );
      });
  }, []);

  // -------------------------
  // LOAD HOME EPISODES
  // -------------------------

  useEffect(() => {
    if (searchQuery) {
      return;
    }

    setIsLoadingEpisodes(true);

    fetch(
      `${API_URL}/episodes?limit=${HOME_PAGE_SIZE}&offset=${
        page * HOME_PAGE_SIZE
      }`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load episodes: ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        setEpisodes(data.results);
        setTotalEpisodes(data.total);
      })
      .catch((error) => {
        console.error(
          "Error loading episodes:",
          error
        );
      })
      .finally(() => {
        setIsLoadingEpisodes(false);
      });
  }, [page, searchQuery]);

  // -------------------------
  // PLAY EPISODE
  // -------------------------

  function handlePlay(episode) {
    trackEvent({
      event_type: "episode_play_requested",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: currentView,
    });

    if (currentView === "podcast") {
      setAudioEpisodes(podcastEpisodes);
    } else if (
      currentView === "episode" &&
      podcastEpisodes.some(
        (item) => item.id === episode.id
      )
    ) {
      setAudioEpisodes(podcastEpisodes);
    } else {
      setAudioEpisodes(episodes);
    }

    /*
     * Do not scroll to the player here.
     *
     * Previously this used scrollIntoView(), which caused
     * the page to jump down when the user pressed Play.
     *
     * The player will now behave as a compact mobile
     * listening control without moving the user's page.
     */
    setCurrentEpisode(episode);
  }

  // -------------------------
  // MAIN SEARCH
  // -------------------------

  const handleSearch = useCallback((query) => {
    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      return;
    }

    setSearchQuery(cleanedQuery);
    setPage(0);
    setIsLoadingEpisodes(true);

    fetch(
      `${API_URL}/episodes/search?q=${encodeURIComponent(
        cleanedQuery
      )}&limit=${PAGE_SIZE}&offset=0`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to search episodes: ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        setEpisodes(data.results);
        setTotalEpisodes(data.total);
      })
      .catch((error) => {
        console.error(
          "Search error:",
          error
        );

        setEpisodes([]);
        setTotalEpisodes(0);
      })
      .finally(() => {
        setIsLoadingEpisodes(false);
      });
  }, []);

  // -------------------------
  // CLEAR MAIN SEARCH
  // -------------------------

  const handleClear = useCallback(() => {
    setSearchQuery("");
    setPage(0);
  }, []);

  // -------------------------
  // MAIN SEARCH PAGINATION
  // -------------------------

  function loadSearchPage(newPage) {
    fetch(
      `${API_URL}/episodes/search?q=${encodeURIComponent(
        searchQuery
      )}&limit=${PAGE_SIZE}&offset=${
        newPage * PAGE_SIZE
      }`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load search page: ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        setEpisodes(data.results);
        setPage(newPage);
        setTotalEpisodes(data.total);
      })
      .catch((error) => {
        console.error(
          "Error loading search results:",
          error
        );
      });
  }

  // -------------------------
  // MAIN PAGINATION
  // -------------------------

  function handleNextPage() {
    const pageSize = searchQuery
      ? PAGE_SIZE
      : HOME_PAGE_SIZE;

    const totalPages = Math.ceil(
      totalEpisodes / pageSize
    );

    if (page >= totalPages - 1) {
      return;
    }

    if (searchQuery) {
      loadSearchPage(page + 1);
    } else {
      setPage(page + 1);
    }
  }

  function handlePreviousPage() {
    if (page === 0) {
      return;
    }

    if (searchQuery) {
      loadSearchPage(page - 1);
    } else {
      setPage(page - 1);
    }
  }

  // -------------------------
  // LOAD NEXT AUDIO BATCH
  // -------------------------

  function handleAudioNextPage() {
    // -------------------------
    // PODCAST QUEUE
    // -------------------------

    if (currentView === "podcast") {
      if (!selectedPodcast) {
        return;
      }

      const nextOffset = podcastEpisodes.length;

      if (nextOffset >= podcastTotalEpisodes) {
        return;
      }

      fetch(
        `${API_URL}/podcasts/${selectedPodcast.id}/episodes?limit=${PAGE_SIZE}&offset=${nextOffset}`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              "Failed to load next podcast page"
            );
          }

          return response.json();
        })
        .then((data) => {
          setPodcastEpisodes((currentEpisodes) => [
            ...currentEpisodes,
            ...data.results,
          ]);

          setAudioEpisodes((currentEpisodes) => [
            ...currentEpisodes,
            ...data.results,
          ]);
        })
        .catch((error) => {
          console.error(
            "Error loading next podcast page:",
            error
          );
        });

      return;
    }

    // -------------------------
    // GLOBAL SEARCH QUEUE
    // -------------------------

    if (searchQuery) {
      const nextPage = page + 1;

      if (
        nextPage * PAGE_SIZE >= totalEpisodes
      ) {
        return;
      }

      fetch(
        `${API_URL}/episodes/search?q=${encodeURIComponent(
          searchQuery
        )}&limit=${PAGE_SIZE}&offset=${
          nextPage * PAGE_SIZE
        }`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              "Failed to load next search page"
            );
          }

          return response.json();
        })
        .then((data) => {
          setAudioEpisodes((currentEpisodes) => [
            ...currentEpisodes,
            ...data.results,
          ]);

          setPage(nextPage);
        })
        .catch((error) => {
          console.error(
            "Error loading next search page:",
            error
          );
        });

      return;
    }

    // -------------------------
    // HOME QUEUE
    // -------------------------

    const nextPage = page + 1;

    if (
      nextPage * HOME_PAGE_SIZE >= totalEpisodes
    ) {
      return;
    }

    fetch(
      `${API_URL}/episodes?limit=${HOME_PAGE_SIZE}&offset=${
        nextPage * HOME_PAGE_SIZE
      }`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to load next episode page"
          );
        }

        return response.json();
      })
      .then((data) => {
        setAudioEpisodes((currentEpisodes) => [
          ...currentEpisodes,
          ...data.results,
        ]);

        setPage(nextPage);
      })
      .catch((error) => {
        console.error(
          "Error loading next episode page:",
          error
        );
      });
  }

  // -------------------------
  // OPEN PODCAST
  // -------------------------

  function handleOpenPodcast(podcast) {
    setSelectedPodcast(podcast);

    setSearchQuery("");
    setPage(0);

    setPodcastEpisodeSearchQuery("");
    setPodcastEpisodeSearchResults([]);
    setIsSearchingPodcastEpisodes(false);

    setPodcastEpisodes([]);
    setPodcastTotalEpisodes(0);

    setCurrentView("podcast");

    trackEvent({
      event_type: "podcast_open",
      podcast_id: podcast.id,
      source: "podcast_page",
    });

    setIsLoadingEpisodes(true);

    fetch(
      `${API_URL}/podcasts/${podcast.id}/episodes?limit=${PAGE_SIZE}&offset=0`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load podcast episodes: ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        setPodcastEpisodes(data.results);
        setPodcastTotalEpisodes(data.total);
      })
      .catch((error) => {
        console.error(
          "Error loading podcast episodes:",
          error
        );
      })
      .finally(() => {
        setIsLoadingEpisodes(false);
      });
  }

  // -------------------------
  // PODCAST EPISODE SEARCH
  // -------------------------

  const handlePodcastEpisodeSearch = useCallback(
    (query) => {
      const cleanedQuery = query.trim();

      setPodcastEpisodeSearchQuery(cleanedQuery);

      if (!cleanedQuery) {
        setPodcastEpisodeSearchResults([]);
        setIsSearchingPodcastEpisodes(false);
        return;
      }

      setIsSearchingPodcastEpisodes(true);

      const lowerQuery =
        cleanedQuery.toLowerCase();

      const results = podcastEpisodes.filter(
        (episode) => {
          const title =
            episode.title?.toLowerCase() || "";

          const description =
            episode.description?.toLowerCase() ||
            "";

          return (
            title.includes(lowerQuery) ||
            description.includes(lowerQuery)
          );
        }
      );

      setPodcastEpisodeSearchResults(results);
      setIsSearchingPodcastEpisodes(false);
    },
    [podcastEpisodes]
  );

  // -------------------------
  // CLEAR PODCAST SEARCH
  // -------------------------

  const handleClearPodcastEpisodeSearch =
    useCallback(() => {
      setPodcastEpisodeSearchQuery("");
      setPodcastEpisodeSearchResults([]);
      setIsSearchingPodcastEpisodes(false);
    }, []);

  // -------------------------
  // LOAD MORE PODCAST EPISODES
  // -------------------------

  function handleLoadMorePodcastEpisodes() {
    if (!selectedPodcast) {
      return;
    }

    if (
      podcastEpisodes.length >=
      podcastTotalEpisodes
    ) {
      return;
    }

    const nextOffset =
      podcastEpisodes.length;

    setIsLoadingEpisodes(true);

    fetch(
      `${API_URL}/podcasts/${selectedPodcast.id}/episodes?limit=${PAGE_SIZE}&offset=${nextOffset}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to load more podcast episodes"
          );
        }

        return response.json();
      })
      .then((data) => {
        setPodcastEpisodes((currentEpisodes) => [
          ...currentEpisodes,
          ...data.results,
        ]);

        if (podcastEpisodeSearchQuery) {
          const lowerQuery =
            podcastEpisodeSearchQuery.toLowerCase();

          const matchingEpisodes =
            data.results.filter((episode) => {
              const title =
                episode.title?.toLowerCase() || "";

              const description =
                episode.description?.toLowerCase() ||
                "";

              return (
                title.includes(lowerQuery) ||
                description.includes(lowerQuery)
              );
            });

          setPodcastEpisodeSearchResults(
            (currentResults) => [
              ...currentResults,
              ...matchingEpisodes,
            ]
          );
        }
      })
      .catch((error) => {
        console.error(
          "Error loading more podcast episodes:",
          error
        );
      })
      .finally(() => {
        setIsLoadingEpisodes(false);
      });
  }

  // -------------------------
  // OPEN EPISODE
  // -------------------------

  function handleOpenEpisode(episode) {
    setSelectedEpisode(episode);
    setCurrentView("episode");

    trackEvent({
      event_type: "episode_open",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: currentView,
    });
  }

  // -------------------------
  // BACK TO PODCAST
  // -------------------------

  function handleBackToPodcast() {
    setCurrentView("podcast");
  }

  // -------------------------
  // BACK HOME
  // -------------------------

  function handleBackHome() {
    setCurrentView("home");

    setSearchQuery("");
    setPage(0);

    setPodcastEpisodeSearchQuery("");
    setPodcastEpisodeSearchResults([]);
    setIsSearchingPodcastEpisodes(false);
  }

  // -------------------------
  // UI
  // -------------------------

  return (
    <div className="app">
      <main>
        {/* =========================
            HOME
        ========================= */}

        {currentView === "home" && (
          <>
            <section className="hero-section">
              <div className="hero-content">
                <p className="hero-label">
                  PODCAST DISCOVERY
                </p>

                <h2>
                  Discover something worth listening to.
                </h2>

                <p>
                  Explore podcasts, episodes, and ideas
                  from across Africa and beyond.
                </p>
              </div>

              <SearchBar
                onSearch={handleSearch}
                onClear={handleClear}
              />
            </section>

            {/* =========================
                SEARCH RESULTS
            ========================= */}

            {searchQuery ? (
              <section className="episodes-section discovery-section search-results-section">
                <div className="section-heading">
                  <div>
                    <p className="section-label">
                      SEARCH
                    </p>

                    <h2>
                      Search Results
                    </h2>

                    <p>
                      {totalEpisodes}{" "}
                      {totalEpisodes === 1
                        ? "episode"
                        : "episodes"}{" "}
                      found for "{searchQuery}"
                    </p>
                  </div>
                </div>

                {isLoadingEpisodes ? (
                  <div className="episodes-message">
                    Loading episodes...
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="episodes-message">
                    No episodes found for "
                    {searchQuery}".
                  </div>
                ) : (
                  <div className="episode-list">
                    {episodes.map((episode) => (
                      <EpisodeCard
                        key={episode.id}
                        episode={episode}
                        onPlay={handlePlay}
                        onOpenEpisode={
                          handleOpenEpisode
                        }
                        podcastArtworkUrl={
                          episode.podcast_image_url
                        }
                      />
                    ))}
                  </div>
                )}

                <div className="pagination">
                  <button
                    type="button"
                    onClick={
                      handlePreviousPage
                    }
                    disabled={page === 0}
                  >
                    Previous
                  </button>

                  <span>
                    Page {page + 1} of{" "}
                    {Math.max(
                      1,
                      Math.ceil(
                        totalEpisodes /
                          PAGE_SIZE
                      )
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={
                      page >=
                      Math.ceil(
                        totalEpisodes /
                          PAGE_SIZE
                      ) -
                        1
                    }
                  >
                    Next
                  </button>
                </div>
              </section>
            ) : (
              <>
                {/* =========================
                    FEATURED
                ========================= */}

                {episodes.length > 0 &&
                  page === 0 && (
                    <section className="featured-section">
                      <div className="section-heading">
                        <div>
                          <p className="section-label">
                            FEATURED
                          </p>

                          <h2>
                            Worth a listen
                          </h2>

                          <p>
                            A newly published episode
                            from the podcasts we
                            currently follow.
                          </p>
                        </div>
                      </div>

                      {(() => {
                        const featuredEpisode =
                          episodes[0];

                        const featuredPodcast =
                          podcasts.find(
                            (podcast) =>
                              podcast.title ===
                              featuredEpisode.podcast_title
                          );

                        return (
                          <article className="featured-episode">
                            <div className="featured-artwork">
                              {featuredPodcast?.artwork_url &&
                              !featuredImageFailed ? (
                                <img
                                  src={
                                    featuredPodcast.artwork_url
                                  }
                                  alt=""
                                  onError={() =>
                                    setFeaturedImageFailed(
                                      true
                                    )
                                  }
                                />
                              ) : (
                                <div className="featured-artwork-placeholder">
                                  PODCAST
                                </div>
                              )}
                            </div>

                            <div className="featured-content">
                              <p className="featured-podcast">
                                {
                                  featuredEpisode.podcast_title
                                }
                              </p>

                              <button
                                type="button"
                                className="featured-title"
                                onClick={() =>
                                  handleOpenEpisode(
                                    featuredEpisode
                                  )
                                }
                              >
                                {
                                  featuredEpisode.title
                                }
                              </button>

                              <p className="featured-description">
                                {featuredEpisode.description ||
                                  "Listen to the latest episode and discover something new."}
                              </p>

                              <div className="featured-meta">
                                <span>
                                  {featuredEpisode.published
                                    ? new Intl.DateTimeFormat(
                                        "en-US",
                                        {
                                          month:
                                            "short",
                                          day: "numeric",
                                          year: "numeric",
                                        }
                                      ).format(
                                        new Date(
                                          featuredEpisode.published
                                        )
                                      )
                                    : ""}
                                </span>

                                <span aria-hidden="true">
                                  ·
                                </span>

                                <span>
                                  {featuredEpisode.duration_minutes
                                    ? `${Math.round(
                                        featuredEpisode.duration_minutes
                                      )} min`
                                    : ""}
                                </span>
                              </div>

                              <button
                                type="button"
                                className="featured-play"
                                onClick={() =>
                                  handlePlay(
                                    featuredEpisode
                                  )
                                }
                              >
                                Play episode
                              </button>
                            </div>
                          </article>
                        );
                      })()}
                    </section>
                  )}

                {/* =========================
                    LATEST EPISODES
                ========================= */}

                <section className="episodes-section discovery-section latest-section">
                  <div className="section-heading">
                    <div>
                      <p className="section-label">
                        {page === 0
                          ? "LATEST"
                          : "MORE EPISODES"}
                      </p>

                      <h2>
                        {page === 0
                          ? "Recently published"
                          : "More to discover"}
                      </h2>

                      <p>
                        {page === 0
                          ? "Fresh episodes from the podcasts we currently follow."
                          : "Keep exploring the latest episodes in the collection."}
                      </p>
                    </div>
                  </div>

                  {isLoadingEpisodes ? (
                    <div className="episodes-message">
                      Loading episodes...
                    </div>
                  ) : episodes.length === 0 ? (
                    <div className="episodes-message">
                      No episodes available.
                    </div>
                  ) : (
                    <div className="episode-list">
                      {episodes
                        .slice(
                          page === 0 ? 1 : 0
                        )
                        .map((episode) => (
                          <EpisodeCard
                            key={episode.id}
                            episode={episode}
                            onPlay={handlePlay}
                            onOpenEpisode={
                              handleOpenEpisode
                            }
                            podcastArtworkUrl={
                              podcasts.find(
                                (podcast) =>
                                  podcast.title ===
                                  episode.podcast_title
                              )?.artwork_url
                            }
                          />
                        ))}
                    </div>
                  )}

                  <div className="pagination">
                    <button
                      type="button"
                      onClick={
                        handlePreviousPage
                      }
                      disabled={page === 0}
                    >
                      Previous
                    </button>

                    <span>
                      Page {page + 1} of{" "}
                      {Math.max(
                        1,
                        Math.ceil(
                          totalEpisodes /
                            HOME_PAGE_SIZE
                        )
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={handleNextPage}
                      disabled={
                        page >=
                        Math.ceil(
                          totalEpisodes /
                            HOME_PAGE_SIZE
                        ) -
                          1
                      }
                    >
                      Next
                    </button>
                  </div>
                </section>

                {/* =========================
                    EXPLORE PODCASTS
                ========================= */}

                <section className="podcasts-section">
                  <div className="section-heading">
                    <div>
                      <p className="section-label">
                        EXPLORE
                      </p>

                      <h2>
                        Explore podcasts
                      </h2>

                      <p>
                        Find a show and discover
                        more episodes.
                      </p>
                    </div>
                  </div>

                  <div className="podcast-explore-grid">
                    {podcasts.map((podcast) => (
                      <button
                        type="button"
                        key={podcast.id}
                        className="podcast-explore-item"
                        onClick={() =>
                          handleOpenPodcast(
                            podcast
                          )
                        }
                      >
                        <div className="podcast-explore-artwork">
                          {podcast.artwork_url ? (
                            <img
                              src={
                                podcast.artwork_url
                              }
                              alt={`${podcast.title} artwork`}
                            />
                          ) : (
                            <div className="podcast-explore-artwork-placeholder">
                              PODCAST
                            </div>
                          )}
                        </div>

                        <div className="podcast-explore-content">
                          <h3>
                            {podcast.title}
                          </h3>

                          <p className="podcast-explore-description">
                            {podcast.description ||
                              "Discover episodes from this podcast."}
                          </p>

                          <span className="podcast-explore-link">
                            View podcast →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* =========================
            PODCAST PAGE
        ========================= */}

        {currentView === "podcast" &&
          selectedPodcast && (
            <PodcastPage
              podcast={selectedPodcast}
              episodes={
                podcastEpisodeSearchQuery
                  ? podcastEpisodeSearchResults
                  : podcastEpisodes
              }
              totalEpisodes={
                podcastTotalEpisodes
              }
              onBack={handleBackHome}
              onPlay={handlePlay}
              onOpenEpisode={
                handleOpenEpisode
              }
              onLoadMore={
                handleLoadMorePodcastEpisodes
              }
              isLoadingMore={
                isLoadingEpisodes
              }
              episodeSearchQuery={
                podcastEpisodeSearchQuery
              }
              onEpisodeSearch={
                handlePodcastEpisodeSearch
              }
              onClearEpisodeSearch={
                handleClearPodcastEpisodeSearch
              }
              isSearchingEpisodes={
                isSearchingPodcastEpisodes
              }
            />
          )}

        {/* =========================
            EPISODE PAGE
        ========================= */}

        {currentView === "episode" &&
          selectedEpisode && (
            <EpisodePage
              episode={selectedEpisode}
              podcast={selectedPodcast}
              onBack={handleBackToPodcast}
              onPlay={handlePlay}
              podcastArtworkUrl={
                selectedEpisode.podcast_image_url
              }
            />
          )}

        {/* =========================
            AUDIO PLAYER
        ========================= */}

        {currentEpisode && (
          <div ref={audioPlayerRef}>
            <AudioPlayer
              episode={currentEpisode}
              onClose={() =>
                setCurrentEpisode(null)
              }
              onTrackEvent={trackEvent}
              episodes={audioEpisodes}
              onChangeEpisode={
                setCurrentEpisode
              }
              onRequestNext={
                handleAudioNextPage
              }
            />
          </div>
        )}
      </main>

      {/* =========================
          FOOTER
      ========================= */}

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <p className="site-footer-kicker">
              PODORA
            </p>

            <h2>
              Discover something worth listening to.
            </h2>

            <p>
              An early podcast discovery and
              listening platform, being built with
              room for video, creators,
              personalization, and AI-powered
              discovery.
            </p>
          </div>

          <div className="site-footer-links">
            <div className="site-footer-column">
              <p className="site-footer-column-title">
                Product
              </p>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument("about")
                }
              >
                About
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument("beta")
                }
              >
                Beta notice
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument("content")
                }
              >
                Content & rights
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument("creator")
                }
              >
                Creator & video
              </button>
            </div>

            <div className="site-footer-column">
              <p className="site-footer-column-title">
                Future direction
              </p>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument(
                    "personalization"
                  )
                }
              >
                Personalization & AI
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument(
                    "monetization"
                  )
                }
              >
                Creators & monetization
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument("roadmap")
                }
              >
                Product vision
              </button>
            </div>

            <div className="site-footer-column">
              <p className="site-footer-column-title">
                Information
              </p>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument("terms")
                }
              >
                Terms of use
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFooterDocument("privacy")
                }
              >
                Privacy policy
              </button>
            </div>
          </div>

          <div className="site-footer-bottom">
            <span>
              © 2026 Podora Podcast — Early Beta
            </span>

            <span>
              Built as an early product release
              for testing and learning.
            </span>
          </div>
        </div>
      </footer>

      {/* =========================
          FOOTER DOCUMENT MODAL
      ========================= */}

      {activeFooterDocument && (
        <div
          className="footer-document-backdrop"
          role="presentation"
          onClick={() =>
            setActiveFooterDocument(null)
          }
        >
          <section
            className="footer-document-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-document-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="footer-document-close"
              type="button"
              aria-label="Close document"
              onClick={() =>
                setActiveFooterDocument(null)
              }
            >
              ×
            </button>

            {activeFooterDocument === "about" && (
              <>
                <p className="section-label">
                  ABOUT
                </p>

                <h2 id="footer-document-title">
                  What Podora is becoming
                </h2>

                <p>
                  Podora is being built as a
                  place where people come to
                  discover and listen to podcasts,
                  rather than simply browse a
                  database of shows.
                </p>

                <p>
                  The early beta focuses on the
                  core discovery and listening
                  experience. As the product
                  develops, the vision expands
                  toward richer podcast
                  experiences, creators, video,
                  personalization, and better
                  ways to discover valuable
                  content.
                </p>
              </>
            )}

            {activeFooterDocument === "beta" && (
              <>
                <p className="section-label">
                  BETA NOTICE
                </p>

                <h2 id="footer-document-title">
                  This is an early development
                  release
                </h2>

                <p>
                  Podora is currently an
                  experimental early beta used
                  to test the product experience,
                  technical foundation,
                  discovery flow, and listening
                  experience with a small group
                  of testers.
                </p>

                <p>
                  Features, content coverage,
                  design, and functionality may
                  change as we learn from testing.
                  This beta should not be
                  understood as a finished
                  commercial product.
                </p>
              </>
            )}

            {activeFooterDocument === "content" && (
              <>
                <p className="section-label">
                  CONTENT & RIGHTS
                </p>

                <h2 id="footer-document-title">
                  About the content in this beta
                </h2>

                <p>
                  Content currently displayed
                  during this early beta is being
                  used to test the platform's
                  discovery and listening
                  experience.
                </p>

                <p>
                  This beta should not be
                  understood as confirmation
                  that the platform has obtained
                  permanent licensing or
                  commercial distribution rights
                  for every piece of content
                  displayed.
                </p>

                <p>
                  Before moving toward a broader
                  public or commercial release,
                  we intend to establish the
                  appropriate permissions,
                  licences, and other rights
                  required for the content and
                  services we provide.
                </p>
              </>
            )}

            {activeFooterDocument === "creator" && (
              <>
                <p className="section-label">
                  CREATOR & VIDEO
                </p>

                <h2 id="footer-document-title">
                  A broader podcast experience
                </h2>

                <p>
                  The current beta is centered
                  on podcast discovery and
                  listening. Over time, we plan
                  to support richer creator
                  experiences, including creator
                  pages and video podcasts as the
                  platform and its rights
                  framework develop.
                </p>

                <p>
                  Creator tools, publishing
                  workflows, analytics, and other
                  creator-facing capabilities will
                  be introduced progressively
                  rather than treated as part of
                  this first beta.
                </p>
              </>
            )}

            {activeFooterDocument ===
              "personalization" && (
              <>
                <p className="section-label">
                  PERSONALIZATION & AI
                </p>

                <h2 id="footer-document-title">
                  Discovery that becomes more
                  personal
                </h2>

                <p>
                  A longer-term goal is to make
                  discovery increasingly
                  relevant to each listener by
                  learning from signals such as
                  interests, listening behaviour,
                  and the kinds of shows and
                  topics they choose to explore.
                </p>

                <p>
                  AI and machine learning are
                  intended to support that
                  experience when they provide
                  genuine value—for example,
                  better recommendations, topic
                  discovery, search, and content
                  understanding. They are part of
                  the direction, not a claim about
                  what this beta already provides.
                </p>
              </>
            )}

            {activeFooterDocument ===
              "monetization" && (
              <>
                <p className="section-label">
                  CREATORS & MONETIZATION
                </p>

                <h2 id="footer-document-title">
                  A future creator ecosystem
                </h2>

                <p>
                  The longer-term vision includes
                  ways for creators to build an
                  audience on the platform and
                  potentially participate in
                  sustainable monetization and
                  earnings.
                </p>

                <p>
                  Possible future models include
                  advertising-supported free
                  listening and an optional
                  premium experience, alongside
                  creator-focused revenue
                  mechanisms. These plans will be
                  shaped by testing, economics,
                  creator needs, and the rights
                  framework of the platform.
                </p>
              </>
            )}

            {activeFooterDocument === "roadmap" && (
              <>
                <p className="section-label">
                  PRODUCT VISION
                </p>

                <h2 id="footer-document-title">
                  Where we are heading
                </h2>

                <ul className="footer-document-list">
                  <li>
                    Strong podcast discovery and
                    listening at the core.
                  </li>

                  <li>
                    Broader audio and video
                    podcast experiences.
                  </li>

                  <li>
                    Creator pages and
                    creator-facing tools.
                  </li>

                  <li>
                    User accounts and a more
                    personal listening experience.
                  </li>

                  <li>
                    AI-assisted search, discovery,
                    and recommendations.
                  </li>

                  <li>
                    Advertising-supported free
                    listening and optional premium
                    experiences.
                  </li>

                  <li>
                    Creator monetization and a
                    broader podcast ecosystem.
                  </li>
                </ul>

                <p>
                  These are product directions,
                  not promises that every feature
                  will appear in the next release.
                </p>
              </>
            )}

            {activeFooterDocument === "terms" && (
              <>
                <p className="section-label">
                  TERMS OF USE
                </p>

                <h2 id="footer-document-title">
                  Early beta terms
                </h2>

                <p>
                  This early beta is provided for
                  product testing and evaluation.
                  Functionality and availability
                  may change without notice.
                </p>

                <p>
                  Users should use the service
                  responsibly and should not
                  attempt to interfere with the
                  platform, abuse access, or use
                  the beta in ways that violate
                  applicable laws or the rights of
                  others.
                </p>

                <p>
                  These preliminary terms are
                  intended for the early test
                  stage. A formal set of terms
                  will be reviewed and adapted to
                  the platform's final business
                  structure, jurisdiction,
                  services, and commercial launch
                  requirements.
                </p>
              </>
            )}

            {activeFooterDocument === "privacy" && (
              <>
                <p className="section-label">
                  PRIVACY POLICY
                </p>

                <h2 id="footer-document-title">
                  Privacy at the early beta stage
                </h2>

                <p>
                  This beta currently focuses on
                  providing podcast discovery and
                  listening functionality. We aim
                  to collect only the information
                  needed for the features that are
                  actually implemented.
                </p>

                <p>
                  As accounts, personalization,
                  analytics, advertising, and
                  other services are introduced,
                  the privacy policy will be
                  expanded to accurately describe
                  the data collected, why it is
                  used, how it is protected, and
                  the choices available to users.
                </p>

                <p>
                  The formal policy will be
                  reviewed before broader public
                  or commercial operation.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
import { useEffect, useRef } from "react";

function AudioPlayer({
  episode,
  onClose,
  onTrackEvent,
  episodes,
  onChangeEpisode,
  onRequestNext,
}) 

{  const audioRef = useRef(null);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    lastProgressRef.current = 0;

    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {
        // Browser may block autoplay in some situations.
      });
    }
  }, [episode]);

  if (!episode) {
    return null;
  }

  function handlePlay() {
    onTrackEvent?.({
      event_type: "audio_play",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: "audio_player",
      value: audioRef.current?.currentTime ?? 0,
    });
  }

  function handlePause() {
    const currentTime = audioRef.current?.currentTime ?? 0;

    onTrackEvent?.({
      event_type: "audio_pause",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: "audio_player",
      value: currentTime,
    });
  }

  function handleProgress() {
    const currentTime = audioRef.current?.currentTime ?? 0;

    // Send a progress event roughly every 30 seconds.
    if (currentTime - lastProgressRef.current < 30) {
      return;
    }

    lastProgressRef.current = currentTime;

    onTrackEvent?.({
      event_type: "audio_progress",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: "audio_player",
      value: currentTime,
    });
  }

  function handleEnded() {
    onTrackEvent?.({
      event_type: "audio_complete",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: "audio_player",
      value: audioRef.current?.duration ?? null,
    });
  }

     const currentEpisodeIndex = episodes?.findIndex(
    (item) => item.id === episode.id
  );

  const previousEpisode =
    currentEpisodeIndex > 0
      ? episodes[currentEpisodeIndex - 1]
      : null;

  const nextEpisode =
    currentEpisodeIndex >= 0 &&
    currentEpisodeIndex < episodes.length - 1
      ? episodes[currentEpisodeIndex + 1]
      : null;

  function handlePrevious() {
    if (!previousEpisode) {
      return;
    }

    onChangeEpisode(previousEpisode);
  }

function handleNext() {
  if (nextEpisode) {
    onChangeEpisode(nextEpisode);
    return;
  }

  onRequestNext?.();
}

  function handleRewind() {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.currentTime = Math.max(
      0,
      audioRef.current.currentTime - 15
    );
  }

  function handleForward() {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.currentTime = Math.min(
      audioRef.current.duration || Infinity,
      audioRef.current.currentTime + 30
    );
  }

  return (
    <div className="audio-player">
      <div className="audio-player-info">
        <span className="audio-player-label">
          NOW PLAYING
        </span>

        <h3>{episode.title}</h3>
      </div>

      <audio
        ref={audioRef}
        controls
        src={episode.media_url}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleProgress}
        onEnded={handleEnded}
      >
        Your browser does not support audio playback.
      </audio>

              <div className="audio-player-actions">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!previousEpisode}
        >
          ⏮ Previous
        </button>

        <button
          type="button"
          onClick={handleRewind}
        >
          ↶ 15s
        </button>

        <button
          type="button"
          onClick={handleForward}
        >
          30s ↷
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={false}
        >
          Next ⏭
        </button>
      </div>

      <button
        className="audio-player-close"
        onClick={onClose}
        aria-label="Close audio player"
      >
        ×
      </button>
    </div>
  );
}

export default AudioPlayer;

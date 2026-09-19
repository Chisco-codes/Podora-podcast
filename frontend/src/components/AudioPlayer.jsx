import { useEffect, useRef, useState } from "react";

function AudioPlayer({
  episode,
  onClose,
  onTrackEvent,
  episodes,
  onChangeEpisode,
  onRequestNext,
}) {
  const audioRef = useRef(null);
  const lastProgressRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    lastProgressRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.load();

      audioRef.current.play().catch(() => {
        // Browser may block autoplay.
      });
    }
  }, [episode]);

  if (!episode) {
    return null;
  }

  function handlePlay() {
    setIsPlaying(true);

    onTrackEvent?.({
      event_type: "audio_play",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: "audio_player",
      value: audioRef.current?.currentTime ?? 0,
    });
  }

  function handlePause() {
    setIsPlaying(false);

    const time = audioRef.current?.currentTime ?? 0;

    onTrackEvent?.({
      event_type: "audio_pause",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: "audio_player",
      value: time,
    });
  }

  function handleProgress() {
    const time = audioRef.current?.currentTime ?? 0;

    setCurrentTime(time);

    if (time - lastProgressRef.current < 30) {
      return;
    }

    lastProgressRef.current = time;

    onTrackEvent?.({
      event_type: "audio_progress",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: "audio_player",
      value: time,
    });
  }

  function handleLoadedMetadata() {
    setDuration(audioRef.current?.duration ?? 0);
  }

  function handleEnded() {
    setIsPlaying(false);

    onTrackEvent?.({
      event_type: "audio_complete",
      episode_id: episode.id,
      podcast_id: episode.podcast_id ?? null,
      source: "audio_player",
      value: audioRef.current?.duration ?? null,
    });
  }

  function handlePlayPause() {
    if (!audioRef.current) {
      return;
    }

    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }

  const currentEpisodeIndex =
    episodes?.findIndex(
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

  function handleSeek(event) {
    if (!audioRef.current || !duration) {
      return;
    }

    const nextTime = Number(event.target.value);

    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  const progressPercentage =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;

  return (
    <div className="audio-player">
      <div className="audio-player-main">
        {episode.podcast_image_url && (
          <img
            className="audio-player-artwork"
            src={episode.podcast_image_url}
            alt=""
          />
        )}

        <div className="audio-player-info">
          <span className="audio-player-label">
            NOW PLAYING
          </span>

          <h3>{episode.title}</h3>

          {episode.podcast_title && (
            <p className="audio-player-podcast">
              {episode.podcast_title}
            </p>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={episode.media_url}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      >
        Your browser does not support audio playback.
      </audio>

      <div className="audio-player-controls">
        <button
          type="button"
          className="audio-player-control audio-player-skip"
          onClick={handlePrevious}
          disabled={!previousEpisode}
          aria-label="Previous episode"
          title="Previous episode"
        >
          ‹
        </button>

        <button
          type="button"
          className="audio-player-control audio-player-rewind"
          onClick={handleRewind}
          aria-label="Rewind 15 seconds"
          title="Rewind 15 seconds"
        >
          ↶
        </button>

        <button
          type="button"
          className="audio-player-play"
          onClick={handlePlayPause}
          aria-label={isPlaying ? "Pause" : "Play"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>

        <button
          type="button"
          className="audio-player-control audio-player-forward"
          onClick={handleForward}
          aria-label="Forward 30 seconds"
          title="Forward 30 seconds"
        >
          ↷
        </button>

        <button
          type="button"
          className="audio-player-control audio-player-skip"
          onClick={handleNext}
          aria-label="Next episode"
          title="Next episode"
        >
          ›
        </button>
      </div>

      <div className="audio-player-progress">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="1"
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          aria-label="Audio progress"
          style={{
            "--audio-progress": `${progressPercentage}%`,
          }}
        />
      </div>

      <button
        type="button"
        className="audio-player-close"
        onClick={onClose}
        aria-label="Close audio player"
        title="Close"
      >
        ×
      </button>
    </div>
  );
}

export default AudioPlayer;
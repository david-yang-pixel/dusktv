import React from 'react';
import { useRouter } from 'expo-router';
import CinemaPlayer, { CinemaTouchControls, CinemaTouchPanel } from '@/components/cinema/CinemaPlayer';
import usePlayerStore from '@/stores/playerStore';
import useDetailStore from '@/stores/detailStore';
import { useSources } from '@/stores/sourceStore';

// What every player surface shows, read once from the stores.
function usePlayerView() {
  const p = usePlayerStore();
  const { detail } = useDetailStore();
  const sources = useSources();
  const duration = p.status?.isLoaded ? p.status.durationMillis || 0 : 0;
  const position = p.isSeeking ? p.seekPosition * duration : p.status?.isLoaded ? p.status.positionMillis : 0;
  const hasNext = p.currentEpisodeIndex < p.episodes.length - 1;
  return {
    p,
    view: {
      title: detail?.title || '',
      episode: p.episodes[p.currentEpisodeIndex]?.title,
      source: sources.find(source => source.source === detail?.source)?.source_name,
      playing: !!(p.status?.isLoaded && p.status.isPlaying),
      position, duration, rate: p.playbackRate, hasNext,
      intro: p.introEndTime || 0, outro: p.outroStartTime || 0,
      onToggle: p.togglePlayPause,
      onNext: () => { if (hasNext) p.playEpisode(p.currentEpisodeIndex + 1); },
      onEpisodes: () => p.setShowEpisodeModal(true), onSources: () => p.setShowSourceModal(true), onSpeed: () => p.setShowSpeedModal(true),
      onIntro: p.setIntroEndTime, onOutro: p.setOutroStartTime,
    },
  };
}

export const PlayerControls = ({ showControls, setShowControls }: { showControls: boolean; setShowControls: (value: boolean) => void }) => {
  const { p, view } = usePlayerView();
  const router = useRouter();
  if (!showControls) return null;
  return <CinemaPlayer {...view} onBack={() => router.back()} onSeek={p.seek} onHide={() => setShowControls(false)} />;
};

// Phones and tablets: transport controls drawn over the picture.
export const TouchPlayerControls = ({ immersive, onInteract }: { immersive: boolean; onInteract?: () => void }) => {
  const { p, view } = usePlayerView();
  const router = useRouter();
  return <CinemaTouchControls {...view} immersive={immersive} onInteract={onInteract} onBack={() => router.back()} onSeekBy={p.seek} onSeekTo={p.seekTo} onHide={() => p.setShowControls(false)} />;
};

// Phones and tablets in portrait: episodes and playback settings under the picture.
export const TouchPlayerPanel = () => {
  const { p, view } = usePlayerView();
  return <CinemaTouchPanel {...view} episodes={p.episodes.map((episode, index) => episode.title || `第 ${index + 1} 集`)} episodeIndex={p.currentEpisodeIndex} onEpisode={p.playEpisode} />;
};

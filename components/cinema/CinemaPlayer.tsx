import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowDownToDot, ArrowUpFromDot, EyeOff, Gauge, List, Pause, Play, RotateCcw, RotateCw, SkipForward, Tv } from 'lucide-react-native';
import { cinema as c } from '@/constants/CinemaTheme';
import { CinemaButton, useCinemaLayout } from './CinemaUI';
export function formatPlaybackTime(milliseconds: number) {
  const seconds = Math.floor(Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0) / 1000);
  const hours = Math.floor(seconds / 3600);
  return [hours > 0 ? hours : undefined, Math.floor(seconds / 60) % 60, seconds % 60].filter(value => value !== undefined).map(value => String(value).padStart(2, '0')).join(':');
}
export interface CinemaPlayerProps {
  title: string; episode?: string; source?: string; playing: boolean; position: number; duration: number; rate: number; hasNext: boolean; intro: number; outro: number;
  onBack: () => void; onToggle: () => void; onNext: () => void; onSeek: (delta: number) => void; onEpisodes: () => void; onSources: () => void; onSpeed: () => void; onIntro: () => void; onOutro: () => void; onHide: () => void;
}
export default function CinemaPlayer(p: CinemaPlayerProps) {
  const { scale, gutter, compact } = useCinemaLayout();
  const progress = p.duration > 0 ? Math.min(1, Math.max(0, p.position / p.duration)) : 0;
  return <View style={[StyleSheet.absoluteFill, { justifyContent: 'space-between' }]} pointerEvents="box-none">
    <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.88)', 'rgba(0,0,0,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%' }} />
    <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.96)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '58%' }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter, paddingTop: 20 * scale, gap: 18 }}>
      <CinemaButton label="返回影片" icon={ArrowLeft} compact onPress={p.onBack} scale={scale} /><View style={{ flex: 1, gap: 5 }}><Text numberOfLines={1} style={{ color: c.text, fontSize: 22 * scale, fontWeight: '600' }}>{p.title}</Text><Text style={{ color: c.secondary, fontSize: 14 * scale }}>{[p.episode, p.source].filter(Boolean).join(' / ')}</Text></View><CinemaButton label="隐藏控制栏" icon={EyeOff} compact onPress={p.onHide} scale={scale} />
    </View>
    <View style={{ paddingHorizontal: gutter, paddingBottom: 22 * scale, gap: 14 * scale }}>
      <View accessibilityRole="progressbar" accessibilityLabel="播放进度" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 4 * scale, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.24)' }}><View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: c.accent, borderRadius: 8 }} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.text, fontSize: 14 * scale }}>{formatPlaybackTime(p.position)}</Text><Text style={{ color: c.secondary, fontSize: 14 * scale }}>{formatPlaybackTime(p.duration)}</Text></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 }}>
        <View style={{ flexDirection: 'row', maxWidth: '100%', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}><CinemaButton label="快退 20 秒" icon={RotateCcw} compact onPress={() => p.onSeek(-20000)} scale={scale} /><CinemaButton label={p.playing ? '暂停' : '播放'} icon={p.playing ? Pause : Play} primary preferred onPress={p.onToggle} scale={scale} /><CinemaButton label="快进 20 秒" icon={RotateCw} compact onPress={() => p.onSeek(20000)} scale={scale} /><CinemaButton label="下一集" icon={SkipForward} compact={compact} disabled={!p.hasNext} onPress={p.onNext} scale={scale} /></View>
        <View style={{ flexDirection: 'row', maxWidth: '100%', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><CinemaButton label="选集" icon={List} onPress={p.onEpisodes} scale={scale} /><CinemaButton label={`${p.rate}× 倍速`} icon={Gauge} onPress={p.onSpeed} scale={scale} /><CinemaButton label="换源" icon={Tv} onPress={p.onSources} scale={scale} /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}><CinemaButton label={p.intro ? `片头 ${formatPlaybackTime(p.intro)}` : '设为片头结束'} icon={ArrowDownToDot} selected={!!p.intro} onPress={p.onIntro} scale={scale * 0.85} /><CinemaButton label={p.outro ? `片尾 ${formatPlaybackTime(p.outro)}` : '设为片尾开始'} icon={ArrowUpFromDot} selected={!!p.outro} onPress={p.onOutro} scale={scale * 0.85} /></View>
    </View>
  </View>;
}

// ---------------------------------------------------------------------------
// Touch layer for phones and tablets. The TV overlay above is driven by focus;
// this one is driven by taps and drags. It has two shapes:
//   portrait  – video on top with transport controls, episodes and settings in a panel below
//   landscape – full-screen video with every control in the overlay
// ---------------------------------------------------------------------------

const SEEK_STEP = 10000;
const EPISODE_PAGE = 30;
const scrim = 'rgba(16,18,20,0.62)';

function TouchChip({ label, icon: Icon, onPress, selected = false, disabled = false, solid = false, half = false }: {
  label: string; icon?: typeof Play; onPress: () => void; selected?: boolean; disabled?: boolean; solid?: boolean;
  /** Take half a row, so four settings sit as a tidy 2 × 2 block on a narrow phone. */
  half?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      aria-disabled={disabled}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [touch.chip, half && touch.halfChip, {
        backgroundColor: solid ? c.surface : scrim,
        borderColor: selected ? c.accent : 'transparent',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      }]}
    >
      {Icon && <Icon size={16} color={selected ? c.accent : c.text} strokeWidth={1.8} />}
      <Text numberOfLines={1} style={{ color: selected ? c.accent : c.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function RoundButton({ label, icon: Icon, onPress, size = 44, primary = false }: {
  label: string; icon: typeof Play; onPress: () => void; size?: number; primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [touch.round, {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: primary ? c.focus : scrim,
        opacity: pressed ? 0.7 : 1,
      }]}
    >
      <Icon size={size * 0.46} color={primary ? c.background : c.text} strokeWidth={1.8} fill={primary ? c.background : 'none'} />
    </Pressable>
  );
}

// Draggable timeline. While a finger is down the thumb follows it and the video
// is only asked to seek once, on release.
function Scrubber({ position, duration, onSeekTo, onSeekBy, onInteract }: {
  position: number; duration: number; onSeekTo: (position: number) => void; onSeekBy: (delta: number) => void; onInteract?: () => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const track = useRef({ width: 0, start: 0, fraction: 0 });
  const latest = useRef({ duration, onSeekTo, onInteract });
  latest.current = { duration, onSeekTo, onInteract };
  const responder = useMemo(() => {
    const move = (x: number) => {
      const { width } = track.current;
      if (width <= 0) return;
      track.current.fraction = Math.min(1, Math.max(0, x / width));
      setDragging(track.current.fraction);
      latest.current.onInteract?.();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      // Children ignore touches, so locationX is always measured from the track itself.
      onPanResponderGrant: event => { track.current.start = event.nativeEvent.locationX; move(track.current.start); },
      onPanResponderMove: (_, gesture) => move(track.current.start + gesture.dx),
      onPanResponderRelease: () => { latest.current.onSeekTo(track.current.fraction * latest.current.duration); setDragging(null); },
      onPanResponderTerminate: () => setDragging(null),
    });
  }, []);
  const fraction = dragging ?? (duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0);
  const thumb = dragging === null ? 14 : 20;
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={touch.time}>{formatPlaybackTime(fraction * duration)}</Text>
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="播放进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event => onSeekBy(event.nativeEvent.actionName === 'increment' ? SEEK_STEP : -SEEK_STEP)}
        onLayout={event => { track.current.width = event.nativeEvent.layout.width; }}
        style={touch.scrubber}
      >
        <View pointerEvents="none" style={touch.track}>
          <View style={{ width: `${fraction * 100}%`, height: '100%', borderRadius: 2, backgroundColor: c.accent }} />
        </View>
        <View pointerEvents="none" style={[touch.thumb, { width: thumb, height: thumb, borderRadius: thumb / 2, left: `${fraction * 100}%`, marginLeft: -thumb / 2 }]} />
      </View>
      <Text style={[touch.time, { color: c.secondary }]}>{formatPlaybackTime(duration)}</Text>
    </View>
  );
}

// Holds the video in the same place in the tree for every device and orientation, so
// rotating the phone restyles the box instead of remounting (and restarting) the video.
export function CinemaPlayerStage({ stacked, video, overlay, panel }: { stacked: boolean; video: React.ReactNode; overlay?: React.ReactNode; panel?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={stacked ? touch.stackedVideo : StyleSheet.absoluteFill}>{video}{overlay}</View>
      {stacked && panel}
    </View>
  );
}

export interface CinemaTouchControlsProps extends Omit<CinemaPlayerProps, 'onSeek'> {
  /** Landscape: the overlay also carries the title and every action, because there is no panel. */
  immersive: boolean;
  onSeekBy: (delta: number) => void;
  onSeekTo: (position: number) => void;
  /** Called on every touch so the owner can restart its auto-hide timer. */
  onInteract?: () => void;
}
export function CinemaTouchControls(p: CinemaTouchControlsProps) {
  const act = (action: () => void) => () => { p.onInteract?.(); action(); };
  const edge = p.immersive ? 16 : 8;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable accessibilityRole="button" accessibilityLabel="隐藏控制栏" onPress={p.onHide} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.42)' }]} />
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, touch.center, { gap: p.immersive ? 44 : 30 }]}>
        <RoundButton label="快退 10 秒" icon={RotateCcw} onPress={act(() => p.onSeekBy(-SEEK_STEP))} />
        <RoundButton label={p.playing ? '暂停' : '播放'} icon={p.playing ? Pause : Play} primary size={p.immersive ? 64 : 54} onPress={act(p.onToggle)} />
        <RoundButton label="快进 10 秒" icon={RotateCw} onPress={act(() => p.onSeekBy(SEEK_STEP))} />
      </View>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'space-between', padding: edge }]}>
        <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <RoundButton label="返回影片" icon={ArrowLeft} size={40} onPress={p.onBack} />
          {p.immersive && <>
            <View pointerEvents="none" style={{ flex: 1, gap: 2 }}>
              <Text numberOfLines={1} style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{p.title}</Text>
              <Text numberOfLines={1} style={{ color: c.secondary, fontSize: 13 }}>{[p.episode, p.source].filter(Boolean).join(' / ')}</Text>
            </View>
            <TouchChip label={p.intro ? `片头 ${formatPlaybackTime(p.intro)}` : '设为片头'} icon={ArrowDownToDot} selected={!!p.intro} onPress={act(p.onIntro)} />
            <TouchChip label={p.outro ? `片尾 ${formatPlaybackTime(p.outro)}` : '设为片尾'} icon={ArrowUpFromDot} selected={!!p.outro} onPress={act(p.onOutro)} />
          </>}
        </View>
        <View pointerEvents="box-none" style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row' }}>
            <Scrubber position={p.position} duration={p.duration} onSeekTo={p.onSeekTo} onSeekBy={p.onSeekBy} onInteract={p.onInteract} />
          </View>
          {p.immersive && (
            <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <TouchChip label="下一集" icon={SkipForward} disabled={!p.hasNext} onPress={act(p.onNext)} />
              <View pointerEvents="box-none" style={{ flexDirection: 'row', gap: 8 }}>
                <TouchChip label="选集" icon={List} onPress={act(p.onEpisodes)} />
                <TouchChip label={`${p.rate}× 倍速`} icon={Gauge} onPress={act(p.onSpeed)} />
                <TouchChip label="换源" icon={Tv} onPress={act(p.onSources)} />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export interface CinemaTouchPanelProps {
  title: string; episode?: string; source?: string; rate: number; hasNext: boolean; intro: number; outro: number;
  episodes: string[]; episodeIndex: number;
  onEpisode: (index: number) => void; onNext: () => void; onSources: () => void; onSpeed: () => void; onIntro: () => void; onOutro: () => void;
}
// Portrait only: everything that does not need to sit on top of the picture.
export function CinemaTouchPanel(p: CinemaTouchPanelProps) {
  const { width } = useCinemaLayout();
  const gutter = 20, gap = 8;
  const columns = Math.max(5, Math.floor((width - gutter * 2 + gap) / (64 + gap)));
  const cell = Math.floor((width - gutter * 2 - gap * (columns - 1)) / columns);
  const half = width < 520;
  const pages = Math.ceil(p.episodes.length / EPISODE_PAGE);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(Math.max(0, Math.floor(p.episodeIndex / EPISODE_PAGE))); }, [p.episodeIndex]);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: gutter, gap: 18 }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 6 }}>
        <Text numberOfLines={2} style={{ color: c.text, fontSize: 22, lineHeight: 29, fontWeight: '700' }}>{p.title}</Text>
        <Text style={{ color: c.secondary, fontSize: 14 }}>{[p.episode, p.source].filter(Boolean).join(' / ')}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        <TouchChip solid half={half} label={`${p.rate}× 倍速`} icon={Gauge} onPress={p.onSpeed} />
        <TouchChip solid half={half} label="换源" icon={Tv} onPress={p.onSources} />
        <TouchChip solid half={half} label={p.intro ? `片头 ${formatPlaybackTime(p.intro)}` : '设为片头'} icon={ArrowDownToDot} selected={!!p.intro} onPress={p.onIntro} />
        <TouchChip solid half={half} label={p.outro ? `片尾 ${formatPlaybackTime(p.outro)}` : '设为片尾'} icon={ArrowUpFromDot} selected={!!p.outro} onPress={p.onOutro} />
      </View>
      <View style={{ paddingTop: 18, borderTopWidth: 1, borderColor: c.elevated, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, color: c.text, fontSize: 18, fontWeight: '600' }}>选集<Text style={{ color: c.secondary, fontSize: 14, fontWeight: '400' }}>　共 {p.episodes.length} 集</Text></Text>
          <TouchChip solid label="下一集" icon={SkipForward} disabled={!p.hasNext} onPress={p.onNext} />
        </View>
        {pages > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap }}>
            {Array.from({ length: pages }, (_, index) => (
              <TouchChip key={index} solid label={`${index * EPISODE_PAGE + 1}–${Math.min((index + 1) * EPISODE_PAGE, p.episodes.length)}`} selected={page === index} onPress={() => setPage(index)} />
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {p.episodes.slice(page * EPISODE_PAGE, (page + 1) * EPISODE_PAGE).map((title, offset) => {
            const index = page * EPISODE_PAGE + offset, current = index === p.episodeIndex;
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={title}
                accessibilityState={{ selected: current }}
                aria-selected={current}
                onPress={() => p.onEpisode(index)}
                style={({ pressed }) => [touch.episode, { width: cell, borderColor: current ? c.accent : 'transparent', opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={{ color: current ? c.accent : c.text, fontSize: 16, fontWeight: current ? '700' : '500' }}>{index + 1}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const touch = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5 },
  halfChip: { flexGrow: 1, flexBasis: '40%', justifyContent: 'center' },
  round: { alignItems: 'center', justifyContent: 'center' },
  center: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  time: { color: c.text, fontSize: 12, fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'center' },
  scrubber: { flex: 1, height: 32, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.28)' },
  thumb: { position: 'absolute', backgroundColor: c.focus },
  stackedVideo: { width: '100%', aspectRatio: 16 / 9, maxHeight: '45%', backgroundColor: '#000' },
  episode: { height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
});

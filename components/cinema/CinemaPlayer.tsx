import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowDownToDot, ArrowUpFromDot, EyeOff, FastForward, Gauge, List, Maximize, Minimize, Pause, Play, Rewind, RotateCcw, RotateCw, SkipForward, Sun, Tv, Volume2, VolumeX } from 'lucide-react-native';
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

// ---- Gestures on the picture: tap, double tap, vertical slides for brightness and volume, sideways slides to seek ----

/** Reads and sets a 0–1 level on the device, e.g. screen brightness or media volume. */
export interface LevelControl { get: () => Promise<number>; set: (value: number) => void }
/** Where the video is, in milliseconds, and a way to move it. */
export interface SeekControl { get: () => { position: number; duration: number }; to: (position: number) => void }
export interface SeekPreview { position: number; duration: number; delta: number }
export interface TouchGestureOptions {
  size: () => { width: number; height: number };
  onTap: () => void;
  onDoubleTap: () => void;
  /** Slide up or down on the left half. Omitted where the device cannot do it. */
  brightness?: LevelControl;
  /** Slide up or down on the right half. */
  volume?: LevelControl;
  /** The level being adjusted, for the on-screen indicator; null once the adjustment is over. */
  onLevel: (level: { kind: 'brightness' | 'volume'; value: number } | null) => void;
  /** Slide sideways to move through the video. Omitted where there is no timeline, e.g. a live stream. */
  seek?: SeekControl;
  /** Where a sideways slide would land, for the on-screen indicator; null once the finger lifts. */
  onSeeking?: (preview: SeekPreview | null) => void;
}
// Sliding across the whole picture moves two minutes: long enough to skip a scene, short enough to aim.
const DOUBLE_TAP_MS = 280, TAP_SLOP = 12, LEVEL_LINGER_MS = 700, LEVEL_MIN_TRAVEL = 320, SEEK_SPAN = 120000;
// Kept apart from the view so the rules can be tested without synthesising touch events.
export function createTouchGestures(options: () => TouchGestureOptions) {
  let mode: 'none' | 'ignored' | 'brightness' | 'volume' | 'seek' = 'none';
  let startX = 0, originDy = 0, base: number | null = null, last = -1;
  let seeking = { originDx: 0, from: 0, duration: 0, target: 0 };
  let single: ReturnType<typeof setTimeout> | null = null, linger: ReturnType<typeof setTimeout> | null = null;
  const clear = (timer: ReturnType<typeof setTimeout> | null) => { if (timer) clearTimeout(timer); };
  const finish = () => {
    if (mode === 'brightness' || mode === 'volume') { clear(linger); linger = setTimeout(() => { linger = null; options().onLevel(null); }, LEVEL_LINGER_MS); }
    if (mode === 'seek') options().onSeeking?.(null);
    mode = 'none'; base = null;
  };
  return {
    start(x: number) { mode = 'none'; startX = x; base = null; last = -1; },
    move(dx: number, dy: number) {
      if (mode === 'none') {
        // Mostly sideways and past the slop: a seek, where there is a loaded video to seek in.
        if (Math.abs(dy) < TAP_SLOP || Math.abs(dy) < Math.abs(dx)) {
          if (Math.abs(dx) < TAP_SLOP) return;
          const timeline = options().seek?.get();
          if (!timeline || !(timeline.duration > 0) || options().size().width <= 0) { mode = 'ignored'; return; }
          mode = 'seek'; seeking = { originDx: dx, from: timeline.position, duration: timeline.duration, target: timeline.position };
          return;
        }
        // Mostly vertical and past the slop: this is an adjustment, not a tap.
        const kind = startX < options().size().width / 2 ? 'brightness' : 'volume';
        const control = options()[kind];
        if (!control) { mode = 'ignored'; return; }
        mode = kind; originDy = dy;
        control.get().then(value => { if (mode === kind) base = Math.min(1, Math.max(0, value)); }).catch(() => { if (mode === kind) mode = 'ignored'; });
        return;
      }
      if (mode === 'seek') {
        // The video itself is only asked to move once, on release; until then this is a preview.
        const raw = seeking.from + ((dx - seeking.originDx) / options().size().width) * SEEK_SPAN;
        const target = Math.round(Math.min(seeking.duration, Math.max(0, raw)));
        if (target === seeking.target) return;
        seeking.target = target;
        options().onSeeking?.({ position: target, duration: seeking.duration, delta: target - seeking.from });
        return;
      }
      if ((mode !== 'brightness' && mode !== 'volume') || base === null) return;
      // The full height of the picture covers the whole range, but never less than LEVEL_MIN_TRAVEL:
      // the portrait video box is short, and a small slide there should not jump to an extreme.
      // Brightness stops just above black.
      const floor = mode === 'brightness' ? 0.01 : 0;
      const raw = base - (dy - originDy) / Math.max(LEVEL_MIN_TRAVEL, options().size().height);
      const value = Math.round(Math.min(1, Math.max(floor, raw)) * 100) / 100;
      if (value === last) return;
      last = value; clear(linger); linger = null;
      options()[mode]?.set(value); options().onLevel({ kind: mode, value });
    },
    end(dx: number, dy: number) {
      const tapped = mode === 'none' && Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP;
      if (mode === 'seek' && seeking.target !== seeking.from) options().seek?.to(seeking.target);
      finish();
      if (!tapped) return;
      // A lone tap waits a moment, so a second tap can turn it into a double tap instead.
      if (single) { clear(single); single = null; options().onDoubleTap(); }
      else single = setTimeout(() => { single = null; options().onTap(); }, DOUBLE_TAP_MS);
    },
    cancel() { finish(); },
    dispose() { clear(single); clear(linger); single = linger = null; },
  };
}

const signedSeconds = (milliseconds: number) => `${milliseconds < 0 ? '−' : '+'}${Math.round(Math.abs(milliseconds) / 1000)} 秒`;
export function CinemaTouchGestures(p: Omit<TouchGestureOptions, 'size' | 'onLevel' | 'onSeeking'> & {
  /** Replaces the spoken hint where taps mean something else, e.g. on a live stream. */
  hint?: string;
}) {
  const [level, setLevel] = useState<{ kind: 'brightness' | 'volume'; value: number } | null>(null);
  const [seeking, setSeeking] = useState<SeekPreview | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const latest = useRef(p);
  latest.current = p;
  const gestures = useMemo(() => createTouchGestures(() => ({ ...latest.current, size: () => size.current, onLevel: setLevel, onSeeking: setSeeking })), []);
  useEffect(() => gestures.dispose, [gestures]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => gestures.start(event.nativeEvent.locationX),
    onPanResponderMove: (_, gesture) => gestures.move(gesture.dx, gesture.dy),
    onPanResponderRelease: (_, gesture) => gestures.end(gesture.dx, gesture.dy),
    onPanResponderTerminate: () => gestures.cancel(),
  }), [gestures]);
  const Icon = level?.kind === 'brightness' ? Sun : level?.value === 0 ? VolumeX : Volume2;
  const SeekIcon = seeking && seeking.delta < 0 ? Rewind : FastForward;
  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel="视频画面"
      accessibilityHint={p.hint ?? `点一下显示或隐藏控制栏，双击暂停或播放；左侧上下滑调亮度，右侧上下滑调音量${p.seek ? '；左右滑动快进或快退' : ''}`}
      onAccessibilityTap={p.onTap}
      onLayout={event => { size.current = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height }; }}
      style={StyleSheet.absoluteFill}
    >
      {seeking ? (
        <View testID="seek-preview" pointerEvents="none" style={touch.level} accessibilityLiveRegion="polite">
          <SeekIcon size={18} color={c.text} strokeWidth={1.8} />
          <Text style={touch.time}>{`${formatPlaybackTime(seeking.position)} / ${formatPlaybackTime(seeking.duration)}`}</Text>
          <Text style={[touch.time, { color: c.accent }]}>{signedSeconds(seeking.delta)}</Text>
        </View>
      ) : level && (
        <View pointerEvents="none" style={touch.level} accessibilityLiveRegion="polite">
          <Icon size={18} color={c.text} strokeWidth={1.8} />
          <View style={touch.levelTrack}><View style={{ width: `${level.value * 100}%`, height: '100%', borderRadius: 2, backgroundColor: c.text }} /></View>
          <Text style={[touch.time, { minWidth: 36 }]}>{Math.round(level.value * 100)}%</Text>
        </View>
      )}
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
  /** Enters full screen from portrait and leaves it from landscape. Omitted where the screen cannot be turned. */
  onFullscreen?: () => void;
  /** The video is loading or buffering: the centre shows a spinner, because neither play nor pause describes it. */
  loading?: boolean;
}
export function CinemaTouchControls(p: CinemaTouchControlsProps) {
  const act = (action: () => void) => () => { p.onInteract?.(); action(); };
  const edge = p.immersive ? 16 : 8;
  return (
    // Empty areas let touches through to the gesture layer underneath, which hides the controls on a tap.
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.42)' }]} />
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, touch.center, { gap: p.immersive ? 44 : 30 }]}>
        <RoundButton label="快退 10 秒" icon={RotateCcw} onPress={act(() => p.onSeekBy(-SEEK_STEP))} />
        {p.loading
          ? <View accessible accessibilityRole="progressbar" accessibilityLabel="正在加载" style={[touch.round, { width: p.immersive ? 64 : 54, height: p.immersive ? 64 : 54, borderRadius: 32, backgroundColor: scrim }]}><ActivityIndicator color={c.text} /></View>
          : <RoundButton label={p.playing ? '暂停' : '播放'} icon={p.playing ? Pause : Play} primary size={p.immersive ? 64 : 54} onPress={act(p.onToggle)} />}
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
          <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Scrubber position={p.position} duration={p.duration} onSeekTo={p.onSeekTo} onSeekBy={p.onSeekBy} onInteract={p.onInteract} />
            {p.onFullscreen && <RoundButton label={p.immersive ? '退出全屏' : '全屏'} icon={p.immersive ? Minimize : Maximize} size={36} onPress={act(p.onFullscreen)} />}
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
  level: { position: 'absolute', top: 14, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(16,18,20,0.78)' },
  levelTrack: { width: 110, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.28)' },
  episode: { height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
});

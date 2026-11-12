import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import PlayScreen from '@/app/play';
import { PlayerControls, TouchPlayerControls, TouchPlayerPanel } from '@/components/PlayerControls';
import { CinemaTouchPanel } from '@/components/cinema/CinemaPlayer';
import { Text } from 'react-native';
import { CinemaShell, CinemaTabBar } from '@/components/cinema/CinemaUI';

// Layout and player state are driven by hand so each test can rotate the phone or show the controls.
const layout = { deviceType: 'mobile', isPortrait: true };
const windowSize = { width: 390, height: 844, scale: 2, fontScale: 1 };
const player: Record<string, unknown> = {};
let videoMounts = 0;

jest.mock('@/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => windowSize }));
jest.mock('@/stores/playerStore', () => ({
  __esModule: true,
  default: (selector?: (state: unknown) => unknown) => (selector ? selector(player) : player),
  selectCurrentEpisode: (state: { episode: unknown }) => state.episode,
}));
jest.mock('@/stores/detailStore', () => ({ __esModule: true, default: () => ({ detail: { id: 1, source: 'test', title: '测试影片', poster: '' } }) }));
jest.mock('@/services/storage', () => ({ PlayRecordManager: {}, PlayerSettingsManager: {} }));
jest.mock('expo-av', () => {
  const { useEffect } = jest.requireActual('react');
  return { ResizeMode: { CONTAIN: 'contain' }, Video: () => { useEffect(() => { videoMounts += 1; }, []); return null; } };
});
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }), useLocalSearchParams: () => ({ episodeIndex: '0', source: 'test', id: '1', title: '测试影片' }) }));
jest.mock('react-native-toast-message', () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock('@/hooks/useTVRemoteHandler', () => ({ useTVRemoteHandler: () => ({ onScreenPress: jest.fn(), resetTimer: jest.fn() }) }));
jest.mock('@/hooks/useVideoHandlers', () => ({ useVideoHandlers: () => ({ videoProps: {} }) }));
jest.mock('@/components/PlayerControls', () => ({ PlayerControls: () => null, TouchPlayerControls: () => null, TouchPlayerPanel: () => null }));
jest.mock('@/components/EpisodeSelectionModal', () => ({ EpisodeSelectionModal: () => null }));
jest.mock('@/components/SourceSelectionModal', () => ({ SourceSelectionModal: () => null }));
jest.mock('@/components/SpeedSelectionModal', () => ({ SpeedSelectionModal: () => null }));
jest.mock('@/components/SeekingBar', () => ({ SeekingBar: () => null }));
jest.mock('@/components/VideoLoadingAnimation', () => ({ __esModule: true, default: () => null }));

describe('play screen on touch devices', () => {
  let tree: ReactTestRenderer;
  const count = (type: React.ComponentType<any>) => tree.root.findAllByType(type).length;
  const set = (next: { deviceType?: string; isPortrait?: boolean; showControls?: boolean }) => act(() => {
    if (next.deviceType !== undefined) layout.deviceType = next.deviceType;
    if (next.isPortrait !== undefined) layout.isPortrait = next.isPortrait;
    if (next.showControls !== undefined) player.showControls = next.showControls;
    tree.update(<PlayScreen />);
  });
  beforeEach(async () => {
    videoMounts = 0;
    Object.assign(layout, { deviceType: 'mobile', isPortrait: true });
    Object.assign(player, {
      isLoading: false, showControls: false, initialPosition: 0, playbackRate: 1, episode: { url: 'https://example.test/1.m3u8', title: '第 1 集' },
      setVideoRef: jest.fn(), handlePlaybackStatusUpdate: jest.fn(), setShowControls: jest.fn(), reset: jest.fn(), loadVideo: jest.fn(),
    });
    await act(async () => { tree = create(<PlayScreen />); });
  });
  afterEach(() => act(() => tree.unmount()));

  test('portrait phone shows the episode panel under the video', () => {
    expect(count(TouchPlayerPanel)).toBe(1);
    expect(count(TouchPlayerControls)).toBe(0);
    expect(count(PlayerControls)).toBe(0);
  });

  test('showing controls on a phone uses the touch layer, never the TV overlay', () => {
    set({ showControls: true });
    expect(tree.root.findByType(TouchPlayerControls).props.immersive).toBe(false);
    expect(count(PlayerControls)).toBe(0);
  });

  test('landscape phone drops the panel and moves every action into the overlay', () => {
    set({ showControls: true, isPortrait: false });
    expect(count(TouchPlayerPanel)).toBe(0);
    expect(tree.root.findByType(TouchPlayerControls).props.immersive).toBe(true);
  });

  test('rotating, and crossing into the TV layout, never remounts the video', () => {
    set({ isPortrait: false });
    set({ isPortrait: true, showControls: true });
    set({ deviceType: 'tv', isPortrait: false });
    expect(count(PlayerControls)).toBe(1);
    expect(count(TouchPlayerControls)).toBe(0);
    expect(count(TouchPlayerPanel)).toBe(0);
    expect(videoMounts).toBe(1);
  });
});

describe('portrait episode panel', () => {
  const episodes = Array.from({ length: 42 }, (_, index) => `第 ${index + 1} 集`);
  const handlers = () => ({ onEpisode: jest.fn(), onNext: jest.fn(), onSources: jest.fn(), onSpeed: jest.fn(), onIntro: jest.fn(), onOutro: jest.fn() });
  const render = (props: Partial<React.ComponentProps<typeof CinemaTouchPanel>>, h = handlers()) => {
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<CinemaTouchPanel title="测试影片" rate={1} hasNext intro={0} outro={0} episodes={episodes} episodeIndex={2} {...h} {...props} />); });
    const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
    return { tree, button, h };
  };

  test('opens on the page that holds the current episode and reports the absolute index', () => {
    const { button, h } = render({ episodeIndex: 35 });
    expect(button('第 36 集').props.accessibilityState.selected).toBe(true);
    expect(button('第 1 集')).toBeUndefined();
    act(() => button('第 40 集').props.onPress());
    expect(h.onEpisode).toHaveBeenCalledWith(39);
  });

  test('range tabs switch pages', () => {
    const { button } = render({ episodeIndex: 2 });
    expect(button('第 31 集')).toBeUndefined();
    act(() => button('31–42').props.onPress());
    expect(button('第 31 集')).toBeDefined();
    expect(button('第 3 集')).toBeUndefined();
  });

  test('next episode is disabled on the last episode', () => {
    expect(render({ hasNext: false }).button('下一集').props.accessibilityState.disabled).toBe(true);
  });
});

describe('playerStore.seekTo', () => {
  const realStore = jest.requireActual('@/stores/playerStore').default;
  const setPositionAsync = jest.fn(async () => {});
  beforeEach(() => {
    setPositionAsync.mockClear();
    realStore.setState({ videoRef: { current: { setPositionAsync } }, status: { isLoaded: true, positionMillis: 30000, durationMillis: 100000 } });
  });
  afterEach(() => clearTimeout(realStore.getState()._seekTimeout));

  test('seeks to an absolute position and previews it while the video catches up', async () => {
    await realStore.getState().seekTo(60000);
    expect(setPositionAsync).toHaveBeenCalledWith(60000);
    expect(realStore.getState().isSeeking).toBe(true);
    expect(realStore.getState().seekPosition).toBeCloseTo(0.6);
  });

  test('clamps to the start and the end', async () => {
    await realStore.getState().seekTo(-5000);
    expect(setPositionAsync).toHaveBeenLastCalledWith(0);
    await realStore.getState().seekTo(250000);
    expect(setPositionAsync).toHaveBeenLastCalledWith(100000);
  });

  test('relative seek still steps from the current position', async () => {
    await realStore.getState().seek(-20000);
    expect(setPositionAsync).toHaveBeenLastCalledWith(10000);
  });
});

describe('phone navigation', () => {
  const render = (size: { width: number; height: number }, active?: 'home' | 'search' | 'settings') => {
    Object.assign(windowSize, size);
    const onNavigate = jest.fn(), onBack = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<CinemaShell active={active} onNavigate={onNavigate} onBack={onBack}><Text>content</Text></CinemaShell>); });
    const buttons = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
    return { tree, buttons, onNavigate };
  };
  afterEach(() => { Object.assign(windowSize, { width: 390, height: 844 }); });

  test('portrait: search bar on top, destinations in the bottom tab bar', () => {
    const { tree, buttons, onNavigate } = render({ width: 390, height: 844 }, 'home');
    const tabs = tree.root.findByType(CinemaTabBar);
    // A Pressable shows up as both a composite and a host node, so labels are de-duplicated.
    const labels = tabs.findAll(node => typeof node.props.onPress === 'function' && !!node.props.accessibilityLabel).map(node => node.props.accessibilityLabel);
    expect([...new Set(labels)]).toEqual(['首页', '直播', '收藏', '设置']);
    expect(buttons('返回')).toHaveLength(0);
    act(() => buttons('搜索')[0].props.onPress());
    expect(onNavigate).toHaveBeenCalledWith('search');
    act(() => buttons('设置')[0].props.onPress());
    expect(onNavigate).toHaveBeenLastCalledWith('settings');
  });

  test('portrait: pushed pages get a back button and no tab bar', () => {
    for (const active of ['search', undefined] as const) {
      const { tree, buttons } = render({ width: 390, height: 844 }, active);
      expect(tree.root.findAllByType(CinemaTabBar)).toHaveLength(0);
      expect(buttons('返回').length).toBeGreaterThan(0);
    }
  });

  test('landscape phone and wide screens keep navigation in the top row', () => {
    for (const size of [{ width: 844, height: 390 }, { width: 1440, height: 900 }]) {
      const { tree, buttons } = render(size, 'home');
      expect(tree.root.findAllByType(CinemaTabBar)).toHaveLength(0);
      for (const label of ['首页', '直播', '收藏', '搜索', '设置']) expect(buttons(label).length).toBeGreaterThan(0);
    }
  });
});

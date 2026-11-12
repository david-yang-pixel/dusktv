import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import PlayScreen from '@/app/play';
import { PlayerControls, TouchPlayerControls, TouchPlayerPanel } from '@/components/PlayerControls';
import { CinemaTouchControls, CinemaTouchPanel } from '@/components/cinema/CinemaPlayer';
import * as ScreenOrientation from 'expo-screen-orientation';
import { FlatList, Text } from 'react-native';
import CinemaHome from '@/components/home/CinemaHome';
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
const mockRouterBack = jest.fn();
jest.mock('expo-screen-orientation', () => ({ lockAsync: jest.fn(async () => {}), unlockAsync: jest.fn(async () => {}), OrientationLock: { LANDSCAPE: 'LANDSCAPE', PORTRAIT_UP: 'PORTRAIT_UP' } }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockRouterBack }), useLocalSearchParams: () => ({ episodeIndex: '0', source: 'test', id: '1', title: '测试影片' }) }));
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
    jest.clearAllMocks();
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

describe('full screen on touch devices', () => {
  let tree: ReactTestRenderer;
  const lock = ScreenOrientation.lockAsync as jest.Mock, unlock = ScreenOrientation.unlockAsync as jest.Mock;
  const controls = () => tree.root.findByType(TouchPlayerControls).props;
  const rotate = (isPortrait: boolean) => act(() => { layout.isPortrait = isPortrait; tree.update(<PlayScreen />); });
  beforeEach(async () => {
    jest.clearAllMocks();
    Object.assign(layout, { deviceType: 'mobile', isPortrait: true });
    Object.assign(player, {
      isLoading: false, showControls: true, initialPosition: 0, playbackRate: 1, episode: { url: 'https://example.test/1.m3u8', title: '第 1 集' },
      setVideoRef: jest.fn(), handlePlaybackStatusUpdate: jest.fn(), setShowControls: jest.fn(), reset: jest.fn(), loadVideo: jest.fn(),
    });
    await act(async () => { tree = create(<PlayScreen />); });
  });
  afterEach(() => act(() => tree.unmount()));

  test('the button turns the screen to landscape from portrait and back again', async () => {
    await act(async () => controls().onFullscreen());
    expect(lock).toHaveBeenLastCalledWith('LANDSCAPE');
    rotate(false);
    await act(async () => controls().onFullscreen());
    expect(lock).toHaveBeenLastCalledWith('PORTRAIT_UP');
  });

  test('back leaves full screen first when the button entered it, then leaves the player', async () => {
    await act(async () => controls().onFullscreen());
    rotate(false);
    await act(async () => controls().onBack());
    expect(lock).toHaveBeenLastCalledWith('PORTRAIT_UP');
    expect(mockRouterBack).not.toHaveBeenCalled();
    rotate(true);
    await act(async () => controls().onBack());
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  test('back leaves the player directly when the phone was simply turned sideways', async () => {
    rotate(false);
    await act(async () => controls().onBack());
    expect(lock).not.toHaveBeenCalled();
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  test('leaving the player hands rotation back to the system', () => {
    act(() => tree.unmount());
    expect(unlock).toHaveBeenCalledTimes(1);
    act(() => { tree = create(<PlayScreen />); });
  });
});

describe('touch controls', () => {
  const base = { title: '测试影片', playing: false, position: 0, duration: 60000, rate: 1, hasNext: true, intro: 0, outro: 0, onBack: jest.fn(), onToggle: jest.fn(), onNext: jest.fn(), onSeekBy: jest.fn(), onSeekTo: jest.fn(), onEpisodes: jest.fn(), onSources: jest.fn(), onSpeed: jest.fn(), onIntro: jest.fn(), onOutro: jest.fn(), onHide: jest.fn() };
  const labels = (props: Partial<React.ComponentProps<typeof CinemaTouchControls>>) => {
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<CinemaTouchControls {...base} immersive={false} {...props} />); });
    return new Set(tree.root.findAll(node => typeof node.props.onPress === 'function' && !!node.props.accessibilityLabel).map(node => node.props.accessibilityLabel));
  };

  test('offers full screen in portrait and the way out in landscape', () => {
    expect(labels({ onFullscreen: jest.fn() }).has('全屏')).toBe(true);
    const landscape = labels({ immersive: true, onFullscreen: jest.fn() });
    expect(landscape.has('退出全屏')).toBe(true);
    expect(landscape.has('全屏')).toBe(false);
  });

  test('hides the button where the screen cannot be turned', () => {
    const without = labels({});
    expect(without.has('全屏')).toBe(false);
    expect(without.has('退出全屏')).toBe(false);
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

describe('phone home', () => {
  const movies = Array.from({ length: 8 }, (_, index) => ({ id: String(index), source: 'test', title: `影片 ${index + 1}`, poster: '' }));
  const category = { title: '电影', type: 'movie' as const };
  const render = (size: { width: number; height: number }, items = movies) => {
    Object.assign(windowSize, size);
    const onLoadMore = jest.fn(), onOpen = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<CinemaHome categories={[category]} selectedCategory={category} items={items} loading={false} loadingMore={false} isLoggedIn
        onCategorySelect={jest.fn()} onTagSelect={jest.fn()} onOpen={onOpen} onRemoveRecord={jest.fn()} onLoadMore={onLoadMore} onRetry={jest.fn()} onNavigate={jest.fn()} onLogout={jest.fn()} imageUrl={url => url} />);
    });
    const posters = () => tree.root.findAllByType(FlatList).find(list => list.props.testID === 'home-posters');
    return { tree, posters, onLoadMore, onOpen };
  };
  afterEach(() => { Object.assign(windowSize, { width: 390, height: 844 }); });

  test('portrait: posters are a vertical two-column feed that loads more at the end', () => {
    const { tree, posters, onLoadMore, onOpen } = render({ width: 390, height: 844 });
    const list = posters()!;
    expect(list.props.horizontal).toBeFalsy();
    expect(list.props.numColumns).toBe(2);
    expect(list.props.data).toHaveLength(8);
    act(() => list.props.onEndReached());
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    act(() => tree.root.findAll(node => node.props.accessibilityLabel === '影片 3' && typeof node.props.onPress === 'function')[0].props.onPress());
    expect(onOpen).toHaveBeenCalledWith(movies[2]);
  });

  test('portrait: the feature and categories scroll with the feed, and an empty category says so', () => {
    const filled = render({ width: 390, height: 844 });
    expect(filled.posters()!.findAllByProps({ testID: 'home-feature' }).length).toBeGreaterThan(0);
    expect(filled.posters()!.findAllByProps({ testID: 'home-categories' }).length).toBeGreaterThan(0);
    const empty = render({ width: 390, height: 844 }, []);
    expect(empty.tree.root.findAllByProps({ children: '下一部好片，等你发现' }).length).toBeGreaterThan(0);
    expect(empty.tree.root.findAllByProps({ testID: 'home-categories' }).length).toBeGreaterThan(0);
  });

  test('landscape phone and wide screens keep the single horizontal row', () => {
    for (const size of [{ width: 844, height: 390 }, { width: 1440, height: 900 }]) {
      const list = render(size).posters()!;
      expect(list.props.horizontal).toBe(true);
      expect(list.props.numColumns ?? 1).toBe(1);
    }
  });
});

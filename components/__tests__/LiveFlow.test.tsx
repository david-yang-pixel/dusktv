import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Platform } from 'react-native';
import LiveScreen from '@/app/live';
import CinemaLive from '@/components/cinema/CinemaLive';
import LivePlayer from '@/components/LivePlayer';
import { CinemaTouchGestures } from '@/components/cinema/CinemaPlayer';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import { Video } from 'expo-av';

// The test environment has no TV event emitter to subscribe to.
jest.mock('react-native/Libraries/Components/TV/useTVEventHandler', () => jest.fn());
jest.mock('@/components/cinema/CinemaLive', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/useCinemaNavigation', () => ({ useCinemaNavigation: () => ({ onNavigate: jest.fn(), onBack: jest.fn() }) }));
jest.mock('@/stores/settingsStore', () => ({ useSettingsStore: () => ({ m3uUrl: 'https://example.test/list.m3u' }) }));
jest.mock('@/services/m3u', () => ({
  fetchAndParseM3u: jest.fn(async () => [{ id: '1', name: '频道一', url: 'https://example.test/1.m3u8', logo: '', group: '新闻' }]),
  getPlayableUrl: (url: string | null) => url,
}));
jest.mock('expo-av', () => ({ ResizeMode: { CONTAIN: 'contain' }, Video: () => null }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-screen-orientation', () => ({ lockAsync: jest.fn(async () => {}), unlockAsync: jest.fn(async () => {}), OrientationLock: { LANDSCAPE: 'LANDSCAPE', PORTRAIT_UP: 'PORTRAIT_UP' } }));
jest.mock('expo-brightness', () => ({ getBrightnessAsync: jest.fn(async () => 0.4), setBrightnessAsync: jest.fn(async () => {}), restoreSystemBrightnessAsync: jest.fn(async () => {}) }));
jest.mock('react-native-volume-manager', () => ({ VolumeManager: { getVolume: jest.fn(async () => ({ volume: 0.5 })), setVolume: jest.fn(async () => {}) } }));

const lock = ScreenOrientation.lockAsync as jest.Mock, unlock = ScreenOrientation.unlockAsync as jest.Mock;
const restoreBrightness = Brightness.restoreSystemBrightnessAsync as jest.Mock;
const setTV = (value: boolean) => Object.defineProperty(Platform, 'isTV', { configurable: true, get: () => value });

describe('live full screen', () => {
  let tree: ReactTestRenderer;
  const props = () => tree.root.findByType(CinemaLive).props;
  const gestures = () => props().player.props.gestures;
  const open = async () => { await act(async () => { tree = create(<LiveScreen />); }); };
  beforeEach(() => { jest.clearAllMocks(); setTV(false); });
  afterEach(() => { act(() => tree.unmount()); setTV(false); });

  test('on a phone it turns the screen sideways, and hands rotation back on the way out', async () => {
    await open();
    expect(lock).not.toHaveBeenCalled();
    await act(async () => props().onFullscreen(true));
    expect(props().fullscreen).toBe(true);
    expect(lock).toHaveBeenLastCalledWith('LANDSCAPE');
    expect(unlock).not.toHaveBeenCalled();
    await act(async () => props().onFullscreen(false));
    expect(unlock).toHaveBeenCalledTimes(1);
  });

  test('leaving the page while full screen hands rotation back too', async () => {
    await open();
    await act(async () => props().onFullscreen(true));
    act(() => tree.unmount());
    expect(unlock).toHaveBeenCalledTimes(1);
    await open();
  });

  test('full screen adds the brightness slide, and the system brightness returns afterwards', async () => {
    await open();
    expect(gestures()).toBeUndefined();
    await act(async () => props().onFullscreen(true));
    expect(gestures().type).toBe(CinemaTouchGestures);
    expect(await gestures().props.brightness.get()).toBe(0.4);
    gestures().props.brightness.set(0.9);
    expect(Brightness.setBrightnessAsync).toHaveBeenCalledWith(0.9);
    // A live stream has no timeline to slide through.
    expect(gestures().props.seek).toBeUndefined();
    expect(restoreBrightness).not.toHaveBeenCalled();
    await act(async () => props().onFullscreen(false));
    expect(restoreBrightness).toHaveBeenCalledTimes(1);
    expect(gestures()).toBeUndefined();
  });

  test('a TV keeps its full screen as it was: no rotation and no touch gestures', async () => {
    setTV(true);
    await open();
    await act(async () => props().onFullscreen(true));
    expect(props().fullscreen).toBe(true);
    expect(lock).not.toHaveBeenCalled();
    expect(gestures()).toBeUndefined();
  });
});

describe('live player', () => {
  const marker = <CinemaTouchGestures onTap={() => {}} onDoubleTap={() => {}} />;
  const render = () => {
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<LivePlayer streamUrl="https://example.test/1.m3u8" channelTitle="频道一" onPlaybackStatusUpdate={() => {}} gestures={marker} />); });
    return tree;
  };

  test('gestures sit over the picture', () => {
    const tree = render();
    expect(tree.root.findAllByType(CinemaTouchGestures)).toHaveLength(1);
    act(() => tree.unmount());
  });

  test('a channel that failed drops the gesture layer, so its reconnect button can be tapped', () => {
    const tree = render();
    act(() => tree.root.findByType(Video).props.onError());
    expect(tree.root.findAll(node => node.props.accessibilityLabel === '重新连接' && typeof node.props.onPress === 'function').length).toBeGreaterThan(0);
    expect(tree.root.findAllByType(CinemaTouchGestures)).toHaveLength(0);
    act(() => tree.unmount());
  });
});

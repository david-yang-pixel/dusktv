import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StatusBar, useTVEventHandler } from 'react-native';
import CinemaLive from '@/components/cinema/CinemaLive';
import LivePlayer from '@/components/LivePlayer';
import { CinemaTouchGestures } from '@/components/cinema/CinemaPlayer';
import { loadScreenOrientation, restoreBrightness, useLevelControls } from '@/hooks/useTouchPlayerDevice';
import { isTouchDevice } from '@/utils/DeviceUtils';
import { useCinemaNavigation } from '@/hooks/useCinemaNavigation';
import { fetchAndParseM3u, getPlayableUrl, Channel } from '@/services/m3u';
import { useSettingsStore } from '@/stores/settingsStore';
const ignore = () => {};
export default function LiveScreen() {
  const navigation = useCinemaNavigation();
  const { m3uUrl } = useSettingsStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [index, setIndex] = useState(0);
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [retry, setRetry] = useState(0);
  // 触摸设备上的全屏：转成横屏并隐藏状态栏，画面上可以上下滑调亮度和音量。TV 上的全屏保持原样
  const touch = isTouchDevice();
  const screenOrientation = useMemo(loadScreenOrientation, []);
  const levels = useLevelControls();
  useEffect(() => {
    if (!fullscreen || !touch || !screenOrientation) return;
    screenOrientation.lockAsync(screenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    // 退出全屏或离开直播页时，把屏幕方向和亮度都交还给系统
    return () => { screenOrientation.unlockAsync().catch(() => {}); restoreBrightness(); };
  }, [fullscreen, touch, screenOrientation]);
  // 直播没有进度可拖，点一下画面也没有控制栏可显示，这里只用得上亮度和音量
  const gestures = fullscreen && touch
    ? <CinemaTouchGestures onTap={ignore} onDoubleTap={ignore} brightness={levels.brightness} volume={levels.volume} hint="左侧上下滑调亮度，右侧上下滑调音量" />
    : undefined;
  useEffect(() => {
    let active = true;
    setChannels([]); setIndex(0); setGroup(''); setFullscreen(false);
    if (!m3uUrl) { setLoading(false); return; }
    setLoading(true);
    fetchAndParseM3u(m3uUrl).then(items => { if (active) { setChannels(items); setGroup(items[0]?.group || '其他'); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [m3uUrl, retry]);
  useEffect(() => {
    if (!fullscreen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setFullscreen(false); return true; });
    return () => subscription.remove();
  }, [fullscreen]);
  useTVEventHandler(useCallback(event => {
    if (!fullscreen || !channels.length || event.eventKeyAction === 1) return;
    if (event.eventType === 'down') setFullscreen(false);
    if (event.eventType === 'left') setIndex(value => (value - 1 + channels.length) % channels.length);
    if (event.eventType === 'right') setIndex(value => (value + 1) % channels.length);
  }, [fullscreen, channels.length]));
  const current = channels[index];
  return <>
    {fullscreen && touch && <StatusBar hidden />}
    <CinemaLive {...navigation} channels={channels} selectedId={current?.id} group={group} onGroup={setGroup}
    onSelect={channel => { const next = channels.findIndex(item => item.id === channel.id); if (next >= 0) setIndex(next); }} loading={loading} configured={!!m3uUrl}
    error={m3uUrl && !channels.length ? '无法读取频道，请检查直播源地址及网络连接。' : undefined} onRetry={() => setRetry(value => value + 1)} fullscreen={fullscreen} onFullscreen={setFullscreen}
    player={<LivePlayer streamUrl={getPlayableUrl(current?.url || null)} channelTitle={current?.name || null} onPlaybackStatusUpdate={ignore} gestures={gestures} />} />
  </>;
}

/* eslint-env browser */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import CinemaHome from '../components/home/CinemaHome';
import CinemaSearch from '../components/cinema/CinemaSearch';
import CinemaDetail from '../components/cinema/CinemaDetail';
import CinemaLibrary from '../components/cinema/CinemaLibrary';
import CinemaSettings from '../components/cinema/CinemaSettings';
import CinemaLive from '../components/cinema/CinemaLive';
import ConnectedPlayer from './ConnectedPlayer';
import BrowserVideo from './BrowserVideo';
import CinemaChoiceDialog from '../components/cinema/CinemaChoiceDialog';
import { CinemaPlayerStage, CinemaTouchControls, CinemaTouchPanel } from '../components/cinema/CinemaPlayer';
import CinemaLogin from '../components/cinema/CinemaLogin';
import CinemaUpdate from '../components/cinema/CinemaUpdate';
import { CinemaButton, CinemaDialog } from '../components/cinema/CinemaUI';
import { movies, categories } from './fixtures';

const demoVideo = 'https://developer.mozilla.org/shared-assets/videos/flower.mp4';
const readSaved = (key, fallback) => { try { return JSON.parse(localStorage.getItem(`dusktv-preview-${key}`)) ?? fallback; } catch { return fallback; } };
const saveDemo = (key, value) => { try { localStorage.setItem(`dusktv-preview-${key}`, JSON.stringify(value)); } catch {} };
const routeFromLocation = () => location.hash.slice(1) || 'home';
const demoChannels = [
  { id: 'nature', name: '自然纪实', group: '纪实' }, { id: 'travel', name: '旅行风景', group: '纪实' }, { id: 'cinema', name: '电影频道', group: '影视' }, { id: 'culture', name: '人文频道', group: '文化' },
];
export function usePreviewKeyboard() {
  useEffect(() => {
    function navigate(event) {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      if (event.defaultPrevented || event.target.closest?.('.dusk-player')) return;
      if (document.activeElement?.tagName === 'INPUT' && !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const scope = [...document.querySelectorAll('[aria-modal="true"]')].at(-1) || document;
      const buttons = [...scope.querySelectorAll('[role="button"]:not([aria-disabled="true"]),input')].filter(el => el.getBoundingClientRect().width > 0 && !el.closest('[aria-hidden="true"]'));
      const current = document.activeElement;
      if (!buttons.includes(current)) { buttons[0]?.focus(); event.preventDefault(); return; }
      const origin = current.getBoundingClientRect();
      const ox = origin.left + origin.width / 2, oy = origin.top + origin.height / 2;
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key), positive = ['ArrowRight', 'ArrowDown'].includes(event.key);
      const candidates = buttons.filter(el => el !== current).map(el => {
        const r = el.getBoundingClientRect(); const dx = r.left + r.width / 2 - ox, dy = r.top + r.height / 2 - oy;
        return { el, r, main: horizontal ? dx : dy, cross: horizontal ? dy : dx, score: Math.abs(horizontal ? dx : dy) + Math.abs(horizontal ? dy : dx) * 3 };
      }).filter(({ main, cross, r }) => (positive ? main > 10 : main < -10) && (!horizontal || Math.abs(cross) < Math.max(origin.height, r.height) * 0.6));
      candidates.sort((a, b) => a.score - b.score);
      if (candidates[0]) { candidates[0].el.focus(); candidates[0].el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); }
      event.preventDefault();
    }
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, []);
}
function DemoPlayer({ movie, onBack }) {
  const [preferences, setPreferences] = useState({ rate: 1, intro: 0, outro: 0 });
  const item = { ...movie, source: 'demo', sourceName: '公共测试片段，非影片正片', episodes: [`公共测试片段$${demoVideo}`] };
  const sources = [item, { ...item, source: 'demo-2', sourceName: '演示线路 2' }];
  return <ConnectedPlayer item={item} sources={sources} onBack={onBack} onRecord={() => {}} preferences={preferences} onPreferences={setPreferences} direct />;
}
// The phone player layer from the native app, driven by a plain <video> so its layout and
// gestures can be checked in a browser. Route: #touch-play/<id>
const demoEpisodes = Array.from({ length: 42 }, (_, index) => `第 ${index + 1} 集`);
const demoSources = ['演示片源 1', '演示片源 2'];
const demoRates = [0.75, 1, 1.25, 1.5, 2];
function DemoTouchPlayer({ movie, onBack }) {
  const { width, height } = useWindowDimensions();
  const stacked = height >= width;
  const video = useRef(null), timer = useRef(null);
  const [status, setStatus] = useState({ position: 0, duration: 0, playing: false });
  const [visible, setVisible] = useState(true), [dialog, setDialog] = useState('');
  const [episode, setEpisode] = useState(2), [source, setSource] = useState(0), [rate, setRate] = useState(1), [intro, setIntro] = useState(0), [outro, setOutro] = useState(0);
  const report = () => { const el = video.current; if (el) setStatus({ position: el.currentTime * 1000, duration: Number.isFinite(el.duration) ? el.duration * 1000 : 0, playing: !el.paused && !el.ended }); };
  const keepAlive = () => { clearTimeout(timer.current); timer.current = setTimeout(() => { if (!video.current?.paused) setVisible(false); }, 5000); };
  useEffect(() => { if (visible && !dialog) keepAlive(); return () => clearTimeout(timer.current); }, [visible, dialog]);
  useEffect(() => { if (video.current) video.current.playbackRate = rate; }, [rate]);
  const seekTo = position => { const el = video.current; if (el && Number.isFinite(el.duration)) { el.currentTime = Math.min(el.duration, Math.max(0, position / 1000)); report(); } };
  const shared = {
    title: movie.title, episode: demoEpisodes[episode], source: demoSources[source], rate, intro, outro, hasNext: episode < demoEpisodes.length - 1,
    onNext: () => setEpisode(value => Math.min(demoEpisodes.length - 1, value + 1)), onSources: () => setDialog('sources'), onSpeed: () => setDialog('speed'),
    onIntro: () => setIntro(intro ? 0 : status.position), onOutro: () => setOutro(outro ? 0 : Math.max(0, status.duration - status.position)),
  };
  // The app locks the screen orientation; a browser can only do that from its own full-screen mode.
  const toggleFullscreen = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen?.().then(() => window.screen.orientation?.lock?.('landscape')).catch(() => {}); };
  const options = { episodes: demoEpisodes, sources: demoSources, speed: demoRates.map(value => `${value}×`) }[dialog] || [];
  const selected = { episodes: episode, sources: source, speed: demoRates.indexOf(rate) }[dialog];
  const picture = <View style={StyleSheet.absoluteFill}>
    <video ref={video} src={demoVideo} playsInline loop muted preload="auto" onLoadedMetadata={report} onTimeUpdate={report} onPlay={report} onPause={report} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
    <Pressable accessibilityRole="button" accessibilityLabel="显示控制栏" disabled={visible} onPress={() => setVisible(true)} style={StyleSheet.absoluteFill} />
  </View>;
  return <>
    <CinemaPlayerStage stacked={stacked} video={picture}
      overlay={visible && <CinemaTouchControls {...shared} immersive={!stacked} playing={status.playing} position={status.position} duration={status.duration} onInteract={keepAlive}
        onBack={onBack} onToggle={() => { const el = video.current; if (!el) return; if (el.paused) el.play(); else el.pause(); }} onSeekBy={delta => seekTo(status.position + delta)} onSeekTo={seekTo} onEpisodes={() => setDialog('episodes')} onHide={() => setVisible(false)} onFullscreen={toggleFullscreen} />}
      panel={<CinemaTouchPanel {...shared} episodes={demoEpisodes} episodeIndex={episode} onEpisode={setEpisode} />} />
    <CinemaChoiceDialog visible={!!dialog} title={{ episodes: '选择剧集', sources: '选择播放源', speed: '播放速度' }[dialog] || ''} options={options.map((label, index) => ({ value: String(index), label }))} selected={String(selected)} onClose={() => setDialog('')}
      onSelect={value => { const index = Number(value); if (dialog === 'episodes') setEpisode(index); else if (dialog === 'sources') setSource(index); else setRate(demoRates[index]); setDialog(''); }} />
  </>;
}
export default function Preview() {
  usePreviewKeyboard();
  const [route, setRoute] = useState(routeFromLocation);
  const [category, setCategory] = useState(categories[5]);
  const [notice, setNotice] = useState('');
  const [records, setRecords] = useState(movies.slice(0, 3).map((item, index) => ({ ...item, progress: 0.2 + index * 0.22, episodeIndex: 1, play_time: 1200 })));
  const [keyword, setKeyword] = useState(''), [submitted, setSubmitted] = useState('');
  const [history, setHistory] = useState(() => readSaved('history', ['沙丘', '星际穿越', '千与千寻']));
  const [favoriteIds, setFavoriteIds] = useState(() => readSaved('favorites', ['interstellar', 'spirited', 'love']));
  const [settings, setSettings] = useState(() => readSaved('settings', { api: '', m3u: '', remote: false }));
  const [dirty, setDirty] = useState(false), [loggedIn, setLoggedIn] = useState(false), [username, setUsername] = useState(''), [password, setPassword] = useState('');
  const [modal, setModal] = useState(''), [confirm, setConfirm] = useState(null), [loginError, setLoginError] = useState('');
  const [liveGroup, setLiveGroup] = useState('纪实'), [channel, setChannel] = useState('nature'), [fullscreen, setFullscreen] = useState(false);
  const [detailSource, setDetailSource] = useState('preview');
  const [account, setAccount] = useState({ username: '', password: '' });
  const [page, itemId] = route.split('/');
  const movie = movies.find(item => item.id === itemId) || movies[0];
  const mode = new URLSearchParams(location.search).get('state');
  useEffect(() => {
    if (!window.history.state?.duskPreview) window.history.replaceState({ duskPreview: true, index: 0 }, '', location.href);
    const update = () => { setRoute(routeFromLocation()); setModal(''); };
    window.addEventListener('popstate', update); window.addEventListener('hashchange', update);
    return () => { window.removeEventListener('popstate', update); window.removeEventListener('hashchange', update); };
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer); }, [notice]);
  const go = next => {
    const action = () => { window.history.pushState({ duskPreview: true, index: (window.history.state?.index || 0) + 1 }, '', `#${next}`); setRoute(next); setModal(''); setFullscreen(false); };
    if (page === 'settings' && dirty) { setConfirm({ title: '设置尚未保存', message: '离开后将放弃未保存的更改。', action: () => { setSettings(readSaved('settings', { api: '', m3u: '', remote: false })); setDirty(false); action(); } }); } else action();
  };
  const back = () => {
    const action = () => { if (window.history.state?.index > 0) window.history.back(); else go('home'); };
    if (page === 'settings' && dirty) setConfirm({ title: '设置尚未保存', message: '离开后将放弃未保存的更改。', action: () => { setSettings(readSaved('settings', { api: '', m3u: '', remote: false })); setDirty(false); if (window.history.state?.index > 0) window.history.back(); else { window.history.replaceState({ duskPreview: true, index: 0 }, '', '#home'); setRoute('home'); } } });
    else action();
  };
  const nav = { onNavigate: go, onBack: back };
  const search = term => { if (!term.trim()) return; const value = term.trim(); setKeyword(value); setSubmitted(value); const next = [value, ...history.filter(item => item !== value)].slice(0, 20); setHistory(next); saveDemo('history', next); };
  const open = item => { setDetailSource('preview'); go(`detail/${item.id}`); };
  const sources = ['preview', 'second'].map((source, index) => ({ ...movie, source, sourceName: `演示片源 ${index + 1}`, desc: '每一段旅程，都始于一个选择。这里展示影片简介、播放源与选集的完整布局；预览使用示例资料。', type_name: movie.tag, episodes: ['正片$demo'] }));
  const clearSearch = () => { setKeyword(''); setSubmitted(''); };
  let content;
  if (page === 'search') content = <CinemaSearch {...nav} keyword={keyword} submitted={submitted} history={history} loading={mode === 'loading'} error={mode === 'error' ? '服务器暂时不可用，请稍后重试。' : null} items={mode === 'empty' ? [] : movies.filter(item => item.title.toLowerCase().includes(submitted.toLowerCase())).map(item => ({ ...item, sourceName: '演示片源' }))} imageUrl={url => url} onChange={setKeyword} onSearch={search} onClear={clearSearch} onClearHistory={() => setConfirm({ title: '清除搜索记录', message: '清除本地预览的全部搜索记录？', action: () => { setHistory([]); saveDemo('history', []); } })} onRemoteInput={() => setModal('remote')} onOpen={open} />;
  else if (page === 'detail') content = <CinemaDetail {...nav} item={sources.find(item => item.source === detailSource) || sources[0]} sources={sources} loading={mode === 'loading'} error={mode === 'error' ? '影片资料加载失败。' : null} sourcesLoading={false} favorited={favoriteIds.includes(movie.id)} imageUrl={url => url} onRetry={() => { location.search = ''; }} onSource={item => setDetailSource(item.source)} onPlay={() => go(`play/${movie.id}`)} onFavorite={() => { const next = favoriteIds.includes(movie.id) ? favoriteIds.filter(id => id !== movie.id) : [...favoriteIds, movie.id]; setFavoriteIds(next); saveDemo('favorites', next); }} />;
  else if (page === 'play') content = <DemoPlayer movie={movie} onBack={back} />;
  else if (page === 'touch-play') content = <DemoTouchPlayer movie={movie} onBack={back} />;
  else if (page === 'favorites') content = <CinemaLibrary {...nav} items={mode === 'empty' ? [] : movies.filter(item => favoriteIds.includes(item.id))} loading={mode === 'loading'} error={mode === 'error' ? '暂时无法读取收藏。' : null} imageUrl={url => url} onRetry={() => { location.search = ''; }} onOpen={open} />;
  else if (page === 'settings') content = <CinemaSettings {...nav} account={mode === 'signin' ? { ...account, onUsername: username => { setAccount({ ...account, username }); setDirty(true); }, onPassword: password => { setAccount({ ...account, password }); setDirty(true); } } : undefined} apiUrl={settings.api} m3uUrl={settings.m3u} remoteEnabled={settings.remote} remoteRunning={false} remoteError={settings.remote ? '预览模式不启动远程输入服务。' : null} loggedIn={loggedIn} dirty={dirty} saving={false} savedMessage="设置保存在本地预览中" onApiChange={api => { setSettings({ ...settings, api }); setDirty(true); }} onM3uChange={m3u => { setSettings({ ...settings, m3u }); setDirty(true); }} onRemoteChange={remote => { setSettings({ ...settings, remote }); setDirty(true); }} onSave={() => { saveDemo('settings', settings); setDirty(false); setNotice('已保存本地预览设置，未连接服务器。'); }} onAccount={() => { if (loggedIn) { setLoggedIn(false); setPassword(''); } else { setLoginError(''); setModal('login'); } }} updateSection={<View style={{ paddingVertical: 25, gap: 15 }}><Text style={{ color: '#f5f6f7', fontSize: 21, fontWeight: '600' }}>应用更新</Text><Text style={{ color: '#b8bec2' }}>版本信息与更新弹窗预览</Text><View style={{ alignSelf: 'flex-start' }}><CinemaButton label="查看更新弹窗" onPress={() => setModal('update')} /></View></View>} />;
  else if (page === 'live') content = <CinemaLive {...nav} channels={mode === 'empty' ? [] : demoChannels} selectedId={channel} group={liveGroup} onGroup={setLiveGroup} onSelect={value => setChannel(value.id)} loading={mode === 'loading'} configured={mode !== 'config'} onRetry={() => { location.search = ''; }} fullscreen={fullscreen} onFullscreen={setFullscreen} player={<View style={{ flex: 1, backgroundColor: '#000' }}><BrowserVideo key={channel} url={demoVideo} direct /><Text style={{ position: 'absolute', top: 14, left: 16, color: '#fff', padding: 8, backgroundColor: '#101214cc', borderRadius: 8 }}>示例频道 · 公共测试片段</Text></View>} />;
  else {
    let items = category.type === 'record' ? records : category.type === 'movie' ? movies : [];
    if (['经典', '科幻', '动画'].includes(category.tag)) items = items.filter(item => item.tag === category.tag);
    if (mode === 'empty') items = [];
    if (mode === 'broken') items = [{ ...movies[0], poster: '/missing-poster.jpg' }];
    if (mode === 'long-title') items = [{ ...movies[0], title: '这是一部用于检查电视界面长片名显示与截断效果的示例影片' }];
    content = <CinemaHome categories={categories} selectedCategory={category} items={items} loading={mode === 'loading'} loadingMore={false} message={mode === 'error' ? '服务器暂时无法连接，请稍后重试。' : mode === 'config' ? '添加 MoonTV 服务器，开始浏览你的影片。' : undefined} needsConfiguration={mode === 'config'} isLoggedIn={loggedIn}
      imageUrl={url => url} onLoadMore={() => {}} onRetry={() => { location.search = ''; }} onCategorySelect={value => setCategory({ ...value, tag: value.tag || value.tags?.[0] })} onTagSelect={tag => setCategory({ ...category, tag })}
      onOpen={item => item.progress !== undefined ? go(`play/${item.id}`) : open(item)} onRemoveRecord={item => setConfirm({ title: '删除观看记录', message: `删除“${item.title}”的示例观看记录？`, action: () => setRecords(records.filter(record => record.id !== item.id)) })} onNavigate={go} onLogout={() => setLoggedIn(false)} />;
  }
  return <>{content}
    <CinemaLogin visible={modal === 'login'} username={username} password={password} needsUsername loading={false} error={loginError} onUsername={setUsername} onPassword={setPassword} onClose={() => setModal('')} onLogin={() => { setLoginError('预览不验证或保存登录信息。请在正式应用中连接服务器后登录。'); setPassword(''); }} />
    <CinemaUpdate visible={modal === 'update'} current="0.1.0" latest="0.2.0（示例）" downloading={false} downloaded={false} progress={0} onClose={() => setModal('')} onSkip={() => { setModal(''); setNotice('已关闭示例更新提醒。'); }} onAction={() => setNotice('这是更新界面预览，不会下载或安装软件。')} />
    <CinemaDialog visible={modal === 'remote'} title="用手机输入" onClose={() => setModal('')}><Text style={{ color: '#b8bec2', fontSize: 16, lineHeight: 26 }}>在正式应用中开启远程输入后，这里会显示连接二维码。手机与电视需连接同一局域网。</Text><CinemaButton label="前往设置" primary onPress={() => go('settings')} /></CinemaDialog>
    <CinemaDialog visible={!!confirm} title={confirm?.title || ''} onClose={() => setConfirm(null)}><Text style={{ color: '#b8bec2', fontSize: 16, lineHeight: 26 }}>{confirm?.message}</Text><View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}><CinemaButton label="取消" onPress={() => setConfirm(null)} /><CinemaButton label="确认" primary onPress={() => { confirm?.action(); setConfirm(null); }} /></View></CinemaDialog>
    {notice && <div role="status" style={{ position: 'fixed', bottom: 48, left: '50%', transform: 'translateX(-50%)', maxWidth: '85%', background: '#eef2f0', color: '#101214', padding: '14px 24px', borderRadius: 12, fontSize: 15, zIndex: 200 }}>{notice}</div>}
  </>;
}

import React from 'react';
import { Text, View } from 'react-native';
import { cinema as c } from '@/constants/CinemaTheme';
import { CinemaButton, CinemaDialog, useCinemaLayout } from './CinemaUI';
export default function CinemaUpdate(p: { visible: boolean; current: string; latest: string; downloading: boolean; downloaded: boolean; progress: number; error?: string | null; onClose: () => void; onAction: () => void; onSkip: () => void }) {
  const { scale } = useCinemaLayout();
  return <CinemaDialog visible={p.visible} title="发现新版本" onClose={p.onClose}>
    <Text style={{ color: c.secondary, fontSize: 15 * scale }}>当前版本 v{p.current}</Text><Text style={{ color: c.text, fontSize: 28 * scale, fontWeight: '600' }}>DuskTV v{p.latest}</Text>
    {p.downloading && <View style={{ gap: 10 }}><View style={{ height: 5, backgroundColor: c.elevated, borderRadius: 4 }}><View style={{ height: 5, width: `${Math.min(100, Math.max(0, p.progress))}%`, backgroundColor: c.accent, borderRadius: 4 }} /></View><Text style={{ color: c.secondary }}>下载中 {p.progress}%</Text></View>}
    {!!p.error && <Text style={{ color: '#F0A49B', lineHeight: 24 }}>{p.error}</Text>}
    <Text style={{ color: c.secondary, fontSize: 14 * scale, lineHeight: 22 * scale }}>下载完成后会自动打开系统安装界面。</Text>
    <CinemaButton label={p.downloading ? '正在下载…' : p.downloaded ? '立即安装' : '立即更新'} primary disabled={p.downloading} onPress={p.onAction} scale={scale} />
    {!p.downloading && !p.downloaded && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}><CinemaButton label="稍后再说" onPress={p.onClose} scale={scale} /><CinemaButton label="跳过此版本" onPress={p.onSkip} scale={scale} /></View>}
  </CinemaDialog>;
}

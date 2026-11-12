import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Maximize, Minimize, Radio } from 'lucide-react-native';
import { cinema as c } from '@/constants/CinemaTheme';
import { CinemaButton, CinemaHeading, CinemaShell, CinemaState, useCinemaLayout } from './CinemaUI';
import type { NavigationProps } from './CinemaUI';
export interface LiveChannel { id: string; name: string; group: string }
export interface CinemaLiveProps extends NavigationProps {
  channels: LiveChannel[]; selectedId?: string; group: string; onGroup: (value: string) => void; onSelect: (channel: LiveChannel) => void;
  loading: boolean; configured: boolean; error?: string; onRetry: () => void; player: React.ReactNode; fullscreen: boolean; onFullscreen: (value: boolean) => void;
}
export default function CinemaLive(p: CinemaLiveProps) {
  const { scale, gutter, compact, short, height } = useCinemaLayout();
  // Sideways on a phone the header band is gone, so the player takes what is left under the nav.
  const videoHeight = short ? Math.max(150, height - 140) : Math.max(170 * scale, height - 270 * scale - 30);
  const groups = [...new Set(p.channels.map(channel => channel.group || '其他'))];
  const selected = p.channels.find(channel => channel.id === p.selectedId);
  if (p.fullscreen) return <View style={{ flex: 1, backgroundColor: '#000' }}>{p.player}<View style={{ position: 'absolute', top: 20, right: 20 }}><CinemaButton label="退出全屏" icon={Minimize} onPress={() => p.onFullscreen(false)} scale={scale} /></View></View>;
  return <CinemaShell active="live" onNavigate={p.onNavigate} onBack={p.onBack}>
    {short ? <View style={{ height: 12 }} /> : <View style={{ paddingHorizontal: gutter, paddingTop: 20 * scale }}><CinemaHeading title="直播" subtitle="此时此刻，正在发生。" /></View>}
    {p.loading ? <CinemaState loading title="正在加载频道" /> : !p.configured || !p.channels.length ? <CinemaState title={!p.configured ? '添加你的直播频道' : '暂时没有可用频道'} message={p.error || '在设置中添加 M3U 直播源，即可开始观看。'} action={<View style={{ flexDirection: 'row', gap: 12 }}>{p.configured && <CinemaButton label="重新加载" onPress={p.onRetry} scale={scale} />}<CinemaButton label="设置直播源" primary onPress={() => p.onNavigate('settings')} scale={scale} /></View>} /> : <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: short ? 12 : 32 }}>
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: short ? 20 : 28 * scale }}>
        <View style={{ flex: compact ? undefined : 1, gap: short ? 10 : 18 }}><View style={{ aspectRatio: compact ? 16 / 9 : undefined, height: compact ? undefined : videoHeight, overflow: 'hidden', borderRadius: 16, backgroundColor: '#000' }}>{p.player}</View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Radio size={18 * scale} color={c.accent} /><Text style={{ flex: 1, color: c.text, fontSize: 22 * scale, fontWeight: '600' }}>{selected?.name || '选择频道'}</Text><CinemaButton label="全屏观看" icon={Maximize} onPress={() => p.onFullscreen(true)} scale={scale} /></View></View>
        <View style={{ width: compact ? '100%' : short ? 220 : 280 * scale, gap: short ? 10 : 16 }}><ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, alignItems: 'center' }}>{groups.map(group => <CinemaButton key={group} label={group} selected={group === p.group} onPress={() => p.onGroup(group)} scale={scale * 0.9} />)}</ScrollView>
          <ScrollView style={{ maxHeight: videoHeight - 58 * scale }} contentContainerStyle={{ gap: 8, padding: 3 }}>{p.channels.filter(channel => (channel.group || '其他') === p.group).map(channel => <CinemaButton key={channel.id} label={channel.name} selected={channel.id === p.selectedId} onPress={() => p.onSelect(channel)} scale={scale} />)}</ScrollView>
        </View>
      </View>
    </ScrollView>}
  </CinemaShell>;
}

import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Heart, Play } from 'lucide-react-native';
import { cinema as c } from '@/constants/CinemaTheme';
import { CinemaButton, CinemaShell, CinemaState, PosterImage, useCinemaLayout } from './CinemaUI';
import type { CinemaItem, NavigationProps } from './CinemaUI';

export interface DetailItem extends CinemaItem { desc?: string; type_name?: string; episodes: string[]; resolution?: string | null }
export interface CinemaDetailProps extends NavigationProps {
  item: DetailItem | null; sources: DetailItem[]; loading: boolean; error?: string | null; sourcesLoading: boolean; favorited: boolean; favoriteBusy?: boolean;
  onPlay: (index: number) => void; onFavorite: () => void; onSource: (item: DetailItem) => void; onRetry: () => void; imageUrl: (poster: string) => string;
}
export default function CinemaDetail(p: CinemaDetailProps) {
  const { scale, gutter, compact, short } = useCinemaLayout();
  const [expanded, setExpanded] = useState(false);
  const item = p.item;
  return <CinemaShell onNavigate={p.onNavigate} onBack={p.onBack}>
    {p.loading ? <CinemaState title="正在查找播放源" message="影片资料和可用剧集正在加载。" loading /> : p.error || !item ? <CinemaState title="暂时无法显示影片" message={p.error || '没有找到这部影片的详情。'} action={<CinemaButton label="重新加载" primary onPress={p.onRetry} scale={scale} />} /> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: short ? 12 : 22 * scale, paddingBottom: 40 * scale }}>
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: short ? 20 : 32 * scale, alignItems: 'flex-start' }}>
        <View style={{ width: compact ? 144 : short ? 120 : 190 * scale, height: compact ? 216 : short ? 180 : 285 * scale, borderRadius: 16, overflow: 'hidden', backgroundColor: c.surface }}><PosterImage uri={p.imageUrl(item.poster)} style={{ width: '100%', height: '100%' }} /></View>
        <View style={{ flex: 1, width: compact ? '100%' : undefined, gap: short ? 12 : 18 * scale, paddingTop: compact || short ? 0 : 10 * scale }}>
          <Text style={{ color: c.accent, fontSize: 14 * scale }}>{item.type_name || '影片详情'}</Text>
          <Text style={{ color: c.text, fontSize: (compact ? 30 : short ? 26 : 38) * scale, fontWeight: '700', lineHeight: (compact ? 38 : short ? 33 : 46) * scale }}>{item.title}</Text>
          <Text style={{ color: c.secondary, fontSize: 16 * scale }}>{[item.year, item.sourceName, item.resolution].filter(Boolean).join(' / ')}</Text>
          <Text numberOfLines={expanded ? undefined : 3} style={{ color: c.secondary, fontSize: 16 * scale, lineHeight: 27 * scale, maxWidth: 760 }}>{item.desc?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() || '暂无剧情介绍。'}</Text>
          {!!item.desc && item.desc.length > 120 && <View style={{ alignSelf: 'flex-start' }}><CinemaButton label={expanded ? '收起简介' : '展开简介'} onPress={() => setExpanded(!expanded)} scale={scale * 0.85} /></View>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}><CinemaButton label="开始播放" icon={Play} primary disabled={!item.episodes.length} onPress={() => p.onPlay(0)} scale={scale} /><CinemaButton label={p.favorited ? '已收藏' : '加入收藏'} icon={Heart} selected={p.favorited} disabled={p.favoriteBusy} onPress={p.onFavorite} scale={scale} /></View>
        </View>
      </View>
      <View style={{ marginTop: 28 * scale, paddingTop: 22 * scale, borderTopWidth: 1, borderColor: c.elevated, gap: 18 * scale }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text style={{ color: c.text, fontSize: 22 * scale, fontWeight: '600' }}>播放源</Text><Text style={{ color: c.secondary, fontSize: 14 * scale }}>{p.sources.length} 个可选</Text>{p.sourcesLoading && <ActivityIndicator color={c.accent} />}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{p.sources.map(source => <CinemaButton key={`${source.source}:${source.id}`} label={[source.sourceName || source.source, source.resolution].filter(Boolean).join(' / ')} selected={source.source === item.source && source.id === item.id} onPress={() => p.onSource(source)} scale={scale} />)}</View>
      </View>
      <View style={{ marginTop: 24 * scale, gap: 18 * scale }}><Text style={{ color: c.text, fontSize: 22 * scale, fontWeight: '600' }}>选集<Text style={{ color: c.secondary, fontSize: 14 * scale }}>　共 {item.episodes.length} 集</Text></Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{item.episodes.map((episode, index) => <CinemaButton key={index} label={episode.includes('$') ? episode.split('$')[0] : item.episodes.length === 1 ? '正片' : `第 ${index + 1} 集`} selected={index === 0} onPress={() => p.onPlay(index)} scale={scale} />)}</View>
        {!item.episodes.length && <Text style={{ color: c.secondary }}>该播放源暂无可播放剧集，请选择其他播放源。</Text>}
      </View>
    </ScrollView>}
  </CinemaShell>;
}

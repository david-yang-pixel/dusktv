import React from 'react';
import { View } from 'react-native';
import { Search } from 'lucide-react-native';
import { CinemaButton, CinemaGrid, CinemaHeading, CinemaShell, CinemaState, useCinemaLayout } from './CinemaUI';
import type { CinemaItem, NavigationProps } from './CinemaUI';
export default function CinemaLibrary(p: NavigationProps & { items: CinemaItem[]; loading: boolean; error: string | null; onRetry: () => void; onOpen: (item: CinemaItem) => void; imageUrl: (url: string) => string }) {
  const { gutter, scale, short, compact } = useCinemaLayout();
  const heading = <CinemaHeading title="我的收藏" subtitle={p.items.length ? `${p.items.length} 部想看的，随时回来继续。` : '把想看的影片，留在这里。'} action={compact ? undefined : <CinemaButton label="找部影片" icon={Search} onPress={() => p.onNavigate('search')} scale={scale} />} />;
  // Sideways on a phone the heading scrolls away with the posters instead of taking a fixed band.
  const scrolls = short && !p.loading && !p.error && p.items.length > 0;
  return <CinemaShell active="favorites" onNavigate={p.onNavigate} onBack={p.onBack}>
    {!scrolls && <View style={{ paddingHorizontal: gutter, paddingTop: short ? 8 : 20 * scale }}>{heading}</View>}
    {p.loading ? <CinemaState title="正在加载收藏" loading /> : p.error ? <CinemaState title="收藏暂时无法加载" message={p.error} action={<CinemaButton label="重新加载" onPress={p.onRetry} scale={scale} />} /> : p.items.length ? <CinemaGrid items={p.items} imageUrl={p.imageUrl} onOpen={p.onOpen} header={scrolls ? <View style={{ paddingHorizontal: 5 }}>{heading}</View> : undefined} /> : <CinemaState title="收藏你的下一部好片" message="在影片详情页选择“加入收藏”，就能在这里找到它。" action={<CinemaButton label="去搜索" primary onPress={() => p.onNavigate('search')} scale={scale} />} />}
  </CinemaShell>;
}

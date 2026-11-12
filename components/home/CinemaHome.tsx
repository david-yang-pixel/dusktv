import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, ScrollView,
  StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Search, Settings, Star, Tv } from 'lucide-react-native';
import { cinema as c } from '@/constants/CinemaTheme';
import { CinemaButton as TVButton, CinemaPoster as Poster, PosterImage, CinemaHeader, CinemaTabBar, useCinemaLayout } from '@/components/cinema/CinemaUI';
import type { CinemaItem, CinemaPage } from '@/components/cinema/CinemaUI';
import type { Category } from '@/stores/homeStore';

export type { CinemaItem } from '@/components/cinema/CinemaUI';

interface Props {
  categories: Category[];
  selectedCategory: Category;
  items: CinemaItem[];
  loading: boolean;
  loadingMore: boolean;
  message?: string;
  needsConfiguration?: boolean;
  isLoggedIn: boolean;
  onCategorySelect: (category: Category) => void;
  onTagSelect: (tag: string) => void;
  onOpen: (item: CinemaItem) => void;
  onRemoveRecord: (item: CinemaItem) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onNavigate: (page: 'live' | 'favorites' | 'search' | 'settings') => void;
  onLogout: () => void;
  imageUrl: (poster: string) => string;
}

export default function CinemaHome(props: Props) {
  const { width, height } = useWindowDimensions();
  const { gutter, compact, short, scale } = useCinemaLayout();
  // A wide but short window needs denser chrome, not larger type and posters.
  const heroHeight = compact ? 270 : Math.max(200 * scale, Math.min(height * 0.31, 280 * scale));
  const categoryHeight = (props.selectedCategory.tags?.length ? 108 : 62) * scale;
  const cardHeightBudget = height - 78 * scale - heroHeight - categoryHeight - 110 * scale - 26;
  const cardWidth = compact ? Math.floor((width - gutter * 2) / 2.2) : short ? 118 : Math.max(106 * scale, Math.min(210 * scale, cardHeightBudget / 1.5 + 10));

  const [focusedKey, setFocusedKey] = useState('');
  const list = useRef<FlatList<CinemaItem>>(null);
  const scroll = useRef<ScrollView>(null);
  const categoryKey = `${props.selectedCategory.title}:${props.selectedCategory.tag || ''}`;
  useEffect(() => {
    setFocusedKey('');
    list.current?.scrollToOffset({ offset: 0, animated: false });
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [categoryKey]);
  const featured = props.items.find(item => `${item.source}:${item.id}` === focusedKey) || props.items[0];
  const showContent = !props.loading && !props.message && props.items.length > 0;
  const resume = featured?.progress !== undefined && featured?.episodeIndex !== undefined;
  // Sideways on a phone the feature is one row: text on the left, actions on the right.
  const featureActions = featured && (
    <View style={[styles.nav, { gap: 12 * scale, marginTop: short ? 0 : 4 * scale, flexWrap: short ? 'nowrap' : 'wrap' }]}>
      <TVButton label={resume ? '继续观看' : '查看详情'} icon={Play} primary onPress={() => props.onOpen(featured)} scale={scale} />
      {/* Phone portrait already has the search bar right above. */}
      {!compact && <TVButton label="搜索影片" icon={Search} onPress={() => props.onNavigate('search')} scale={scale} />}
    </View>
  );
  const navigate = (page: CinemaPage) => page === 'home' ? scroll.current?.scrollTo({ y: 0, animated: false }) : props.onNavigate(page);
  // Remote and keyboard hints mean nothing on a touch layout; only the long-press hint still applies.
  const touchLayout = compact || short;
  const hint = [touchLayout ? '' : Platform.OS === 'web' ? '方向键 / Tab 浏览　 Enter 打开' : '方向键浏览　 确认键打开', props.selectedCategory.type === 'record' ? '长按管理观看记录' : ''].filter(Boolean).join('　 ');
  const bodyMessage = props.message || (props.selectedCategory.type === 'record' ? '还没有观看记录，选一部影片开始吧。' : '这个分类暂时没有影片，试试其他分类或搜索。');

  return (
    <View style={styles.screen}>
      {showContent && featured?.poster && (
        <View testID="home-backdrop" pointerEvents="none" style={styles.backdrop}>
          <PosterImage uri={props.imageUrl(featured.poster)} style={styles.backdropImage} blurRadius={8} />
          <LinearGradient colors={['rgba(16,18,20,0.78)', 'rgba(16,18,20,0.48)', 'rgba(16,18,20,0.28)']} locations={[0, 0.48, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fill} />
          <LinearGradient colors={['rgba(16,18,20,0.22)', 'rgba(16,18,20,0.12)', 'rgba(16,18,20,0.72)']} locations={[0, 0.4, 1]} style={styles.fill} />
        </View>
      )}
      <CinemaHeader active="home" onNavigate={navigate} />
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 * scale }}>
        {showContent && featured && (
          <View testID="home-feature" style={short ? { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: gutter, paddingVertical: 10 } : { height: heroHeight, paddingHorizontal: gutter, justifyContent: 'center', alignItems: 'flex-start' }}>
            <View style={short ? { flex: 1, gap: 6 } : { width: compact ? '58%' : '52%', gap: 12 * scale }}>
              <View style={[styles.nav, { gap: 9 * scale }]}>
                {resume ? <Play size={14 * scale} color={c.accent} /> : <Tv size={15 * scale} color={c.accent} />}
                <Text style={{ color: c.accent, fontSize: 14 * scale, fontWeight: '500' }}>{resume ? '接着上次的故事' : props.selectedCategory.title}</Text>
              </View>
              <Text numberOfLines={short ? 1 : 2} style={{ color: c.text, fontSize: (compact ? 28 : short ? 24 : 40) * scale, lineHeight: (compact ? 35 : short ? 30 : 48) * scale, fontWeight: '700', letterSpacing: -1.2 }}>{featured.title}</Text>
              <View style={[styles.nav, { gap: 16 * scale, flexWrap: 'wrap' }]}>
                {featured.rate && <View style={[styles.nav, { gap: 5 * scale }]}><Star size={15 * scale} color={c.accent} fill={c.accent} /><Text style={{ color: c.accent, fontSize: 15 * scale, fontWeight: '600' }}>{featured.rate}</Text></View>}
                {[featured.year, featured.sourceName, resume ? `第 ${featured.episodeIndex} 集` : props.selectedCategory.tag === 'top250' ? undefined : props.selectedCategory.tag].filter(Boolean).map((text, index) => <Text key={index} style={{ color: c.secondary, fontSize: 15 * scale }}>{text}</Text>)}
              </View>
              {!short && featureActions}
            </View>
            {short && featureActions}
          </View>
        )}
        <View testID="home-categories" style={{ paddingTop: showContent ? 4 * scale : 30 * scale }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter - 8 * scale, gap: 6 * scale, paddingVertical: 5 * scale }}>
            {props.categories.map(category => <TVButton key={category.title} label={category.type === 'record' ? '继续观看' : category.title} selected={category.title === props.selectedCategory.title} onPress={() => props.onCategorySelect(category)} scale={scale} />)}
          </ScrollView>
          {!!props.selectedCategory.tags?.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter - 8 * scale, gap: 2 * scale, paddingVertical: 4 * scale }}>
            {props.selectedCategory.tags.map(tag => <TVButton key={tag} label={tag} selected={tag === props.selectedCategory.tag} onPress={() => props.onTagSelect(tag)} scale={scale * 0.87} />)}
          </ScrollView>}
        </View>
        {showContent ? <>
          <FlatList
            ref={list}
            testID="home-posters"
            horizontal
            data={props.items}
            keyExtractor={item => `${item.source}:${item.id}`}
            renderItem={({ item }) => <Poster item={item} width={cardWidth} scale={scale} imageUrl={props.imageUrl} onFocus={() => setFocusedKey(`${item.source}:${item.id}`)} onOpen={() => props.onOpen(item)} onRemove={() => props.onRemoveRecord(item)} />}
            ItemSeparatorComponent={() => <View style={{ width: 18 * scale }} />}
            contentContainerStyle={{ paddingHorizontal: gutter - 5, paddingTop: 12 * scale, paddingBottom: 10 * scale, alignItems: 'flex-start' }}
            showsHorizontalScrollIndicator={false}
            onEndReached={props.onLoadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={false}
            ListFooterComponent={props.loadingMore ? <ActivityIndicator accessibilityLabel="加载更多影片" color={c.accent} style={{ margin: 32 * scale }} /> : null}
          />
          {!!hint && <Text testID="home-navigation-hint" style={{ color: c.secondary, fontSize: 12 * scale, paddingHorizontal: gutter, marginTop: 6 * scale }}>{hint}</Text>}
        </> : <View style={[styles.empty, { minHeight: height * 0.55, paddingHorizontal: gutter }]}>
          {props.loading ? <><ActivityIndicator color={c.accent} size="large" /><Text style={styles.message}>正在准备影片…</Text></> : <>
            <Tv size={42 * scale} color={c.secondary} strokeWidth={1.2} />
            <Text style={{ color: c.text, fontSize: 26 * scale, fontWeight: '600', marginTop: 18 * scale }}>{props.needsConfiguration ? '连接你的影视库' : props.message ? '暂时无法加载' : '下一部好片，等你发现'}</Text>
            <Text style={styles.message}>{bodyMessage}</Text>
            <View style={[styles.nav, { gap: 12, marginTop: 16 }]}>
              <TVButton label={props.needsConfiguration ? '设置服务器' : props.message ? '重新加载' : '搜索影片'} icon={props.needsConfiguration ? Settings : Search} primary onPress={props.needsConfiguration ? () => props.onNavigate('settings') : props.message ? props.onRetry : () => props.onNavigate('search')} scale={scale} />
              {props.message && !props.needsConfiguration && <TVButton label="检查设置" onPress={() => props.onNavigate('settings')} scale={scale} />}
            </View>
          </>}
        </View>}
      </ScrollView>
      {compact && <CinemaTabBar active="home" onNavigate={navigate} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  fill: { ...StyleSheet.absoluteFillObject },
  backdrop: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  // Overscan keeps the blur's transparent edges outside the viewport.
  backdropImage: { position: 'absolute', top: -48, right: -48, bottom: -48, left: -48 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { color: c.secondary, fontSize: 16, lineHeight: 25, textAlign: 'center', maxWidth: 600, marginTop: 14 },
});

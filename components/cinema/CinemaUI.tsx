import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { TextInputProps } from 'react-native';
import { ArrowLeft, Home, Heart, Sunset, Search, Settings, Star, Tv, X } from 'lucide-react-native';
import { cinema as c } from '@/constants/CinemaTheme';
import { isPhoneLandscape } from '@/utils/DeviceUtils';

export interface CinemaItem {
  id: string;
  source: string;
  title: string;
  poster: string;
  year?: string;
  rate?: string;
  progress?: number;
  episodeIndex?: number;
  sourceName?: string;
  play_time?: number;
}

// Also used in the isolated browser preview; all production actions are supplied by HomeScreen.
export function CinemaButton({ label, icon: Icon, onPress, selected = false, primary = false, compact = false, scale = 1, disabled = false, preferred = false }: {
  label: string;
  icon?: typeof Search;
  onPress: () => void;
  selected?: boolean;
  primary?: boolean;
  compact?: boolean;
  scale?: number;
  disabled?: boolean;
  preferred?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const foreground = focused || primary ? c.background : selected ? c.text : c.secondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      aria-disabled={disabled}
      disabled={disabled}
      hasTVPreferredFocus={preferred}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.button, {
        minHeight: 42 * scale,
        maxWidth: '100%',
        flexShrink: 1,
        paddingHorizontal: (compact ? 11 : 21) * scale,
        gap: 8 * scale,
        borderRadius: c.radius.button * scale,
        backgroundColor: focused || primary ? c.focus : selected ? c.elevated : 'transparent',
        borderColor: focused ? c.accent : 'transparent',
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      }]}
    >
      {Icon && <Icon size={20 * scale} color={foreground} strokeWidth={1.7} />}
      {!compact && <Text numberOfLines={1} style={{ flexShrink: 1, color: foreground, fontSize: 16 * scale, fontWeight: '600' }}>{label}</Text>}
    </Pressable>
  );
}

export function PosterImage({ uri, style, blurRadius = 0 }: { uri: string; style: React.ComponentProps<typeof Image>['style']; blurRadius?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (!uri || failed) return <View style={[style, styles.posterFallback]}><Tv color={c.secondary} size={32} /></View>;
  return <Image source={{ uri }} style={style} blurRadius={blurRadius} resizeMode="cover" onError={() => setFailed(true)} accessible={false} />;
}

export function CinemaPoster({ item, width, scale, imageUrl, onFocus, onOpen, onRemove }: {
  item: CinemaItem;
  width: number;
  scale: number;
  imageUrl: (poster: string) => string;
  onFocus: () => void;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const longPressed = useRef(false);
  const progress = Number.isFinite(item.progress) ? Math.min(1, Math.max(0, item.progress!)) : 0;
  const resume = item.progress !== undefined && item.episodeIndex !== undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${resume ? `，第 ${item.episodeIndex} 集，已观看 ${Math.round(progress * 100)}%` : ''}`}
      accessibilityHint={item.progress !== undefined ? '按确认键打开，长按删除观看记录' : '按确认键查看详情'}
      onFocus={() => { setFocused(true); onFocus(); }}
      onBlur={() => setFocused(false)}
      onPressIn={() => { longPressed.current = false; }}
      onPress={() => { if (!longPressed.current) onOpen(); }}
      onLongPress={item.progress === undefined ? undefined : () => { longPressed.current = true; onRemove(); }}
      delayLongPress={800}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.8 : 1, transform: [{ scale: focused ? 1.025 : 1 }] }]}
    >
      <View style={[styles.posterFrame, { borderColor: focused ? c.focus : 'transparent', borderRadius: (c.radius.poster + 4) * scale }]}>
        <View style={{ height: (width - 10) * 1.5, borderRadius: c.radius.poster * scale, overflow: 'hidden', backgroundColor: c.surface }}>
          <PosterImage uri={item.poster ? imageUrl(item.poster) : ''} style={styles.fill} />
          {item.rate && <View style={styles.rating}><Star size={11 * scale} color={c.text} fill={c.text} /><Text style={{ color: c.text, fontSize: 12 * scale, fontWeight: '600' }}>{item.rate}</Text></View>}
          {resume && <View style={styles.progressTrack}><View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: c.accent }} /></View>}
        </View>
      </View>
      <Text numberOfLines={1} style={{ color: focused ? c.focus : c.text, fontSize: 16 * scale, fontWeight: '600', marginTop: 8 * scale, paddingHorizontal: 5 }}>{item.title}</Text>
      <Text numberOfLines={1} style={{ color: c.secondary, fontSize: 13 * scale, marginTop: 5 * scale, paddingHorizontal: 5 }}>
        {resume ? `第 ${item.episodeIndex} 集 · 已观看 ${Math.round(progress * 100)}%` : [item.year, item.sourceName].filter(Boolean).join(' / ')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  posterFrame: { padding: 3, borderWidth: 2 },
  posterFallback: { backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center' },
  rating: { position: 'absolute', top: 9, right: 9, flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(16,18,20,0.84)' },
  progressTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.22)' },
});

export type CinemaPage = 'home' | 'search' | 'favorites' | 'live' | 'settings';
export interface NavigationProps { onNavigate: (page: CinemaPage) => void; onBack?: () => void }
export function useCinemaLayout() {
  const { width, height } = useWindowDimensions();
  // A phone held sideways is wide but only about 400 tall. It keeps phone-sized type and
  // touch targets and lays content out in rows, instead of shrinking the TV layout.
  const short = isPhoneLandscape(width, height);
  const compact = width < 768 && !short;
  const scale = compact || short ? 1 : Math.max(0.8, Math.min(width / 1440, height / 850, 1.35));
  return { width, height, compact, short, scale, gutter: compact ? 20 : short ? 24 : Math.max(32, Math.min(width * 0.04, 76)) };
}
const TABS: { page: CinemaPage; label: string; icon: typeof Search }[] = [
  { page: 'home', label: '首页', icon: Home }, { page: 'live', label: '直播', icon: Tv }, { page: 'favorites', label: '收藏', icon: Heart }, { page: 'settings', label: '设置', icon: Settings },
];
const isTabPage = (page?: CinemaPage) => TABS.some(tab => tab.page === page);
// Phone portrait: destinations sit in a bottom bar within thumb reach, and the top keeps only search.
export function CinemaTabBar({ active, onNavigate }: { active?: CinemaPage; onNavigate: (page: CinemaPage) => void }) {
  return <View testID="cinema-tab-bar" style={{ flexDirection: 'row', height: 62, borderTopWidth: 1, borderColor: c.elevated, backgroundColor: 'rgba(16,18,20,0.94)' }}>
    {TABS.map(({ page, label, icon: Icon }) => {
      const selected = page === active;
      return <Pressable key={page} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} aria-selected={selected} onPress={() => onNavigate(page)} style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.elevated : 'transparent' }}><Icon size={21} color={selected ? c.text : c.secondary} strokeWidth={selected ? 2 : 1.6} /></View>
        <Text style={{ color: selected ? c.text : c.secondary, fontSize: 11, fontWeight: selected ? '700' : '500' }}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}
export function CinemaHeader({ active, onNavigate, onBack, center }: NavigationProps & { active?: CinemaPage; /** Phone portrait, pushed pages: sits beside the back button. */ center?: React.ReactNode }) {
  const { scale, gutter, compact, short, width } = useCinemaLayout();
  if (compact) {
    // Tab pages get the search bar; pushed pages (search, detail) get a back button instead.
    const tab = isTabPage(active);
    if (active === 'settings') return <View style={{ height: 8 }} />;
    return <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter, minHeight: 64, gap: 6 }}>
      {!tab && onBack && <View style={{ marginLeft: -11 }}><CinemaButton label="返回" icon={ArrowLeft} compact onPress={onBack} /></View>}
      {tab ? <Pressable accessibilityRole="button" accessibilityLabel="搜索" onPress={() => onNavigate('search')} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: c.elevated, backgroundColor: 'rgba(32,36,39,0.82)', opacity: pressed ? 0.75 : 1 })}>
        <Search size={19} color={c.secondary} /><Text numberOfLines={1} style={{ color: c.secondary, fontSize: 15 }}>搜索电影、剧集…</Text>
      </Pressable> : !!center && <View style={{ flex: 1 }}>{center}</View>}
    </View>;
  }
  return <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter, minHeight: compact ? 70 : short ? 56 : 78 * scale, gap: compact ? 4 : short ? 6 : 14 * scale }}>
    {onBack && <CinemaButton label="返回" icon={ArrowLeft} compact onPress={onBack} scale={scale} />}
    {!compact && !(short && width < 760) && <Pressable accessibilityRole="button" accessibilityLabel="暮映 DuskTV 首页" onPress={() => onNavigate('home')} style={({ focused }) => ({ flexDirection: 'row', alignItems: 'center', gap: 9 * scale, marginRight: short ? 8 : 22 * scale, padding: 5, borderRadius: 8, borderWidth: 2, borderColor: focused ? c.focus : 'transparent' })}>
      <Sunset size={28 * scale} color={c.accent} strokeWidth={1.5} /><Text style={{ color: c.text, fontSize: 22 * scale, fontWeight: '700', letterSpacing: -0.7 }}>暮映<Text style={{ fontSize: 14 * scale, fontWeight: '400', color: c.secondary }}> DuskTV</Text></Text>
    </Pressable>}
    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: compact ? 0 : 4 * scale }}>
      <CinemaButton label="首页" icon={compact ? Home : undefined} compact={compact} selected={active === 'home'} onPress={() => onNavigate('home')} scale={scale} />
      <CinemaButton label="直播" icon={compact ? Tv : undefined} compact={compact} selected={active === 'live'} onPress={() => onNavigate('live')} scale={scale} />
      <CinemaButton label="收藏" icon={compact ? Heart : undefined} compact={compact} selected={active === 'favorites'} onPress={() => onNavigate('favorites')} scale={scale} />
    </View>
    <CinemaButton label="搜索" icon={Search} compact={compact} selected={active === 'search'} onPress={() => onNavigate('search')} scale={scale} />
    <CinemaButton label="设置" icon={Settings} compact selected={active === 'settings'} onPress={() => onNavigate('settings')} scale={scale} />
  </View>;
}
export function CinemaShell({ children, active, onNavigate, onBack, center }: NavigationProps & { children: React.ReactNode; active?: CinemaPage; center?: React.ReactNode }) {
  const { compact } = useCinemaLayout();
  return <View style={{ flex: 1, backgroundColor: c.background }}><CinemaHeader active={active} onNavigate={onNavigate} onBack={onBack} center={center} />{children}{compact && isTabPage(active) && <CinemaTabBar active={active} onNavigate={onNavigate} />}</View>;
}
export const CinemaField = forwardRef<TextInput, TextInputProps & { label?: string; leadingIcon?: typeof Search }>(function CinemaField({ label, leadingIcon: Icon, style, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  const { scale } = useCinemaLayout();
  return <View style={{ gap: 10, flexShrink: 1 }}>
    {!!label && <Text style={{ color: c.secondary, fontSize: 14 * scale }}>{label}</Text>}
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 2, borderColor: focused ? c.accent : c.elevated, backgroundColor: c.surface, paddingHorizontal: 18 * scale, gap: 12 * scale }}>
      {Icon && <Icon size={22 * scale} color={focused ? c.accent : c.secondary} />}
      <TextInput {...props} ref={ref} accessibilityLabel={props.accessibilityLabel || label} placeholderTextColor={c.secondary} selectionColor={c.accent} onFocus={e => { setFocused(true); onFocus?.(e); }} onBlur={e => { setFocused(false); onBlur?.(e); }} style={[{ flex: 1, minWidth: 0, minHeight: 50 * scale, color: c.text, fontSize: 17 * scale, paddingVertical: 12 * scale }, style]} />
    </View>
  </View>;
});
export function CinemaHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const { scale, compact, short } = useCinemaLayout();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: short ? 12 : 22 * scale }}>
    <View style={{ flex: 1, gap: 9 * scale }}><Text style={{ color: c.text, fontSize: (compact ? 28 : short ? 24 : 32) * scale, fontWeight: '700', letterSpacing: -0.6 }}>{title}</Text>{!!subtitle && !short && <Text style={{ color: c.secondary, fontSize: 15 * scale, lineHeight: 23 * scale }}>{subtitle}</Text>}</View>{action}
  </View>;
}
export function CinemaState({ title, message, loading, action }: { title: string; message?: string; loading?: boolean; action?: React.ReactNode }) {
  const { scale } = useCinemaLayout();
  return <View style={{ flex: 1, minHeight: 220 * scale, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 16 * scale }}>
    {loading ? <ActivityIndicator size="large" color={c.accent} /> : <Search size={34 * scale} color={c.secondary} strokeWidth={1.3} />}
    <Text style={{ color: c.text, fontSize: 23 * scale, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
    {!!message && <Text style={{ color: c.secondary, fontSize: 15 * scale, lineHeight: 24 * scale, maxWidth: 620, textAlign: 'center' }}>{message}</Text>}{action}
  </View>;
}
export function CinemaGrid({ items, imageUrl, onOpen, header }: { items: CinemaItem[]; imageUrl: (poster: string) => string; onOpen: (item: CinemaItem) => void; header?: React.ReactElement }) {
  const { width, gutter, scale, compact, short } = useCinemaLayout();
  const [availableHeight, setAvailableHeight] = useState(0);
  const gap = 18 * scale;
  const baseColumns = compact ? 2 : width < 1000 ? 4 : 6;
  const preferredWidth = (width - gutter * 2 - gap * (baseColumns - 1)) / baseColumns;
  const heightLimitedWidth = availableHeight > 0 ? Math.max(100 * scale, (availableHeight - 76 * scale) / 1.5 + 10) : preferredWidth;
  // Touch grids scroll, so a sideways phone uses a fixed count instead of fitting a full row into the viewport.
  const columns = compact ? 2 : short ? (width >= 800 ? 6 : 5) : Math.max(baseColumns, Math.min(10, Math.ceil((width - gutter * 2 + gap) / (Math.min(preferredWidth, heightLimitedWidth) + gap))));
  const cardWidth = (width - gutter * 2 - gap * (columns - 1)) / columns;
  return <FlatList style={{ flex: 1 }} onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)} key={columns} data={items} numColumns={columns} keyExtractor={item => `${item.source}:${item.id}`} ListHeaderComponent={header} showsVerticalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: gutter - 5, paddingBottom: 32, paddingTop: 8 }} columnWrapperStyle={{ gap, marginBottom: 22 * scale }} removeClippedSubviews={false}
    renderItem={({ item }) => <CinemaPoster item={item} width={cardWidth} scale={scale} imageUrl={imageUrl} onFocus={() => {}} onOpen={() => onOpen(item)} onRemove={() => {}} />} />;
}
export function CinemaDialog({ visible, title, onClose, children, wide = false }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const { scale } = useCinemaLayout();
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <View accessibilityViewIsModal aria-modal style={{ width: '100%', maxWidth: (wide ? 700 : 460) * scale, maxHeight: '90%', backgroundColor: c.surface, borderRadius: 24, padding: 24 * scale, borderWidth: 1, borderColor: c.elevated }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 * scale }}><Text style={{ color: c.text, flex: 1, fontSize: 23 * scale, fontWeight: '600' }}>{title}</Text><CinemaButton label="关闭" icon={X} compact onPress={onClose} scale={scale} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}

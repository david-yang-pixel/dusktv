import React from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { QrCode, Search, X, Clock3 } from 'lucide-react-native';
import { cinema as c } from '@/constants/CinemaTheme';
import { CinemaButton, CinemaField, CinemaGrid, CinemaHeading, CinemaShell, CinemaState, useCinemaLayout } from './CinemaUI';
import type { CinemaItem, NavigationProps } from './CinemaUI';

export interface CinemaSearchProps extends NavigationProps {
  keyword: string; submitted: string; history: string[]; items: CinemaItem[]; loading: boolean; error: string | null;
  onChange: (value: string) => void; onSearch: (value: string) => void; onClear: () => void; onClearHistory: () => void;
  onRemoteInput: () => void; onOpen: (item: CinemaItem) => void; imageUrl: (poster: string) => string;
}
export default function CinemaSearch(p: CinemaSearchProps) {
  const { gutter, scale, compact, short } = useCinemaLayout();
  const field = <CinemaField accessibilityLabel="搜索片名" leadingIcon={Search} placeholder="搜索电影、剧集…" value={p.keyword} onChangeText={p.onChange} onSubmitEditing={() => p.onSearch(p.keyword)} returnKeyType="search" autoFocus={!Platform.isTV} autoCorrect={false} />;
  // Phone portrait: the field is the top bar, beside the back button. Phones also drop the
  // "type on your phone" shortcut, which exists for TVs.
  const phone = compact || short;
  return <CinemaShell active="search" onNavigate={p.onNavigate} onBack={p.onBack} center={compact ? field : undefined}>
    <View style={{ paddingHorizontal: gutter, paddingTop: compact ? 4 : short ? 8 : 20 * scale, paddingBottom: compact ? 14 : short ? 12 : 20 * scale }}>
      {!phone && <CinemaHeading title="搜索" subtitle="下一部想看的，从这里找到。" />}
      <View style={{ flexDirection: 'row', gap: 12 * scale, alignItems: 'center' }}>
        {!compact && <View style={{ flex: 1 }}>{field}</View>}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {!!p.keyword && <CinemaButton label="清空搜索" icon={X} compact onPress={p.onClear} scale={scale} />}
          <CinemaButton label="搜索影片" primary onPress={() => p.onSearch(p.keyword)} disabled={!p.keyword.trim()} scale={scale} />
          {!phone && <CinemaButton label="手机输入" icon={QrCode} onPress={p.onRemoteInput} scale={scale} />}
        </View>
      </View>
    </View>
    {!p.submitted ? <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 30 }}>
      <View style={{ height: 1, backgroundColor: c.elevated, marginBottom: 26 * scale }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Clock3 size={19 * scale} color={c.secondary} /><Text style={{ flex: 1, color: c.text, fontSize: 20 * scale, fontWeight: '600' }}>最近搜索</Text>{p.history.length > 0 && <CinemaButton label="清除记录" onPress={p.onClearHistory} scale={scale * 0.9} />}</View>
      {p.history.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>{p.history.slice(0, 12).map(term => <CinemaButton key={term} label={term} selected onPress={() => p.onSearch(term)} scale={scale} />)}</View> : <Text style={{ color: c.secondary, fontSize: 15 * scale, marginTop: 20, lineHeight: 25 }}>还没有搜索记录。输入片名，或使用手机遥控输入。</Text>}
      <View style={{ marginTop: 36 * scale, maxWidth: 540, gap: 10 }}><Text style={{ color: c.text, fontSize: 23 * scale, fontWeight: '500' }}>片名不必完整</Text><Text style={{ color: c.secondary, fontSize: 15 * scale, lineHeight: 25 * scale }}>试试片名中的几个字。找到影片后，可以在详情页选择播放源和剧集。</Text></View>
    </ScrollView> : p.loading ? <CinemaState title={`正在搜索“${p.submitted}”`} loading /> : p.error ? <CinemaState title="搜索暂时不可用" message={p.error} action={<CinemaButton label="重新搜索" onPress={() => p.onSearch(p.submitted)} primary scale={scale} />} /> : p.items.length === 0 ? <CinemaState title={`没有找到“${p.submitted}”`} message="试试更短的关键词，或检查片名是否正确。" /> : <>
      <View style={{ paddingHorizontal: gutter, paddingBottom: 14 }}><Text style={{ color: c.text, fontSize: 20 * scale, fontWeight: '600' }}>“{p.submitted}”的搜索结果<Text style={{ color: c.secondary, fontSize: 14 * scale }}>　{p.items.length} 个</Text></Text></View>
      <CinemaGrid items={p.items} imageUrl={p.imageUrl} onOpen={p.onOpen} />
    </>}
  </CinemaShell>;
}

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Check, LockKeyhole, LogIn, LogOut, Monitor, Radio, Smartphone, UserRound } from 'lucide-react-native';
import { cinema as c } from '@/constants/CinemaTheme';
import { CinemaButton, CinemaField, CinemaHeading, CinemaShell, useCinemaLayout } from './CinemaUI';
import type { NavigationProps } from './CinemaUI';
export interface CinemaSettingsProps extends NavigationProps {
  apiUrl: string; m3uUrl: string; remoteEnabled: boolean; remoteRunning: boolean; remoteUrl?: string; remoteError?: string | null;
  loggedIn: boolean; dirty: boolean; saving: boolean; savedMessage?: string; updateSection?: React.ReactNode;
  onApiChange: (value: string) => void; onM3uChange: (value: string) => void; onRemoteChange: (value: boolean) => void;
  onFieldFocus?: (field: 'api' | 'livestream') => void; onSave: () => void; onAccount: () => void;
  /** Sign-in fields shown with the server address, so both are filled in and saved together. */
  account?: { username: string; password: string; error?: string; onUsername: (value: string) => void; onPassword: (value: string) => void };
}
function Section({ icon: Icon, title, description, children }: { icon: typeof Monitor; title: string; description: string; children: React.ReactNode }) {
  const { scale, compact, short } = useCinemaLayout();
  return <View style={{ flexDirection: compact ? 'column' : 'row', gap: short ? 20 : 28 * scale, paddingVertical: short ? 16 : 22 * scale, borderTopWidth: 1, borderColor: c.elevated }}>
    <View style={{ width: compact ? '100%' : short ? 190 : 230 * scale, gap: 10 }}><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Icon size={22 * scale} color={c.accent} /><Text style={{ color: c.text, fontSize: 20 * scale, fontWeight: '600' }}>{title}</Text></View><Text style={{ color: c.secondary, fontSize: 14 * scale, lineHeight: 23 * scale }}>{description}</Text></View>
    <View style={{ flex: 1, gap: 12 }}>{children}</View>
  </View>;
}
export default function CinemaSettings(p: CinemaSettingsProps) {
  const { gutter, scale, short } = useCinemaLayout();
  // Signed out: the account is entered right here instead of in a separate dialog after saving.
  const signInHere = !!p.account && !p.loggedIn;
  const signingIn = signInHere && !!(p.account!.username.trim() || p.account!.password);
  return <CinemaShell active="settings" onNavigate={p.onNavigate} onBack={p.onBack}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: short ? 8 : 20 * scale, paddingBottom: 40 }}>
      <CinemaHeading title="设置" subtitle="连接影视库，管理观看偏好。" />
      <Section icon={Monitor} title="影视服务器" description="连接你的 MoonTV 服务，浏览影片与同步观看记录。"><CinemaField label="服务器地址" placeholder="https://your-server.example" value={p.apiUrl} onChangeText={p.onApiChange} onFocus={() => p.onFieldFocus?.('api')} autoCapitalize="none" autoCorrect={false} keyboardType="url" />{signInHere ? <>
          <CinemaField label="用户名" leadingIcon={UserRound} placeholder="只设了密码的服务器可留空" value={p.account!.username} onChangeText={p.account!.onUsername} autoCapitalize="none" autoCorrect={false} />
          <CinemaField label="密码" leadingIcon={LockKeyhole} placeholder="输入密码" secureTextEntry value={p.account!.password} onChangeText={p.account!.onPassword} autoCapitalize="none" autoCorrect={false} />
          {p.account!.error ? <Text accessibilityLiveRegion="polite" style={{ color: '#F0A49B', fontSize: 14 * scale, lineHeight: 22 * scale }}>{p.account!.error}</Text> : <Text style={{ color: c.secondary, fontSize: 14 * scale, lineHeight: 22 * scale }}>填好后点“保存并登录”，会连接服务器并登录账户。</Text>}
        </> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><Text style={{ color: c.secondary, fontSize: 14 * scale }}>{p.loggedIn ? '账户已登录' : '尚未登录账户'}</Text><CinemaButton label={p.loggedIn ? '退出登录' : '登录账户'} icon={p.loggedIn ? LogOut : LogIn} onPress={p.onAccount} scale={scale * 0.9} /></View>}</Section>
      <Section icon={Radio} title="直播频道" description="添加 M3U 播放列表，在直播页切换频道。"><CinemaField label="直播源地址" placeholder="https://your-server.example/channels.m3u" value={p.m3uUrl} onChangeText={p.onM3uChange} onFocus={() => p.onFieldFocus?.('livestream')} autoCapitalize="none" autoCorrect={false} keyboardType="url" /></Section>
      <Section icon={Smartphone} title="手机遥控输入" description="开启后，在同一局域网使用手机输入片名和地址。"><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}><Text style={{ color: c.text, fontSize: 16 * scale }}>允许远程输入</Text><CinemaButton label={p.remoteEnabled ? '已开启' : '已关闭'} icon={p.remoteEnabled ? Check : undefined} selected={p.remoteEnabled} onPress={() => p.onRemoteChange(!p.remoteEnabled)} scale={scale} /></View>{p.remoteEnabled && <Text selectable style={{ color: c.secondary, fontSize: 14 * scale, lineHeight: 24 * scale }}>{p.remoteError || (p.remoteRunning ? `服务运行中${p.remoteUrl ? `\n${p.remoteUrl}` : ''}` : '远程输入服务尚未启动')}</Text>}</Section>
      {p.updateSection}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18, justifyContent: 'flex-end', paddingTop: 26, borderTopWidth: 1, borderColor: c.elevated }}><Text accessibilityLiveRegion="polite" style={{ color: c.secondary, fontSize: 14 * scale }}>{p.saving ? '正在保存…' : p.dirty ? '有尚未保存的更改' : p.savedMessage || '设置已保存'}</Text><CinemaButton label={p.saving ? '保存中…' : signingIn ? '保存并登录' : '保存设置'} primary onPress={p.onSave} disabled={!p.dirty || p.saving} scale={scale} /></View>
    </ScrollView>
  </CinemaShell>;
}

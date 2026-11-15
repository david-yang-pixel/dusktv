import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import { UNSTABLE_usePreventRemove as usePreventRemove } from '@react-navigation/native';
import CinemaSettings from '@/components/cinema/CinemaSettings';
import { UpdateSection } from '@/components/settings/UpdateSection';
import { useCinemaNavigation } from '@/hooks/useCinemaNavigation';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSettingsStore } from '@/stores/settingsStore';
import { useRemoteControlStore } from '@/stores/remoteControlStore';
import useAuthStore from '@/stores/authStore';
import useHomeStore from '@/stores/homeStore';
import { api } from '@/services/api';
import { LoginCredentialsManager } from '@/services/storage';
import Toast from 'react-native-toast-message';
export default function SettingsScreen() {
  const navigation = useCinemaNavigation();
  const settings = useSettingsStore();
  const stack = useNavigation();
  // 远程输入服务只在非手机设备上启动（见 app/_layout.tsx），手机上不显示这个开关
  const { deviceType } = useResponsiveLayout();
  const allowLeave = useRef(false);
  const edited = useRef(false);
  const [draft, setDraft] = useState(() => ({ api: settings.apiBaseUrl, m3u: settings.m3uUrl, remote: settings.remoteInputEnabled }));
  const remote = useRemoteControlStore();
  const { loadSettings } = settings;
  const { lastMessage, targetPage, clearMessage } = remote;
  const auth = useAuthStore();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [field, setField] = useState<'api' | 'livestream'>('api');
  const [account, setAccount] = useState({ username: '', password: '' });
  const [accountError, setAccountError] = useState('');
  useEffect(() => {
    let active = true;
    loadSettings().then(() => {
      if (active && !edited.current) { const value = useSettingsStore.getState(); setDraft({ api: value.apiBaseUrl, m3u: value.m3uUrl, remote: value.remoteInputEnabled }); }
    }).catch(() => Alert.alert('读取设置失败', '请稍后重试。'));
    return () => { active = false; };
  }, [loadSettings]);
  const discard = useCallback(() => { edited.current = false; setDirty(false); setAccount({ username: '', password: '' }); setAccountError(''); }, []);
  usePreventRemove(dirty, ({ data }) => {
    if (allowLeave.current) { stack.dispatch(data.action); return; }
    Alert.alert('设置尚未保存', '离开后将放弃未保存的更改。', [{ text: '继续编辑', style: 'cancel' }, { text: '放弃更改', style: 'destructive', onPress: () => { allowLeave.current = true; discard(); stack.dispatch(data.action); } }]);
  });
  useEffect(() => {
    if (lastMessage && !targetPage) {
      const value = lastMessage.split('_')[0];
      setDraft(previous => ({ ...previous, [field === 'api' ? 'api' : 'm3u']: value }));
      edited.current = true; setDirty(true); clearMessage();
    }
  }, [lastMessage, targetPage, clearMessage, field]);
  // Signs in on the server that was just saved, so the address and the account can be filled in together.
  const signIn = async () => {
    const username = account.username.trim();
    if (!account.password) throw new Error('请输入密码。');
    const { serverConfig, apiBaseUrl } = useSettingsStore.getState();
    if (!serverConfig?.StorageType) throw new Error('连接不上服务器，请检查服务器地址和网络。');
    const passwordOnly = serverConfig.StorageType === 'localstorage';
    if (!passwordOnly && !username) throw new Error('这个服务器需要用户名。');
    try {
      const result = await api.login(passwordOnly ? undefined : username, account.password);
      if (result && result.ok === false) throw new Error('UNAUTHORIZED');
    } catch (error) {
      throw new Error(error instanceof Error && error.message === 'UNAUTHORIZED' ? '用户名或密码不正确。' : '登录失败，请检查网络后重试。');
    }
    // Saved before the status check so a session restore running at the same time finds them.
    await LoginCredentialsManager.save({ username, password: account.password });
    await auth.checkLoginStatus(apiBaseUrl);
    await useHomeStore.getState().refreshPlayRecords().catch(() => {});
  };
  const save = async () => {
    if (saving) return;
    setSaving(true); setAccountError('');
    try {
      try { settings.setApiBaseUrl(draft.api); settings.setM3uUrl(draft.m3u); settings.setRemoteInputEnabled(draft.remote); await settings.saveSettings(); setDraft(previous => ({ ...previous, api: useSettingsStore.getState().apiBaseUrl })); }
      catch { Alert.alert('保存失败', '请检查服务器地址后重试。'); return; }
      if (account.username.trim() || account.password) {
        // The settings are saved either way; a failed sign-in leaves the form ready for another try.
        try { await signIn(); } catch (error) { setAccountError(error instanceof Error ? error.message : '登录失败，请重试。'); return; }
        setAccount({ username: '', password: '' });
        Toast.show({ type: 'success', text1: '登录成功' });
        Alert.alert('免责声明', '本应用仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。', [{ text: '确定' }]);
      }
      edited.current = false; setDirty(false);
    } finally { setSaving(false); }
  };
  const editAccount = (change: Partial<typeof account>) => { setAccount(previous => ({ ...previous, ...change })); setAccountError(''); edited.current = true; allowLeave.current = false; setDirty(true); };
  const leave = (action: () => void) => {
    if (!dirty) { action(); return; }
    Alert.alert('设置尚未保存', '离开后将放弃未保存的更改。', [{ text: '继续编辑', style: 'cancel' }, { text: '放弃更改', style: 'destructive', onPress: () => { const value = useSettingsStore.getState(); setDraft({ api: value.apiBaseUrl, m3u: value.m3uUrl, remote: value.remoteInputEnabled }); discard(); allowLeave.current = true; action(); } }]);
  };
  return <CinemaSettings onNavigate={page => leave(() => navigation.onNavigate(page))} onBack={() => leave(navigation.onBack)}
    apiUrl={draft.api} m3uUrl={draft.m3u} remoteEnabled={draft.remote} remoteAvailable={deviceType !== 'mobile'} remoteRunning={remote.isServerRunning} remoteUrl={remote.serverUrl || undefined} remoteError={remote.error}
    loggedIn={auth.isLoggedIn && draft.api.trim() === settings.apiBaseUrl} dirty={dirty} saving={saving} onSave={save} onFieldFocus={setField}
    account={{ ...account, error: accountError, onUsername: username => editAccount({ username }), onPassword: password => editAccount({ password }) }}
    onApiChange={value => { setDraft(previous => ({ ...previous, api: value })); edited.current = true; allowLeave.current = false; setDirty(true); }} onM3uChange={value => { setDraft(previous => ({ ...previous, m3u: value })); edited.current = true; allowLeave.current = false; setDirty(true); }} onRemoteChange={value => { setDraft(previous => ({ ...previous, remote: value })); edited.current = true; allowLeave.current = false; setDirty(true); }}
    onAccount={() => auth.isLoggedIn ? Alert.alert('退出登录', '退出当前服务器账户？', [{ text: '取消', style: 'cancel' }, { text: '退出登录', onPress: auth.logout }]) : leave(() => { navigation.onNavigate('home'); auth.showLoginModal(); })}
    updateSection={Platform.OS === 'android' ? <UpdateSection /> : undefined} />;
}

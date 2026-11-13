import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, BackHandler, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import CinemaHome from '@/components/home/CinemaHome';
import { api } from '@/services/api';
import { PlayRecordManager } from '@/services/storage';
import useHomeStore, { Category } from '@/stores/homeStore';
import useAuthStore from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useApiConfig, getApiConfigErrorMessage } from '@/hooks/useApiConfig';

export default function HomeScreen() {
  const router = useRouter();
  const home = useHomeStore();
  const { refreshPlayRecords, fetchInitialData } = home;
  const { isLoggedIn, logout } = useAuthStore();
  const config = useApiConfig();
  const backTime = useRef(0);
  useFocusEffect(useCallback(() => { refreshPlayRecords(); }, [refreshPlayRecords]));
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const now = Date.now();
      if (now - backTime.current > 2000) { backTime.current = now; ToastAndroid.show('再按一次返回键退出', ToastAndroid.SHORT); return true; }
      BackHandler.exitApp(); return true;
    });
    return () => { subscription.remove(); backTime.current = 0; };
  }, []));
  useEffect(() => { if (config.isValid) fetchInitialData(); }, [config.isValid, fetchInitialData]);
  const select = (category: Category) => home.selectCategory({ ...category, tag: category.tag || category.tags?.[0] });
  const message = config.needsConfiguration ? getApiConfigErrorMessage(config) : config.error && !config.isValid ? config.error : home.error || undefined;
  return <CinemaHome categories={home.categories} selectedCategory={home.selectedCategory} items={home.contentData}
    loading={config.isValidating || (!message && home.loading)} loadingMore={home.loadingMore} refreshing={home.refreshing} onRefresh={home.refreshData} message={message} needsConfiguration={config.needsConfiguration}
    isLoggedIn={isLoggedIn} onLogout={logout} onCategorySelect={select} onTagSelect={tag => select({ ...home.selectedCategory, tag })}
    imageUrl={poster => api.getImageProxyUrl(poster)} onLoadMore={home.loadMoreData}
    onRetry={async () => { if (config.error) await useSettingsStore.getState().fetchServerConfig(); await home.fetchInitialData(); }}
    onNavigate={page => router.push(`/${page}`)}
    onOpen={item => item.progress !== undefined && item.episodeIndex !== undefined
      ? router.push({ pathname: '/play', params: { source: item.source, id: item.id, title: item.title, episodeIndex: item.episodeIndex - 1, position: (item.play_time || 0) * 1000 } })
      : router.push({ pathname: '/detail', params: { source: item.source, q: item.title } })}
    onRemoveRecord={item => { if (item.progress === undefined) return; Alert.alert('删除观看记录', `确定要删除“${item.title}”的观看记录吗？`, [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: async () => { try { await PlayRecordManager.remove(item.source, item.id); await home.refreshPlayRecords(); } catch { Alert.alert('删除失败', '请稍后重试。'); } } }]); }}
  />;
}

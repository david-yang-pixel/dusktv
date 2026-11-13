import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import type { LevelControl } from "@/components/cinema/CinemaPlayer";

// 屏幕方向、亮度、音量这三个原生模块在 Apple TV 上都没有实现，顶层 import 会在加载时直接报错，
// 所以只在能用的设备上按需加载。点播和直播的触摸播放器共用这里。
export const loadScreenOrientation = (): typeof import("expo-screen-orientation") | null => {
  if (Platform.isTV) return null;
  try {
    return require("expo-screen-orientation");
  } catch {
    return null;
  }
};
const loadBrightness = (): typeof import("expo-brightness") | null => {
  if (Platform.isTV) return null;
  try {
    return require("expo-brightness");
  } catch {
    return null;
  }
};
const loadVolumeManager = (): typeof import("react-native-volume-manager").VolumeManager | null => {
  if (Platform.isTV || Platform.OS !== "android") return null;
  try {
    return require("react-native-volume-manager").VolumeManager;
  } catch {
    return null;
  }
};

/** 把系统亮度还给系统；亮度手势只改本应用窗口，离开播放器时要恢复。 */
export const restoreBrightness = () => {
  loadBrightness()?.restoreSystemBrightnessAsync().catch(() => {});
};

/**
 * 画面手势用的亮度和音量：左半边上下滑调屏幕亮度，右半边上下滑调系统媒体音量。
 * 设备不支持的那一项是 undefined。组件卸载时恢复系统亮度。
 */
export function useLevelControls(): { brightness?: LevelControl; volume?: LevelControl } {
  const brightness = useMemo<LevelControl | undefined>(() => {
    const module = loadBrightness();
    return module ? { get: () => module.getBrightnessAsync(), set: value => { module.setBrightnessAsync(value).catch(() => {}); } } : undefined;
  }, []);
  const volume = useMemo<LevelControl | undefined>(() => {
    const module = loadVolumeManager();
    return module ? {
      get: async () => (await module.getVolume()).volume,
      set: value => { Promise.resolve(module.setVolume(value, { showUI: false, type: "music" })).catch(() => {}); },
    } : undefined;
  }, []);
  useEffect(() => restoreBrightness, []);
  return { brightness, volume };
}

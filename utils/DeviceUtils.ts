import { Platform, Dimensions } from "react-native";
import type { DeviceType } from "@/hooks/useResponsiveLayout";

// Android 以最短边 600dp 区分手机和平板；手机横屏时宽度会超过平板甚至 TV 断点，
// 所以手机必须按最短边判断，不能只看宽度。
export const PHONE_SHORT_SIDE_LIMIT = 600;

/**
 * 当前环境是否以触摸为主。原生端除 TV 外都是触摸设备；
 * 浏览器里用指针类型判断，避免把矮的桌面窗口当成手机。
 */
export function isTouchDevice(): boolean {
  if (Platform.OS !== "web") return !Platform.isTV;
  return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
}

/**
 * 手机横屏：触摸设备、最短边小于 600、宽大于高。
 */
export function isPhoneLandscape(width: number, height: number, touch: boolean = isTouchDevice()): boolean {
  return touch && width > height && Math.min(width, height) < PHONE_SHORT_SIDE_LIMIT;
}

/**
 * 根据窗口尺寸判断设备类型。手机在横竖屏下都返回 mobile。
 */
export function classifyDevice(
  width: number,
  height: number,
  options: { touch?: boolean; tv?: boolean } = {}
): DeviceType {
  const tv = options.tv ?? !!Platform.isTV;
  const touch = options.touch ?? isTouchDevice();

  if (tv) return "tv";
  if (touch && Math.min(width, height) < PHONE_SHORT_SIDE_LIMIT) return "mobile";
  if (width >= 1024) return "tv";
  if (width >= 768) return "tablet";
  return "mobile";
}

export const DeviceUtils = {
  /**
   * 检测当前设备类型
   */
  getDeviceType(): DeviceType {
    const { width, height } = Dimensions.get("window");
    return classifyDevice(width, height);
  },

  /**
   * 检测是否为TV环境
   */
  isTV(): boolean {
    return this.getDeviceType() === "tv";
  },

  /**
   * 检测是否为移动设备
   */
  isMobile(): boolean {
    return this.getDeviceType() === "mobile";
  },

  /**
   * 检测是否为平板设备
   */
  isTablet(): boolean {
    return this.getDeviceType() === "tablet";
  },

  /**
   * 检测是否支持触摸交互
   */
  supportsTouchInteraction(): boolean {
    return !this.isTV();
  },

  /**
   * 检测是否支持遥控器交互
   */
  supportsRemoteControlInteraction(): boolean {
    return this.isTV();
  },

  /**
   * 获取最小触摸目标尺寸
   */
  getMinTouchTargetSize(): number {
    const deviceType = this.getDeviceType();
    switch (deviceType) {
      case "mobile":
        return 44; // iOS HIG minimum
      case "tablet":
        return 48; // Material Design minimum
      case "tv":
        return 60; // TV optimized
      default:
        return 44;
    }
  },

  /**
   * 获取适合的文字大小
   */
  getOptimalFontSize(baseSize: number): number {
    const deviceType = this.getDeviceType();
    const scaleFactor = {
      mobile: 1.0,
      tablet: 1.1,
      tv: 1.25,
    }[deviceType];

    return Math.round(baseSize * scaleFactor);
  },

  /**
   * 获取适合的间距
   */
  getOptimalSpacing(baseSpacing: number): number {
    const deviceType = this.getDeviceType();
    const scaleFactor = {
      mobile: 0.8,
      tablet: 1.0,
      tv: 1.5,
    }[deviceType];

    return Math.round(baseSpacing * scaleFactor);
  },

  /**
   * 检测设备是否处于横屏模式
   */
  isLandscape(): boolean {
    const { width, height } = Dimensions.get("window");
    return width > height;
  },

  /**
   * 检测设备是否处于竖屏模式
   */
  isPortrait(): boolean {
    return !this.isLandscape();
  },

  /**
   * 获取安全的网格列数
   */
  getSafeColumnCount(preferredColumns: number): number {
    const { width } = Dimensions.get("window");
    const minCardWidth = this.isMobile() ? 120 : this.isTablet() ? 140 : 160;
    const maxColumns = Math.floor(width / minCardWidth);

    return Math.min(preferredColumns, maxColumns);
  },

  /**
   * 获取设备特定的动画持续时间
   */
  getAnimationDuration(baseDuration: number): number {
    const deviceType = this.getDeviceType();
    // TV端动画稍慢，更符合10英尺体验
    const scaleFactor = {
      mobile: 1.0,
      tablet: 1.0,
      tv: 1.2,
    }[deviceType];

    return Math.round(baseDuration * scaleFactor);
  },
};

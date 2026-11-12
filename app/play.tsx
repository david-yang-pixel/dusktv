import React, { useEffect, useRef, useCallback, useMemo, useState, memo } from "react";
import { StyleSheet, TouchableOpacity, BackHandler, AppState, AppStateStatus, Platform, StatusBar, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video } from "expo-av";
import { useKeepAwake } from "expo-keep-awake";
import { CinemaButton, CinemaState } from '@/components/cinema/CinemaUI';
import { CinemaPlayerStage } from '@/components/cinema/CinemaPlayer';
import { ThemedView } from "@/components/ThemedView";
import { PlayerControls, TouchPlayerControls, TouchPlayerPanel } from "@/components/PlayerControls";
import { EpisodeSelectionModal } from "@/components/EpisodeSelectionModal";
import { SourceSelectionModal } from "@/components/SourceSelectionModal";
import { SpeedSelectionModal } from "@/components/SpeedSelectionModal";
import { SeekingBar } from "@/components/SeekingBar";
// import { NextEpisodeOverlay } from "@/components/NextEpisodeOverlay";
import VideoLoadingAnimation from "@/components/VideoLoadingAnimation";
import useDetailStore from "@/stores/detailStore";
import { useTVRemoteHandler } from "@/hooks/useTVRemoteHandler";
import Toast from "react-native-toast-message";
import usePlayerStore, { selectCurrentEpisode } from "@/stores/playerStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useVideoHandlers } from "@/hooks/useVideoHandlers";
import Logger from '@/utils/Logger';

const logger = Logger.withTag('PlayScreen');

// 屏幕方向模块在 Apple TV 上没有原生实现，顶层 import 会在加载时直接报错，所以只在非 TV 设备上按需加载
type ScreenOrientationModule = typeof import("expo-screen-orientation");
const loadScreenOrientation = (): ScreenOrientationModule | null => {
  if (Platform.isTV) return null;
  try {
    return require("expo-screen-orientation");
  } catch {
    return null;
  }
};

// 优化的加载动画组件
const LoadingContainer = memo(
  ({ style, currentEpisode }: { style: any; currentEpisode: { url: string; title: string } | undefined }) => {
    logger.info(
      `[PERF] Video component NOT rendered - waiting for valid URL. currentEpisode: ${!!currentEpisode}, url: ${
        currentEpisode?.url ? "exists" : "missing"
      }`
    );
    return (
      <View style={style}>
        <VideoLoadingAnimation showProgressBar />
      </View>
    );
  }
);

LoadingContainer.displayName = "LoadingContainer";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});

export default function PlayScreen() {
  const videoRef = useRef<Video>(null);
  const router = useRouter();
  useKeepAwake();

  // 响应式布局配置
  const { deviceType, isPortrait } = useResponsiveLayout();
  // 触摸设备：竖屏时视频在上、选集面板在下；横屏时全屏沉浸播放
  const touch = deviceType !== "tv";
  const stacked = touch && isPortrait;

  // 全屏按钮：把屏幕锁到横屏或竖屏。系统关闭了自动旋转时，这是进入全屏的唯一办法
  const screenOrientation = useMemo(loadScreenOrientation, []);
  // 只有用按钮进入的全屏才算；用户自己把手机转成横屏不算
  const [enteredFullscreen, setEnteredFullscreen] = useState(false);
  const setFullscreen = useCallback(async (fullscreen: boolean) => {
    if (!screenOrientation) return;
    try {
      const { LANDSCAPE, PORTRAIT_UP } = screenOrientation.OrientationLock;
      await screenOrientation.lockAsync(fullscreen ? LANDSCAPE : PORTRAIT_UP);
      setEnteredFullscreen(fullscreen);
    } catch (error) {
      logger.warn("Failed to change screen orientation:", error);
    }
  }, [screenOrientation]);
  // 离开播放页时把屏幕方向交还给系统
  useEffect(() => () => { screenOrientation?.unlockAsync().catch(() => {}); }, [screenOrientation]);

  const {
    episodeIndex: episodeIndexStr,
    position: positionStr,
    source: sourceStr,
    id: videoId,
    title: videoTitle,
  } = useLocalSearchParams<{
    episodeIndex: string;
    position?: string;
    source?: string;
    id?: string;
    title?: string;
  }>();
  const episodeIndex = parseInt(episodeIndexStr || "0", 10);
  const position = positionStr ? parseInt(positionStr, 10) : undefined;

  const { detail } = useDetailStore();
  const source = sourceStr || detail?.source;
  const id = videoId || detail?.id.toString();
  const title = videoTitle || detail?.title;
  const {
    isLoading,
    showControls,
    // showNextEpisodeOverlay,
    initialPosition,
    introEndTime,
    playbackRate,
    setVideoRef,
    handlePlaybackStatusUpdate,
    setShowControls,
    // setShowNextEpisodeOverlay,
    reset,
    loadVideo,
  } = usePlayerStore();
  const currentEpisode = usePlayerStore(selectCurrentEpisode);

  // 使用Video事件处理hook
  const { videoProps } = useVideoHandlers({
    videoRef,
    currentEpisode,
    initialPosition,
    introEndTime,
    playbackRate,
    handlePlaybackStatusUpdate,
    detail: detail || undefined,
  });

  // TV遥控器处理 - 总是调用hook，但根据设备类型决定是否使用结果
  const tvRemoteHandler = useTVRemoteHandler();

  useEffect(() => {
    const perfStart = performance.now();
    logger.info(`[PERF] PlayScreen useEffect START - source: ${source}, id: ${id}, title: ${title}`);

    setVideoRef(videoRef);
    if (source && id && title) {
      logger.info(`[PERF] Calling loadVideo with episodeIndex: ${episodeIndex}, position: ${position}`);
      loadVideo({ source, id, episodeIndex, position, title });
    } else {
      logger.info(`[PERF] Missing required params - source: ${!!source}, id: ${!!id}, title: ${!!title}`);
    }

    const perfEnd = performance.now();
    logger.info(`[PERF] PlayScreen useEffect END - took ${(perfEnd - perfStart).toFixed(2)}ms`);

    return () => {
      logger.info(`[PERF] PlayScreen unmounting - calling reset()`);
      reset(); // Reset state when component unmounts
    };
  }, [episodeIndex, source, position, setVideoRef, reset, loadVideo, id, title]);

  // 优化的屏幕点击处理
  const onScreenPress = useCallback(() => {
    if (deviceType === "tv") {
      tvRemoteHandler.onScreenPress();
    } else {
      setShowControls(!showControls);
    }
  }, [deviceType, tvRemoteHandler, setShowControls, showControls]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        videoRef.current?.pauseAsync();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // 返回：用按钮进入的全屏先退回竖屏，否则离开播放页
  const leave = useCallback(() => {
    if (touch && enteredFullscreen && !stacked) {
      setFullscreen(false);
    } else {
      router.back();
    }
  }, [touch, enteredFullscreen, stacked, setFullscreen, router]);

  useEffect(() => {
    const backAction = () => {
      // TV 上先收起控制栏；触摸设备上直接走 leave
      if (showControls && !touch) {
        setShowControls(false);
        return true;
      }
      leave();
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => backHandler.remove();
  }, [showControls, setShowControls, leave, touch]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isLoading) {
      timeoutId = setTimeout(() => {
        if (usePlayerStore.getState().isLoading) {
          usePlayerStore.setState({ isLoading: false });
          Toast.show({ type: "error", text1: "播放超时，请重试" });
        }
      }, 60000); // 1 minute
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading]);

  if (!isLoading && (!detail || !currentEpisode?.url)) {
    return <ThemedView style={styles.container}><CinemaState title="影片暂时无法播放" message="没有取得可用的播放地址，请重试或返回选择其他片源。" action={<View style={{ flexDirection: 'row', gap: 12 }}><CinemaButton label="返回影片" onPress={() => router.back()} /><CinemaButton label="重试播放" primary disabled={!source || !id || !title} onPress={() => { if (source && id && title) loadVideo({ source, id, title, episodeIndex, position }); }} /></View>} /></ThemedView>;
  }

  if (!detail) {
    return <VideoLoadingAnimation showProgressBar />;
  }

  // Video 在所有设备和方向下都处于同一棵组件树的同一位置，旋转屏幕不会重新挂载视频
  const video = (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.videoContainer}
      onPress={onScreenPress}
      disabled={touch && showControls} // 触摸设备显示控制层时，由控制层自己处理点击
    >
      {/* 条件渲染Video组件：只有在有有效URL时才渲染 */}
      {currentEpisode?.url ? (
        <Video ref={videoRef} style={styles.videoPlayer} {...videoProps} />
      ) : (
        <LoadingContainer style={styles.loadingContainer} currentEpisode={currentEpisode} />
      )}

      {/* 触摸控制层自带可拖动进度条，只有 TV 需要这个快进提示 */}
      {!touch && <SeekingBar />}

      {/* 只在Video组件存在且正在加载时显示加载动画覆盖层 */}
      {currentEpisode?.url && isLoading && (
        <View style={styles.loadingContainer}>
          <VideoLoadingAnimation showProgressBar />
        </View>
      )}

      {/* <NextEpisodeOverlay visible={showNextEpisodeOverlay} onCancel={() => setShowNextEpisodeOverlay(false)} /> */}
    </TouchableOpacity>
  );
  const overlay = !showControls ? null : touch ? (
    <TouchPlayerControls
      immersive={!stacked}
      onInteract={tvRemoteHandler.resetTimer}
      onBack={leave}
      onFullscreen={screenOrientation ? () => setFullscreen(stacked) : undefined}
    />
  ) : (
    <PlayerControls showControls={showControls} setShowControls={setShowControls} />
  );

  return (
    <ThemedView focusable style={styles.container}>
      <StatusBar hidden={touch && !stacked} />
      <CinemaPlayerStage stacked={stacked} video={video} overlay={overlay} panel={<TouchPlayerPanel />} />
      <EpisodeSelectionModal />
      <SourceSelectionModal />
      <SpeedSelectionModal />
    </ThemedView>
  );
}

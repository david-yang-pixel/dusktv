export const UPDATE_CONFIG = {
  // 启动时自动检查更新
  AUTO_CHECK: true,

  // 检查更新间隔（毫秒）
  CHECK_INTERVAL: 12 * 60 * 60 * 1000, // 12小时

  // 发布 APK 的仓库。更新检查读这个仓库的最新 Release（由 build-apk 工作流在合并到 main 后自动发布）
  GITHUB_REPO: "david-yang-pixel/dusktv",

  // 最新正式版（不含 pre-release 和草稿）
  get LATEST_RELEASE_URL(): string {
    return `https://api.github.com/repos/${this.GITHUB_REPO}/releases/latest`;
  },

  // Release 里没有列出 APK 附件时的兜底地址，与 build-apk 工作流的命名一致
  getDownloadUrl(version: string): string {
    return `https://github.com/${this.GITHUB_REPO}/releases/download/v${version}/dusktv.${version}.apk`;
  },

  // 是否显示更新日志
  SHOW_RELEASE_NOTES: true,

  // 是否允许跳过版本
  ALLOW_SKIP_VERSION: true,

  // 下载超时时间（毫秒）
  DOWNLOAD_TIMEOUT: 10 * 60 * 1000, // 10分钟

  // 是否在WIFI下自动下载
  AUTO_DOWNLOAD_ON_WIFI: false,

  // 更新通知设置
  NOTIFICATION: {
    ENABLED: true,
    TITLE: "暮映 DuskTV 更新",
    DOWNLOADING_TEXT: "正在下载新版本...",
    DOWNLOAD_COMPLETE_TEXT: "下载完成，点击安装",
  },
};

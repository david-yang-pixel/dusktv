import updateService from '../updateService';
import { useUpdateStore } from '@/stores/updateStore';
import { UPDATE_CONFIG } from '@/constants/UpdateConfig';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-intent-launcher', () => ({}));
jest.mock('react-native-toast-message', () => ({ __esModule: true, default: { show: jest.fn() } }));
// The running app is build 0.1.0.5.
jest.mock('../../package.json', () => ({ version: '0.1.0.5' }));

const release = (tag: string, assets = [{ name: `dusktv.${tag.replace(/^v/, '')}.apk`, browser_download_url: `https://example.test/${tag}.apk` }]) => ({ tag_name: tag, prerelease: false, draft: false, assets });
const respond = (body: unknown, ok = true, status = 200) => jest.fn(async () => ({ ok, status, json: async () => body }));
const showToast = Toast.show as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useUpdateStore.setState({ updateAvailable: false, remoteVersion: '', downloadUrl: '', showUpdateModal: false, isLatestVersion: false, error: null, skipVersion: null });
});

describe('checking for an update', () => {
  test('asks this repository for its latest release, not a package.json on some branch', async () => {
    global.fetch = respond(release('v0.1.0.6')) as never;
    const info = await updateService.checkVersion();
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://api.github.com/repos/david-yang-pixel/dusktv/releases/latest');
    expect(UPDATE_CONFIG.GITHUB_REPO).toBe('david-yang-pixel/dusktv');
    expect(info).toEqual({ version: '0.1.0.6', downloadUrl: 'https://example.test/v0.1.0.6.apk' });
  });

  test('downloads the APK attached to the release, whatever else is attached', async () => {
    global.fetch = respond(release('v0.1.0.7', [
      { name: 'notes.txt', browser_download_url: 'https://example.test/notes.txt' },
      { name: 'dusktv.0.1.0.7.apk', browser_download_url: 'https://example.test/the.apk' },
    ])) as never;
    expect((await updateService.checkVersion()).downloadUrl).toBe('https://example.test/the.apk');
  });

  test('falls back to the conventional asset address when the release lists no APK', async () => {
    global.fetch = respond(release('v0.1.0.7', [])) as never;
    expect((await updateService.checkVersion()).downloadUrl).toBe('https://github.com/david-yang-pixel/dusktv/releases/download/v0.1.0.7/dusktv.0.1.0.7.apk');
  });

  test('compares build numbers numerically, so 0.1.0.10 is newer than 0.1.0.9', () => {
    expect(updateService.isUpdateAvailable('0.1.0.6')).toBe(true);
    expect(updateService.isUpdateAvailable('0.1.0.10')).toBe(true);
    expect(updateService.isUpdateAvailable('0.1.0.5')).toBe(false);
    expect(updateService.isUpdateAvailable('0.1.0.4')).toBe(false);
    expect(updateService.isUpdateAvailable('0.1.0')).toBe(false);
  });
});

describe('the check at launch', () => {
  test('offers a newer release without being asked', async () => {
    global.fetch = respond(release('v0.1.0.6')) as never;
    await useUpdateStore.getState().checkForUpdate(true);
    const state = useUpdateStore.getState();
    expect(state.updateAvailable).toBe(true);
    expect(state.remoteVersion).toBe('0.1.0.6');
    expect(state.downloadUrl).toBe('https://example.test/v0.1.0.6.apk');
    expect(state.showUpdateModal).toBe(true);
  });

  test('stays quiet when already up to date', async () => {
    global.fetch = respond(release('v0.1.0.5')) as never;
    await useUpdateStore.getState().checkForUpdate(true);
    expect(useUpdateStore.getState().showUpdateModal).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  test('does not nag about a release the viewer chose to skip', async () => {
    await AsyncStorage.setItem('update_skip_version', '0.1.0.6');
    global.fetch = respond(release('v0.1.0.6')) as never;
    await useUpdateStore.getState().checkForUpdate(true);
    expect(useUpdateStore.getState().updateAvailable).toBe(true);
    expect(useUpdateStore.getState().showUpdateModal).toBe(false);
  });

  test('stays quiet when GitHub cannot be reached, and tries only once', async () => {
    global.fetch = jest.fn(async () => { throw new Error('network down'); }) as never;
    await useUpdateStore.getState().checkForUpdate(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
    expect(useUpdateStore.getState().showUpdateModal).toBe(false);
  });
});

describe('the check from settings', () => {
  test('says so when already up to date', async () => {
    global.fetch = respond(release('v0.1.0.5')) as never;
    await useUpdateStore.getState().checkForUpdate(false);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ text1: '已是最新版本' }));
  });

  test('explains when the repository has not published a release yet', async () => {
    global.fetch = respond({ message: 'Not Found' }, false, 404) as never;
    await useUpdateStore.getState().checkForUpdate(false);
    expect(useUpdateStore.getState().error).toBeTruthy();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });
});

describe('updating', () => {
  afterEach(() => jest.restoreAllMocks());

  test('one tap downloads the release and then opens the installer', async () => {
    const download = jest.spyOn(updateService, 'downloadApk').mockImplementation(async (_url, onProgress) => { onProgress?.(60); return 'file:///files/DuskTV.apk'; });
    const install = jest.spyOn(updateService, 'installApk').mockResolvedValue();
    useUpdateStore.setState({ downloadUrl: 'https://example.test/v0.1.0.6.apk', showUpdateModal: true, downloadedPath: null });
    await useUpdateStore.getState().startDownload();
    expect(download).toHaveBeenCalledWith('https://example.test/v0.1.0.6.apk', expect.any(Function));
    expect(install).toHaveBeenCalledWith('file:///files/DuskTV.apk');
    expect(useUpdateStore.getState().downloading).toBe(false);
  });

  test('a failed download does not open the installer and says why', async () => {
    jest.spyOn(updateService, 'downloadApk').mockRejectedValue(new Error('下载中断'));
    const install = jest.spyOn(updateService, 'installApk').mockResolvedValue();
    useUpdateStore.setState({ downloadUrl: 'https://example.test/v0.1.0.6.apk', showUpdateModal: true, downloadedPath: null });
    await useUpdateStore.getState().startDownload();
    expect(install).not.toHaveBeenCalled();
    expect(useUpdateStore.getState().error).toBe('下载中断');
    expect(useUpdateStore.getState().showUpdateModal).toBe(true);
  });
});

test('checks automatically', () => {
  expect(UPDATE_CONFIG.AUTO_CHECK).toBe(true);
});

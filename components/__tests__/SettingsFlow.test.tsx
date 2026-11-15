import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import SettingsScreen from '@/app/settings';
import CinemaSettings from '@/components/cinema/CinemaSettings';

const mockNavigate = jest.fn();
const mockBack = jest.fn();
let mockBeforeRemove: (event: any) => void;
let mockPreventRemove = false;
const mockStack = { dispatch: jest.fn() };
const mockSettings = {
  apiBaseUrl: 'https://saved.example', m3uUrl: '', remoteInputEnabled: false, serverConfig: { StorageType: 'redis' } as { StorageType: string } | null,
  loadSettings: jest.fn(async () => {}), saveSettings: jest.fn(async () => {}),
  setApiBaseUrl: jest.fn((value: string) => { mockSettings.apiBaseUrl = value; }),
  setM3uUrl: jest.fn((value: string) => { mockSettings.m3uUrl = value; }),
  setRemoteInputEnabled: jest.fn((value: boolean) => { mockSettings.remoteInputEnabled = value; }),
};
const mockLayout = { deviceType: 'tv' };
jest.mock('@/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => mockLayout }));
jest.mock('@/components/cinema/CinemaSettings', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/settings/UpdateSection', () => ({ UpdateSection: () => null }));
jest.mock('@/hooks/useCinemaNavigation', () => ({ useCinemaNavigation: () => ({ onNavigate: mockNavigate, onBack: mockBack }) }));
jest.mock('@react-navigation/native', () => ({ UNSTABLE_usePreventRemove: (prevent: boolean, callback: (event: any) => void) => { mockPreventRemove = prevent; mockBeforeRemove = callback; } }));
jest.mock('expo-router', () => ({ useNavigation: () => mockStack }));
jest.mock('@/stores/settingsStore', () => ({ useSettingsStore: Object.assign(() => mockSettings, { getState: () => mockSettings }) }));
jest.mock('@/stores/remoteControlStore', () => ({ useRemoteControlStore: () => ({ lastMessage: '', targetPage: '', clearMessage: jest.fn() }) }));
const mockCheckLoginStatus = jest.fn(async () => {});
const mockLogin = jest.fn(async (_username?: string, _password?: string) => ({ ok: true }));
const mockSaveCredentials = jest.fn(async (_credentials: { username: string; password: string }) => {});
const mockRefreshPlayRecords = jest.fn(async () => {});
jest.mock('@/stores/authStore', () => ({ __esModule: true, default: () => ({ isLoggedIn: false, showLoginModal: jest.fn(), logout: jest.fn(), checkLoginStatus: mockCheckLoginStatus }) }));
jest.mock('@/stores/homeStore', () => ({ __esModule: true, default: { getState: () => ({ refreshPlayRecords: mockRefreshPlayRecords }) } }));
jest.mock('@/services/api', () => ({ api: { login: (username?: string, password?: string) => mockLogin(username, password) } }));
jest.mock('@/services/storage', () => ({ LoginCredentialsManager: { save: (credentials: { username: string; password: string }) => mockSaveCredentials(credentials) } }));
jest.mock('react-native-toast-message', () => ({ __esModule: true, default: { show: jest.fn() } }));
let tree: ReactTestRenderer;
const props = () => tree.root.findByType(CinemaSettings).props;
beforeEach(async () => {
  mockLayout.deviceType = 'tv';
  jest.clearAllMocks(); mockSettings.apiBaseUrl = 'https://saved.example'; mockSettings.m3uUrl = ''; mockSettings.remoteInputEnabled = false; mockSettings.serverConfig = { StorageType: 'redis' };
  mockLogin.mockImplementation(async () => ({ ok: true }));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await act(async () => { tree = create(<SettingsScreen />); });
});
afterEach(() => { act(() => tree.unmount()); jest.restoreAllMocks(); });

test('editing stays local until save commits the draft', async () => {
  act(() => { props().onApiChange('https://new.example'); props().onRemoteChange(true); });
  expect(mockSettings.setApiBaseUrl).not.toHaveBeenCalled();
  expect(mockSettings.setRemoteInputEnabled).not.toHaveBeenCalled();
  expect(props().dirty).toBe(true);
  await act(async () => props().onSave());
  expect(mockSettings.setApiBaseUrl).toHaveBeenCalledWith('https://new.example');
  expect(mockSettings.setRemoteInputEnabled).toHaveBeenCalledWith(true);
  expect(mockSettings.saveSettings).toHaveBeenCalledTimes(1);
  expect(props().dirty).toBe(false);
});

test('navigation asks to discard and retains the persisted configuration', () => {
  act(() => props().onApiChange('https://unsaved.example'));
  act(() => props().onNavigate('home'));
  expect(mockNavigate).not.toHaveBeenCalled();
  const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  act(() => actions.find((action: { text: string }) => action.text === '放弃更改').onPress());
  expect(mockSettings.apiBaseUrl).toBe('https://saved.example');
  expect(mockSettings.setApiBaseUrl).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('home');
});

test('stack back is intercepted while a draft is dirty', () => {
  act(() => props().onM3uChange('https://unsaved.example/list.m3u'));
  const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
  act(() => mockBeforeRemove(event));
  expect(mockPreventRemove).toBe(true); expect(mockStack.dispatch).not.toHaveBeenCalled();
  const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  act(() => actions.find((action: { text: string }) => action.text === '放弃更改').onPress());
  expect(mockStack.dispatch).toHaveBeenCalledWith(event.data.action);
});

describe('signing in from settings', () => {
  const fill = (api: string, username: string, password: string) => act(() => { props().onApiChange(api); props().account.onUsername(username); props().account.onPassword(password); });

  test('address, username and password are saved and signed in with one save', async () => {
    fill('https://new.example', 'me', 'secret');
    expect(mockLogin).not.toHaveBeenCalled();
    await act(async () => props().onSave());
    expect(mockSettings.saveSettings).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith('me', 'secret');
    // The address must be saved before the login request goes out, or it reaches the old server.
    expect(mockSettings.saveSettings.mock.invocationCallOrder[0]).toBeLessThan(mockLogin.mock.invocationCallOrder[0]);
    expect(mockSaveCredentials).toHaveBeenCalledWith({ username: 'me', password: 'secret' });
    expect(mockCheckLoginStatus).toHaveBeenCalledWith('https://new.example');
    expect(mockRefreshPlayRecords).toHaveBeenCalled();
    expect(props().dirty).toBe(false);
    expect(props().account.password).toBe('');
    expect(props().account.error).toBeFalsy();
  });

  test('a password-only server signs in without a username', async () => {
    mockSettings.serverConfig = { StorageType: 'localstorage' };
    fill('https://new.example', '', 'secret');
    await act(async () => props().onSave());
    expect(mockLogin).toHaveBeenCalledWith(undefined, 'secret');
  });

  test('a rejected password keeps the saved address, explains, and stays ready to retry', async () => {
    mockLogin.mockImplementation(async () => { throw new Error('UNAUTHORIZED'); });
    fill('https://new.example', 'me', 'wrong');
    await act(async () => props().onSave());
    expect(mockSettings.saveSettings).toHaveBeenCalledTimes(1);
    expect(mockSaveCredentials).not.toHaveBeenCalled();
    expect(props().account.error).toMatch(/用户名或密码/);
    expect(props().account.password).toBe('wrong');
    expect(props().dirty).toBe(true);
  });

  test('an unreachable server is reported instead of sending the password nowhere', async () => {
    mockSettings.serverConfig = null;
    fill('https://down.example', 'me', 'secret');
    await act(async () => props().onSave());
    expect(mockLogin).not.toHaveBeenCalled();
    expect(props().account.error).toMatch(/连接不上/);
  });

  test('a username without a password asks for the password', async () => {
    fill('https://new.example', 'me', '');
    await act(async () => props().onSave());
    expect(mockLogin).not.toHaveBeenCalled();
    expect(props().account.error).toMatch(/密码/);
  });

  test('saving without credentials does not attempt to sign in', async () => {
    act(() => props().onM3uChange('https://new.example/list.m3u'));
    await act(async () => props().onSave());
    expect(mockLogin).not.toHaveBeenCalled();
    expect(props().dirty).toBe(false);
  });
});

test('a phone is not offered remote input, because the service only runs on larger screens', async () => {
  expect(props().remoteAvailable).toBe(true);
  act(() => tree.unmount());
  mockLayout.deviceType = 'mobile';
  await act(async () => { tree = create(<SettingsScreen />); });
  expect(props().remoteAvailable).toBe(false);
});

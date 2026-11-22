import useHomeStore from '@/stores/homeStore';

const mockGetDoubanData = jest.fn();
jest.mock('@/services/api', () => ({ api: { getDoubanData: (...args: unknown[]) => mockGetDoubanData(...args) } }));
jest.mock('@/services/storage', () => ({ PlayRecordManager: { getAll: jest.fn(async () => ({})) } }));
jest.mock('@/stores/authStore', () => ({ __esModule: true, default: { getState: () => ({ isLoggedIn: true, checkLoginStatus: jest.fn(async () => {}) }) } }));
jest.mock('@/stores/settingsStore', () => ({ useSettingsStore: { getState: () => ({ apiBaseUrl: 'https://server.example' }) } }));

const page = (...titles: string[]) => ({ list: titles.map(title => ({ title, poster: '' })) });
const titles = () => useHomeStore.getState().contentData.map(item => item.title);
// Each test gets its own category, so one test's cached page never answers for another.
let serial = 0;
const openCategory = async (first: ReturnType<typeof page>) => {
  mockGetDoubanData.mockResolvedValueOnce(first);
  useHomeStore.setState({ selectedCategory: { title: `分类 ${++serial}`, type: 'movie', tag: `标签 ${serial}` }, contentData: [], pageStart: 0, hasMore: true, loadingMore: false, error: null });
  await useHomeStore.getState().fetchInitialData();
};

describe('refreshing the home feed', () => {
  beforeEach(() => mockGetDoubanData.mockReset());

  test('asks the server for the first page again instead of reusing what was loaded', async () => {
    await openCategory(page('旧片一', '旧片二'));
    await useHomeStore.getState().fetchInitialData();
    expect(mockGetDoubanData).toHaveBeenCalledTimes(1);

    mockGetDoubanData.mockResolvedValueOnce(page('新片'));
    await useHomeStore.getState().refreshData();
    expect(mockGetDoubanData).toHaveBeenCalledTimes(2);
    expect(mockGetDoubanData.mock.calls[1][3]).toBe(0);
    expect(titles()).toEqual(['新片']);
    expect(useHomeStore.getState().pageStart).toBe(1);
  });

  test('keeps the current list on screen until the new one arrives', async () => {
    await openCategory(page('旧片一', '旧片二'));
    let deliver!: (value: unknown) => void;
    mockGetDoubanData.mockReturnValueOnce(new Promise(resolve => { deliver = resolve; }));
    const refresh = useHomeStore.getState().refreshData();
    await Promise.resolve(); await Promise.resolve();
    expect(useHomeStore.getState().refreshing).toBe(true);
    expect(useHomeStore.getState().loading).toBe(false);
    expect(titles()).toEqual(['旧片一', '旧片二']);
    deliver(page('新片'));
    await refresh;
    expect(useHomeStore.getState().refreshing).toBe(false);
    expect(titles()).toEqual(['新片']);
  });

  test('a refresh that fails says so and stops the spinner', async () => {
    await openCategory(page('旧片一'));
    mockGetDoubanData.mockRejectedValueOnce(new Error('Network request failed'));
    await useHomeStore.getState().refreshData();
    expect(useHomeStore.getState().refreshing).toBe(false);
    expect(useHomeStore.getState().error).toBe('网络连接失败，请检查网络连接');
  });

  test('a pull during the first load does not start a second request', async () => {
    await openCategory(page('旧片一'));
    useHomeStore.setState({ loading: true });
    await useHomeStore.getState().refreshData();
    expect(mockGetDoubanData).toHaveBeenCalledTimes(1);
    expect(useHomeStore.getState().refreshing).toBe(false);
    useHomeStore.setState({ loading: false });
  });

  test('a second pull while one is running does not fetch twice', async () => {
    await openCategory(page('旧片一'));
    let deliver!: (value: unknown) => void;
    mockGetDoubanData.mockReturnValueOnce(new Promise(resolve => { deliver = resolve; }));
    const first = useHomeStore.getState().refreshData();
    await Promise.resolve(); await Promise.resolve();
    await useHomeStore.getState().refreshData();
    expect(mockGetDoubanData).toHaveBeenCalledTimes(2);
    deliver(page('新片'));
    await first;
  });
});

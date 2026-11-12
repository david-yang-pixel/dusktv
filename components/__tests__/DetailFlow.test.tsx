import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import DetailScreen from '@/app/detail';
import CinemaDetail from '@/components/cinema/CinemaDetail';

const mockPush = jest.fn();
const mockStore = {
  detail: { id: 7, source: 'fast', source_name: '最先返回的源', title: '测试剧集', poster: '', episodes: ['a', 'b'] },
  searchResults: [] as unknown[], loading: false, error: null, allSourcesLoaded: false, isFavorited: false,
  init: jest.fn(async () => {}), setDetail: jest.fn(), abort: jest.fn(), toggleFavorite: jest.fn(),
};
jest.mock('@/components/cinema/CinemaDetail', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useLocalSearchParams: () => ({ q: '测试剧集', source: 'fast' }) }));
jest.mock('@/hooks/useCinemaNavigation', () => ({ useCinemaNavigation: () => ({ onNavigate: jest.fn(), onBack: jest.fn() }) }));
jest.mock('@/stores/detailStore', () => ({ __esModule: true, default: () => mockStore }));
jest.mock('@/services/api', () => ({ api: { getImageProxyUrl: (url: string) => url } }));

let tree: ReactTestRenderer;
const props = () => tree.root.findByType(CinemaDetail).props;
beforeEach(async () => { jest.clearAllMocks(); await act(async () => { tree = create(<DetailScreen />); }); });

test('starting playback keeps the source search running, so the other sources still arrive', () => {
  expect(props().sourcesLoading).toBe(true);
  act(() => props().onPlay(1));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/play', params: { title: '测试剧集', source: 'fast', id: '7', episodeIndex: '1' } });
  expect(mockStore.abort).not.toHaveBeenCalled();
});

test('leaving the detail page stops the search', () => {
  act(() => tree.unmount());
  expect(mockStore.abort).toHaveBeenCalledTimes(1);
});

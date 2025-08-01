import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useNetworkAwareQuery } from '../use-network-aware-query';
import { useNetworkStatus } from '../use-network-status';
import * as React from 'react';

// Unmock React Query for this test file since we want to test the actual functionality
jest.unmock('@tanstack/react-query');

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock fetch
global.fetch = jest.fn();

// Mock toast
const mockToast = jest.fn();
jest.mock('../use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('Network Failure Handling', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    // Clear all mocks and timers
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Reset navigator.onLine to default online state
    (navigator as any).onLine = true;
    
    // Reset fetch mock to successful by default
    (fetch as jest.Mock).mockResolvedValue({ ok: true });
    
    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retry for testing by default
          gcTime: 0, // Disable caching for testing
          staleTime: 0, // Make data immediately stale
        },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => 
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  });

  afterEach(async () => {
    // Clear all cached queries and reset state if queryClient exists
    if (queryClient) {
      queryClient.clear();
      queryClient.getQueryCache().clear();
      queryClient.getMutationCache().clear();
    }
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Small delay to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('useNetworkStatus', () => {
    it('should detect when device goes offline', async () => {
      const { result } = renderHook(() => useNetworkStatus(), { wrapper });
      
      expect(result.current.isOnline).toBe(true);
      
      // Simulate going offline
      act(() => {
        (navigator as any).onLine = false;
        window.dispatchEvent(new Event('offline'));
      });
      
      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should detect when device comes back online', async () => {
      // Start offline
      (navigator as any).onLine = false;
      
      const { result } = renderHook(() => useNetworkStatus(), { wrapper });
      
      expect(result.current.isOnline).toBe(false);
      
      // Mock successful connectivity check
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      
      // Simulate coming back online
      act(() => {
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));
      });
      
      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });

    it('should perform connectivity checks', async () => {
      const { result } = renderHook(() => useNetworkStatus(), { wrapper });
      
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      
      await act(async () => {
        const isConnected = await result.current.checkConnectivity();
        expect(isConnected).toBe(true);
      });
      
      expect(fetch).toHaveBeenCalledWith('/favicon.ico', expect.objectContaining({
        method: 'HEAD',
        cache: 'no-cache',
      }));
    });

    it('should handle connectivity check failures', async () => {
      const { result } = renderHook(() => useNetworkStatus(), { wrapper });
      
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await act(async () => {
        const isConnected = await result.current.checkConnectivity();
        expect(isConnected).toBe(false);
      });
    });
  });

  describe('useNetworkAwareQuery', () => {
    const mockQueryFn = jest.fn();

    beforeEach(() => {
      mockQueryFn.mockClear();
    });

    it('should execute query when online', async () => {
      // Mock to return the value multiple times since it's called by both queries
      mockQueryFn.mockResolvedValue({ data: 'test' });
      
      const { result } = renderHook(
        () => {
          const networkQuery = useNetworkAwareQuery({
            queryKey: ['test'],
            queryFn: mockQueryFn,
          });
          
          return { networkQuery };
        },
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.networkQuery.isSuccess).toBe(true);
      });
      
      expect(mockQueryFn).toHaveBeenCalled();
      expect(result.current.networkQuery.data).toEqual({ data: 'test' });
    });

    it('should use fallback data when offline', async () => {
      (navigator as any).onLine = false;
      
      const fallbackData = { data: 'offline fallback' };
      
      const { result } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['test'],
          queryFn: mockQueryFn,
          offlineFallback: fallbackData,
        }),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      expect(result.current.data).toEqual(fallbackData);
      expect(mockQueryFn).not.toHaveBeenCalled();
    });

    it('should detect network errors', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Network connection failed'));
      
      const { result } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      
      expect(result.current.isNetworkError).toBe(true);
    });

    it('should retry when network comes back online', async () => {
      // Start offline
      (navigator as any).onLine = false;
      
      const { result } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['test'],
          queryFn: mockQueryFn,
          retryOnReconnect: true,
        }),
        { wrapper }
      );
      
      // Mock successful query after reconnection
      mockQueryFn.mockResolvedValue({ data: 'reconnected' });
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      
      // Simulate coming back online
      await act(async () => {
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));
        // Wait for the 1-second delay in the hook plus some buffer
        await new Promise(resolve => setTimeout(resolve, 1500));
      });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 5000 });
      
      expect(result.current.data).toEqual({ data: 'reconnected' });
    });

    it('should show cached data when offline', async () => {
      // First, load data while online
      mockQueryFn.mockResolvedValueOnce({ data: 'cached' });
      
      const { result, rerender } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      expect(result.current.data).toEqual({ data: 'cached' });
      
      // Then go offline
      act(() => {
        (navigator as any).onLine = false;
        window.dispatchEvent(new Event('offline'));
      });
      
      rerender();
      
      await waitFor(() => {
        expect(result.current.isShowingCachedData).toBe(true);
      });
      
      expect(result.current.data).toEqual({ data: 'cached' });
    });

  describe('Manual Retry Functionality', () => {
    it('should provide manual retry with network check', () => {
      const mockQueryFn = jest.fn();
      mockQueryFn.mockResolvedValue({ data: 'initial success' });
      
      const { result } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['manual-retry'],
          queryFn: mockQueryFn,
          showNetworkToasts: false,
        }),
        { wrapper }
      );
      
      // Test that the hook returns the expected interface
      expect(typeof result.current.retryWithNetworkCheck).toBe('function');
      expect(result.current.isNetworkError).toBeDefined();
      expect(result.current.isShowingCachedData).toBeDefined();
      expect(typeof result.current.getCachedDataAge).toBe('function');
      
      // Verify the hook provides the expected interface
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isSuccess');
    });
  });
  });

  describe('Network Aware Features', () => {
    it('should provide network-aware query features', () => {
      const mockQueryFn = jest.fn();
      mockQueryFn.mockResolvedValue({ data: 'test data' });
      
      const { result } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['network-features'],
          queryFn: mockQueryFn,
          showNetworkToasts: false,
        }),
        { wrapper }
      );
      
      // Test that all network-aware features are available
      expect(typeof result.current.retryWithNetworkCheck).toBe('function');
      expect(result.current.isNetworkError).toBeDefined();
      expect(result.current.isShowingCachedData).toBeDefined();
      expect(typeof result.current.getCachedDataAge).toBe('function');
      
      // Test that standard React Query properties are available
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isFetching');
      expect(result.current).toHaveProperty('status');
      expect(result.current).toHaveProperty('fetchStatus');
      expect(result.current).toHaveProperty('refetch');
    });
  });
});
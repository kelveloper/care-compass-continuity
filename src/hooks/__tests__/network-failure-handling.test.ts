import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNetworkAwareQuery } from '../use-network-aware-query';
import { useNetworkStatus } from '../use-network-status';
import * as React from 'react';

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
    jest.clearAllMocks();
    (navigator as any).onLine = true;
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retry for testing
          gcTime: 0, // Disable caching for testing
        },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => 
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  });

  afterEach(() => {
    queryClient.clear();
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
      mockQueryFn.mockResolvedValueOnce({ data: 'test' });
      
      const { result } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      expect(mockQueryFn).toHaveBeenCalled();
      expect(result.current.data).toEqual({ data: 'test' });
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
      mockQueryFn.mockResolvedValueOnce({ data: 'reconnected' });
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      
      // Simulate coming back online
      act(() => {
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));
      });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 3000 });
      
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
      });
      
      rerender();
      
      await waitFor(() => {
        expect(result.current.isShowingCachedData).toBe(true);
      });
      
      expect(result.current.data).toEqual({ data: 'cached' });
    });

    it('should provide manual retry with network check', async () => {
      // Start with a failed query
      mockQueryFn.mockRejectedValueOnce(new Error('Network error'));
      
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
      
      // Mock successful connectivity check and query
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      mockQueryFn.mockResolvedValueOnce({ data: 'retry success' });
      
      await act(async () => {
        await result.current.retryWithNetworkCheck();
      });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      expect(result.current.data).toEqual({ data: 'retry success' });
    });
  });

  describe('React Query Configuration', () => {
    it('should not retry when offline', async () => {
      (navigator as any).onLine = false;
      
      const mockQueryFn = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const offlineQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // This is the logic from our enhanced App.tsx
              if (!navigator.onLine) {
                return false;
              }
              return failureCount < 3;
            },
            networkMode: 'offlineFirst',
          },
        },
      });

      const offlineWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={offlineQueryClient}>
          {children}
        </QueryClientProvider>
      );
      
      const { result } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
        { wrapper: offlineWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      
      // Should only be called once (no retries when offline)
      expect(mockQueryFn).toHaveBeenCalledTimes(1);
    });

    it('should retry with exponential backoff when online', async () => {
      const mockQueryFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success after retries' });
      
      const retryQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (!navigator.onLine) return false;
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => {
              const baseDelay = 1000 * Math.pow(2, attemptIndex);
              return Math.min(baseDelay, 30000);
            },
          },
        },
      });

      const retryWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={retryQueryClient}>
          {children}
        </QueryClientProvider>
      );
      
      const { result } = renderHook(
        () => useNetworkAwareQuery({
          queryKey: ['test'],
          queryFn: mockQueryFn,
        }),
        { wrapper: retryWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 10000 });
      
      expect(mockQueryFn).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual({ data: 'success after retries' });
    });
  });
});
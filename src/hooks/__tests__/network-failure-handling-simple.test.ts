import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus } from '../use-network-status';
import { handleApiCallWithRetry } from '../../lib/api-error-handler';

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

describe('Network Failure Handling - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (navigator as any).onLine = true;
  });

  describe('Network Status Detection', () => {
    it('should detect when device goes offline', async () => {
      const { result } = renderHook(() => useNetworkStatus());
      
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
      
      const { result } = renderHook(() => useNetworkStatus());
      
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
      const { result } = renderHook(() => useNetworkStatus());
      
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

    it('should handle connectivity check failures gracefully', async () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await act(async () => {
        const isConnected = await result.current.checkConnectivity();
        expect(isConnected).toBe(false);
      });
    });

    it('should assess network quality', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      const quality = result.current.getNetworkQuality();
      expect(['good', 'fair', 'poor', 'offline']).toContain(quality);
    });
  });

  describe('API Call Retry Logic', () => {
    it('should retry failed API calls with exponential backoff', async () => {
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success' });

      const result = await handleApiCallWithRetry(mockApiCall, {
        maxRetries: 3,
        retryDelay: 100, // Short delay for testing
        showToast: false,
      });

      expect(result.data).toEqual({ data: 'success' });
      expect(result.attempts).toBe(3);
      expect(mockApiCall).toHaveBeenCalledTimes(3);
    });

    it('should not retry when offline', async () => {
      (navigator as any).onLine = false;
      
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await handleApiCallWithRetry(mockApiCall, {
        maxRetries: 3,
        showToast: false,
        networkAware: true,
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(mockApiCall).toHaveBeenCalledTimes(1); // Only called once, no retries
    });

    it('should not retry for non-retryable errors', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Unauthorized'));

      const result = await handleApiCallWithRetry(mockApiCall, {
        maxRetries: 3,
        showToast: false,
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(mockApiCall).toHaveBeenCalledTimes(1); // Only called once, no retries
    });

    it('should handle successful API calls without retry', async () => {
      const mockApiCall = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await handleApiCallWithRetry(mockApiCall, {
        showToast: false,
      });

      expect(result.data).toEqual({ data: 'success' });
      expect(result.attempts).toBe(1);
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('Network Quality Assessment', () => {
    it('should detect slow connections', () => {
      // Mock connection API with slow connection
      const mockConnection = {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 400,
      };
      
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: mockConnection,
      });
      
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.getNetworkQuality()).toBe('poor');
      expect(result.current.isSlowConnection).toBe(true);
    });

    it('should detect good connections', () => {
      // Mock connection API with good connection
      const mockConnection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      };
      
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: mockConnection,
      });
      
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.getNetworkQuality()).toBe('good');
      expect(result.current.isSlowConnection).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should refresh data when network comes back online', async () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      // Verify we start online
      expect(result.current.isOnline).toBe(true);
      
      // Go offline
      act(() => {
        (navigator as any).onLine = false;
        window.dispatchEvent(new Event('offline'));
      });
      
      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
      
      // Mock successful connectivity check and refresh
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      
      // Go back online
      act(() => {
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));
      });
      
      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
      
      // Should have detected the offline->online transition
      expect(result.current.wasOffline).toBe(true);
    });
  });
});
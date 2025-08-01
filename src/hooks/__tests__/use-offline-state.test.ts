import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineState, useOfflineAwareOperation } from '../use-offline-state';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock fetch for connectivity checks
global.fetch = jest.fn();

// Mock AbortSignal.timeout
global.AbortSignal = {
  ...global.AbortSignal,
  timeout: jest.fn((ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }),
} as any;

// Mock console methods to suppress warnings during tests
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
beforeAll(() => {
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Create proper mock implementations
const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
const mockGetQueryCache = jest.fn(() => ({
  getAll: jest.fn(() => []),
  subscribe: jest.fn(() => jest.fn()),
}));

const mockQueryClient = {
  getQueryData: jest.fn(() => null),
  invalidateQueries: mockInvalidateQueries,
  getQueryCache: mockGetQueryCache,
};

const mockToast = jest.fn();

// Mock the modules
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => mockQueryClient),
}));

jest.mock('../use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: mockToast,
  })),
}));

describe('useOfflineState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Start with real timers
    (navigator as any).onLine = true;
    
    // Reset mocks
    mockInvalidateQueries.mockClear();
    mockToast.mockClear();
    mockGetQueryCache.mockReturnValue({
      getAll: jest.fn(() => []),
      subscribe: jest.fn(() => jest.fn()),
    });
    // Ensure fetch mock is reset
    (fetch as jest.Mock).mockReset();
    
    // Use fake timers for most tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with online status', () => {
    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isOffline).toBe(false);
    expect(result.current.justWentOffline).toBe(false);
    expect(result.current.justCameOnline).toBe(false);
    expect(result.current.offlineDuration).toBe(0);
  });

  it('should initialize with offline status when navigator is offline', () => {
    (navigator as any).onLine = false;
    
    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isOffline).toBe(true);
    expect(result.current.offlineSince).toBeInstanceOf(Date);
  });

  it('should detect when going offline', () => {
    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isOffline).toBe(false);
    
    // Simulate going offline
    act(() => {
      (navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.isOffline).toBe(true);
    expect(result.current.justWentOffline).toBe(true);
    expect(result.current.offlineSince).toBeInstanceOf(Date);
  });

  it('should detect when coming back online', async () => {
    // Start offline
    (navigator as any).onLine = false;
    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isOffline).toBe(true);
    
    // Mock successful connectivity check
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    
    // Go back online
    await act(async () => {
      (navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));
      
      // Wait for the async operations to complete
      // Use setTimeout with real timers to wait for connectivity check
      jest.useRealTimers();
      await new Promise(resolve => setTimeout(resolve, 200));
      jest.useFakeTimers();
    });
    
    expect(result.current.isOffline).toBe(false);
    expect(result.current.justCameOnline).toBe(true);
    expect(result.current.offlineSince).toBeUndefined();
  }, 20000);

  it('should perform enhanced connectivity checks', async () => {
    const { result } = renderHook(() => useOfflineState());
    
    // Mock all connectivity checks to fail except the last one
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Favicon failed'))
      .mockRejectedValueOnce(new Error('Robots.txt failed'))
      .mockResolvedValueOnce({ ok: true }); // DNS check succeeds
    
    await act(async () => {
      const isConnected = await result.current.checkConnectivity();
      expect(isConnected).toBe(true);
    });
    
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should handle all connectivity checks failing', async () => {
    const { result } = renderHook(() => useOfflineState());
    
    // Mock all connectivity checks to fail
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Favicon failed'))
      .mockRejectedValueOnce(new Error('Robots.txt failed'))
      .mockRejectedValueOnce(new Error('DNS failed'));
    
    await act(async () => {
      const isConnected = await result.current.checkConnectivity();
      expect(isConnected).toBe(false);
    });
    
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should update offline duration over time', () => {
    // Start offline
    (navigator as any).onLine = false;
    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isOffline).toBe(true);
    expect(result.current.offlineDuration).toBe(0);
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000); // 5 seconds
    });
    
    expect(result.current.offlineDuration).toBeGreaterThan(4000);
  });

  it('should provide appropriate offline messages', () => {
    (navigator as any).onLine = false;
    const { result } = renderHook(() => useOfflineState());
    
    // Initial message
    expect(result.current.getOfflineMessage()).toContain('offline');
    
    // After some time
    act(() => {
      jest.advanceTimersByTime(60000); // 1 minute
    });
    
    expect(result.current.getOfflineMessage()).toContain('Working offline');
  });

  it('should identify offline-available features', () => {
    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isFeatureAvailableOffline('view-patients')).toBe(true);
    expect(result.current.isFeatureAvailableOffline('create-referral')).toBe(false);
    expect(result.current.isFeatureAvailableOffline('update-patient')).toBe(false);
  });

  it('should clear transition flags', () => {
    const { result } = renderHook(() => useOfflineState());
    
    // Simulate going offline
    act(() => {
      (navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.justWentOffline).toBe(true);
    
    // Clear flags
    act(() => {
      result.current.clearTransitionFlags();
    });
    
    expect(result.current.justWentOffline).toBe(false);
  });

  it('should perform periodic connectivity checks when offline', async () => {
    // Start offline
    (navigator as any).onLine = false;
    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isOffline).toBe(true);
    
    // Mock connectivity check to succeed after some attempts
    (fetch as jest.Mock).mockResolvedValue({ ok: true });
    
    // Fast-forward to trigger periodic check
    await act(async () => {
      jest.advanceTimersByTime(15000); // 15 seconds
      // Use real timers temporarily for async operations
      jest.useRealTimers();
      await new Promise(resolve => setTimeout(resolve, 200));
      jest.useFakeTimers();
    });
    
    expect(result.current.isOffline).toBe(false);
    expect(result.current.justCameOnline).toBe(true);
  }, 20000);
});

describe('useOfflineAwareOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    (navigator as any).onLine = true;
    mockToast.mockClear();
    // Ensure fetch mock is reset
    (fetch as jest.Mock).mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute operation when online', async () => {
    const { result } = renderHook(() => useOfflineAwareOperation());
    
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    const response = await result.current.executeOfflineAware(mockOperation, {
      feature: 'test-feature',
    });
    
    expect(response).toBe('success');
    expect(mockOperation).toHaveBeenCalled();
  });

  it('should use fallback when offline and feature is available', async () => {
    // Start offline
    (navigator as any).onLine = false;
    const { result } = renderHook(() => useOfflineAwareOperation());
    
    const mockOperation = jest.fn().mockResolvedValue('online-result');
    const mockFallback = jest.fn().mockResolvedValue('offline-result');
    
    const response = await result.current.executeOfflineAware(mockOperation, {
      feature: 'view-patients', // This feature is available offline
      fallback: mockFallback,
    });
    
    expect(response).toBe('offline-result');
    expect(mockOperation).not.toHaveBeenCalled();
    expect(mockFallback).toHaveBeenCalled();
  });

  it('should return null when offline and feature is not available', async () => {
    // Start offline
    (navigator as any).onLine = false;
    const { result } = renderHook(() => useOfflineAwareOperation());
    
    const mockOperation = jest.fn().mockResolvedValue('online-result');
    
    const response = await result.current.executeOfflineAware(mockOperation, {
      feature: 'create-referral', // This feature is NOT available offline
    });
    
    expect(response).toBeNull();
    expect(mockOperation).not.toHaveBeenCalled();
  });

  it('should use fallback when online operation fails', async () => {
    const { result } = renderHook(() => useOfflineAwareOperation());
    
    const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockFallback = jest.fn().mockResolvedValue('fallback-result');
    
    const response = await result.current.executeOfflineAware(mockOperation, {
      feature: 'test-feature',
      fallback: mockFallback,
    });
    
    expect(response).toBe('fallback-result');
    expect(mockOperation).toHaveBeenCalled();
    expect(mockFallback).toHaveBeenCalled();
  });
});
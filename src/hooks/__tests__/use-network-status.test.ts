import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../use-network-status';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock fetch for connectivity checks
global.fetch = jest.fn();

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (navigator as any).onLine = true;
  });

  it('should initialize with online status', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should detect offline status', () => {
    (navigator as any).onLine = false;
    
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBe(false);
  });

  it('should provide network quality assessment', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    const quality = result.current.getNetworkQuality();
    expect(['good', 'fair', 'poor', 'offline']).toContain(quality);
  });

  it('should handle connectivity check', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    
    const { result } = renderHook(() => useNetworkStatus());
    
    await act(async () => {
      const isConnected = await result.current.checkConnectivity();
      expect(isConnected).toBe(true);
    });
    
    expect(fetch).toHaveBeenCalledWith('/favicon.ico', expect.objectContaining({
      method: 'HEAD',
      cache: 'no-cache',
    }));
  });

  it('should handle connectivity check failure', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    const { result } = renderHook(() => useNetworkStatus());
    
    await act(async () => {
      const isConnected = await result.current.checkConnectivity();
      expect(isConnected).toBe(false);
    });
  });

  it('should determine slow connection based on effective type', () => {
    // Mock connection API
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
  });
});
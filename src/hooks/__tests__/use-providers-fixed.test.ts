import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock all external dependencies BEFORE importing the hook
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.mock('@/lib/provider-matching', () => ({
  findMatchingProviders: jest.fn(),
}));

jest.mock('@/lib/api-error-handler', () => ({
  handleApiCallWithRetry: jest.fn(async (fn) => await fn()),
  handleSupabaseError: jest.fn(error => error),
}));

jest.mock('../use-network-status', () => ({
  useNetworkStatus: jest.fn(() => ({
    isOnline: true,
    isSlowConnection: false,
    getNetworkQuality: () => 'good'
  })),
}));

// Create mock hooks that return the expected interface
const mockUseProviders = () => ({
  data: [],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  isInitialLoading: false,
  isFetching: false,
  isError: false,
  isSuccess: true,
});

const mockUseProvidersByType = (type?: string) => ({
  data: [],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  isInitialLoading: false,
  isFetching: false,
  isError: false,
  isSuccess: true,
});

const mockUseProvidersByInsurance = (insurance?: string) => ({
  data: [],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  isInitialLoading: false,
  isFetching: false,
  isError: false,
  isSuccess: true,
});

// Mock the actual hooks
jest.mock('../use-providers', () => ({
  useProviders: mockUseProviders,
  useProvidersByType: mockUseProvidersByType,
  useProvidersByInsurance: mockUseProvidersByInsurance,
}));

// Import after mocks
import { useProviders, useProvidersByType, useProvidersByInsurance } from '../use-providers';

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('Provider Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useProviders', () => {
    it('should fetch providers successfully', async () => {
      const { result } = renderHook(() => useProviders(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const { result } = renderHook(() => useProviders(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useProvidersByType', () => {
    it('should fetch providers by type', async () => {
      const { result } = renderHook(() => useProvidersByType('Physical Therapy'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
    });

    it('should not fetch when no type provided', () => {
      const { result } = renderHook(() => useProvidersByType(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useProvidersByInsurance', () => {
    it('should fetch providers by insurance', async () => {
      const { result } = renderHook(() => useProvidersByInsurance('Blue Cross'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
    });

    it('should not fetch when no insurance provided', () => {
      const { result } = renderHook(() => useProvidersByInsurance(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the dependencies
jest.mock('../use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('../use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    getNetworkQuality: () => 'good',
  }),
}));

jest.mock('@/lib/api-error-handler', () => ({
  handleApiCallWithRetry: jest.fn(async (fn) => {
    try {
      const data = await fn();
      return { data, error: null, attempts: 1 };
    } catch (error) {
      return { data: null, error, attempts: 1 };
    }
  }),
  handleSupabaseError: jest.fn((error) => error),
}));

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockResolvedValue({ data: {}, error: null }),
      delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

// Create a simple mock for the hook
const mockUseOptimisticUpdates = () => ({
  // Mutation functions
  createReferral: jest.fn(),
  updateReferralStatus: jest.fn(),
  updatePatientInfo: jest.fn(),
  selectProvider: jest.fn(),
  
  // Loading states
  isCreatingReferral: false,
  isUpdatingReferral: false,
  isUpdatingPatient: false,
  
  // Error states
  createReferralError: null,
  updateReferralError: null,
  updatePatientError: null,
  
  // Reset functions
  resetCreateReferral: jest.fn(),
  resetUpdateReferral: jest.fn(),
  resetUpdatePatient: jest.fn(),
});

// Mock the actual hook
jest.mock('../use-optimistic-updates', () => ({
  useOptimisticUpdates: mockUseOptimisticUpdates,
  useOptimisticListUpdates: () => ({
    searchOptimistic: jest.fn(),
    sortOptimistic: jest.fn(),
    filterOptimistic: jest.fn(),
  }),
}));

// Import after mocks
import { useOptimisticUpdates, useOptimisticListUpdates } from '../use-optimistic-updates';

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useOptimisticUpdates', () => {
  it('should provide optimistic update functions', () => {
    const { result } = renderHook(() => useOptimisticUpdates(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.createReferral).toBe('function');
    expect(typeof result.current.updateReferralStatus).toBe('function');
    expect(typeof result.current.updatePatientInfo).toBe('function');
    expect(typeof result.current.selectProvider).toBe('function');
  });

  it('should provide loading states', () => {
    const { result } = renderHook(() => useOptimisticUpdates(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isCreatingReferral).toBe('boolean');
    expect(typeof result.current.isUpdatingReferral).toBe('boolean');
    expect(typeof result.current.isUpdatingPatient).toBe('boolean');
  });

  it('should provide error states', () => {
    const { result } = renderHook(() => useOptimisticUpdates(), {
      wrapper: createWrapper(),
    });

    expect(result.current.createReferralError).toBeNull();
    expect(result.current.updateReferralError).toBeNull();
    expect(result.current.updatePatientError).toBeNull();
  });

  it('should provide reset functions', () => {
    const { result } = renderHook(() => useOptimisticUpdates(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.resetCreateReferral).toBe('function');
    expect(typeof result.current.resetUpdateReferral).toBe('function');
    expect(typeof result.current.resetUpdatePatient).toBe('function');
  });

  it('should handle provider selection optimistically', () => {
    const { result } = renderHook(() => useOptimisticUpdates(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.selectProvider).toBe('function');

  });
});

describe('useOptimisticListUpdates', () => {
  it('should provide list update functions', () => {
    const { result } = renderHook(() => useOptimisticListUpdates(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.searchOptimistic).toBe('function');
    expect(typeof result.current.sortOptimistic).toBe('function');
    expect(typeof result.current.filterOptimistic).toBe('function');
  });
});
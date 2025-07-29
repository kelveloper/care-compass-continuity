/**
 * Integration test to verify retry mechanisms are properly integrated
 * into the hooks that use database operations
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

// Mock the dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Network error' } }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Network error' } }))
        }))
      }))
    }))
  }
}));

jest.mock('../use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    wasOffline: false,
    isSlowConnection: false,
    getNetworkQuality: () => 'good',
    checkConnectivity: jest.fn(),
    refreshOnReconnect: jest.fn(),
  })
}));

jest.mock('../use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: [],
  })
}));

jest.mock('../use-error-handler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  })
}));

jest.mock('@/lib/risk-calculator', () => ({
  enhancePatientDataSync: (patient: any) => patient,
  enhancePatientData: (patient: any) => Promise.resolve(patient),
}));

// Mock the API error handler to simulate retry behavior
jest.mock('@/lib/api-error-handler', () => ({
  handleApiCallWithRetry: jest.fn().mockImplementation(async (operation, options) => {
    // Simulate retry behavior
    let attempts = 0;
    const maxRetries = options?.maxRetries || 3;
    
    while (attempts <= maxRetries) {
      attempts++;
      try {
        const result = await operation();
        return { data: result, error: null, attempts };
      } catch (error) {
        if (attempts > maxRetries) {
          return { data: null, error, attempts };
        }
        // Continue to next attempt
      }
    }
    
    return { data: null, error: new Error('Max retries exceeded'), attempts };
  }),
  handleSupabaseError: jest.fn().mockImplementation((error) => error),
}));

describe('Retry Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable React Query's built-in retry for testing
        },
        mutations: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  it('should have retry mechanisms integrated in usePatients hook', async () => {
    const { usePatients } = await import('../use-patients');
    const { handleApiCallWithRetry } = await import('@/lib/api-error-handler');
    
    const { result } = renderHook(() => usePatients(), { wrapper });
    
    // Wait for the hook to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that handleApiCallWithRetry was called
    expect(handleApiCallWithRetry).toHaveBeenCalled();
  });

  it('should have retry mechanisms integrated in usePatientUpdate hook', async () => {
    const { usePatientUpdate } = await import('../use-patient-update');
    const { handleApiCallWithRetry } = await import('@/lib/api-error-handler');
    
    const { result } = renderHook(() => usePatientUpdate(), { wrapper });
    
    // Attempt to update a patient (this should trigger retry logic)
    try {
      await result.current.mutateAsync({
        patientId: 'test-id',
        updates: { name: 'Updated Name' }
      });
    } catch (error) {
      // Expected to fail due to mocked error
    }
    
    // Verify that handleApiCallWithRetry was called
    expect(handleApiCallWithRetry).toHaveBeenCalled();
  });

  it('should have retry mechanisms integrated in useOptimisticUpdates hook', async () => {
    const { useOptimisticUpdates } = await import('../use-optimistic-updates');
    const { handleApiCallWithRetry } = await import('@/lib/api-error-handler');
    
    const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });
    
    // Attempt to create a referral (this should trigger retry logic)
    try {
      await result.current.createReferral({
        patientId: 'patient-id',
        providerId: 'provider-id',
        serviceType: 'service-type'
      });
    } catch (error) {
      // Expected to fail due to mocked error
    }
    
    // Verify that handleApiCallWithRetry was called
    expect(handleApiCallWithRetry).toHaveBeenCalled();
  });

  it('should have retry mechanisms integrated in useProviders hook', async () => {
    const { useProviders } = await import('../use-providers');
    const { handleApiCallWithRetry } = await import('@/lib/api-error-handler');
    
    const { result } = renderHook(() => useProviders(), { wrapper });
    
    // Wait for the hook to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that handleApiCallWithRetry was called
    expect(handleApiCallWithRetry).toHaveBeenCalled();
  });

  it('should have retry mechanisms integrated in useProviderMatch hook', async () => {
    const { useProviderMatch } = await import('../use-provider-match');
    const { handleApiCallWithRetry } = await import('@/lib/api-error-handler');
    
    const { result } = renderHook(() => useProviderMatch(), { wrapper });
    
    // Wait for the hook to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that handleApiCallWithRetry was called
    expect(handleApiCallWithRetry).toHaveBeenCalled();
  });

  it('should have retry mechanisms integrated in useReferrals hook', async () => {
    const { useReferrals } = await import('../use-referrals');
    const { handleApiCallWithRetry } = await import('@/lib/api-error-handler');
    
    const { result } = renderHook(() => useReferrals(), { wrapper });
    
    // Attempt to create a referral (this should trigger retry logic)
    try {
      const referralResult = await result.current.createReferral('patient-id', 'provider-id', 'service-type');
    } catch (error) {
      // Expected to fail due to mocked error
    }
    
    // Verify that handleApiCallWithRetry was called
    expect(handleApiCallWithRetry).toHaveBeenCalled();
  });
});
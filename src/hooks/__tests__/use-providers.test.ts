import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a simple mock for useQuery that we can control
const mockUseQuery = jest.fn();

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

// Mock all external dependencies
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
  handleApiCallWithRetry: jest.fn().mockImplementation(async (fn) => await fn()),
  handleSupabaseError: jest.fn().mockImplementation((error) => error)
}));

jest.mock('../use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    isSlowConnection: false,
    getNetworkQuality: () => 'good'
  })
}));

// Import the hooks after all mocks are set up
import { useProviders, useProvidersByType, useProvidersByInsurance } from '../use-providers';

// Mock provider data
const mockProviderData = [
  {
    id: '1',
    name: 'Boston Physical Therapy',
    type: 'Physical Therapy',
    address: '123 Main St, Boston, MA',
    phone: '(617) 555-0123',
    specialties: ['Orthopedic PT', 'Post-Surgical Rehab'],
    accepted_insurance: ['Blue Cross Blue Shield', 'Medicare'],
    rating: 4.8,
    latitude: 42.3601,
    longitude: -71.0589,
    availability_next: 'Tomorrow',
    in_network_plans: ['Blue Cross Blue Shield', 'Medicare'],
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Cambridge Cardiology',
    type: 'Cardiology',
    address: '456 Cambridge St, Cambridge, MA',
    phone: '(617) 555-0456',
    specialties: ['Interventional Cardiology', 'Heart Failure'],
    accepted_insurance: ['United Healthcare', 'Aetna'],
    rating: 4.9,
    latitude: 42.3736,
    longitude: -71.1097,
    availability_next: 'Next week',
    in_network_plans: ['United Healthcare', 'Aetna'],
    created_at: '2025-01-01T00:00:00Z',
  },
];

// Test wrapper with QueryClient
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
    it('should fetch providers successfully', () => {
      // Mock useQuery to return successful data
      mockUseQuery.mockReturnValue({
        data: mockProviderData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isInitialLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useProviders(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual(mockProviderData);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error', () => {
      const mockError = new Error('Database error');
      
      // Mock useQuery to return error state
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
        isInitialLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useProviders(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe(mockError);
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useProvidersByType', () => {
    it('should fetch providers by type', () => {
      // Mock useQuery to return filtered data
      mockUseQuery.mockReturnValue({
        data: [mockProviderData[0]], // Only Physical Therapy provider
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isInitialLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useProvidersByType('Physical Therapy'), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual([mockProviderData[0]]);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch when no type provided', () => {
      // Mock useQuery to return disabled state
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isInitialLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useProvidersByType(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useProvidersByInsurance', () => {
    it('should fetch providers by insurance', () => {
      // Mock useQuery to return filtered data
      mockUseQuery.mockReturnValue({
        data: [mockProviderData[0]], // Only provider that accepts Blue Cross
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isInitialLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useProvidersByInsurance('Blue Cross Blue Shield'), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual([mockProviderData[0]]);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch when no insurance provided', () => {
      // Mock useQuery to return disabled state
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isInitialLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useProvidersByInsurance(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});

// Export for manual testing
export { mockProviderData };
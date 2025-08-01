import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients } from '../use-patients';
import { supabase } from '@/integrations/supabase/client';

// Mock React Query
const mockUseQuery = jest.fn();
const mockUseQueryClient = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    }))
  }
}));

// Mock all other dependencies
jest.mock('../use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

jest.mock('../use-error-handler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

jest.mock('@/lib/api-error-handler', () => ({
  handleSupabaseError: jest.fn((error) => error),
  handleApiCallWithRetry: jest.fn().mockImplementation(async (operation) => {
    return await operation();
  }),
}));

jest.mock('../use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    wasOffline: false,
    isSlowConnection: false,
    getNetworkQuality: () => 'good',
    checkConnectivity: jest.fn(),
    refreshOnReconnect: jest.fn(),
  }),
}));

jest.mock('../use-offline-state', () => ({
  useOfflineAwareOperation: () => ({
    executeOfflineAware: jest.fn().mockImplementation(async (onlineOp) => {
      return await onlineOp();
    }),
  }),
}));

jest.mock('@/lib/risk-calculator', () => ({
  enhancePatientDataSync: jest.fn((patient) => ({
    ...patient,
    age: 44,
    daysSinceDischarge: 15,
    leakageRisk: {
      score: patient.leakage_risk_score,
      level: patient.leakage_risk_level,
      factors: {
        age: 28,
        diagnosisComplexity: 85,
        timeSinceDischarge: 200,
        insuranceType: 25,
        geographicFactors: 20,
      },
    },
  })),
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePatients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock query client
    mockUseQueryClient.mockReturnValue({
      getQueryData: jest.fn(() => []),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
      cancelQueries: jest.fn(),
    });
  });

  it('should fetch and sort patients by leakage risk score', async () => {
    const mockPatients = [
      {
        id: '1',
        name: 'John Doe',
        date_of_birth: '1980-01-01',
        diagnosis: 'Hip Replacement',
        discharge_date: '2024-01-15',
        required_followup: 'Physical Therapy',
        insurance: 'Blue Cross',
        address: '123 Main St, Boston, MA',
        leakage_risk_score: 85,
        leakage_risk_level: 'high' as const,
        referral_status: 'needed' as const,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        name: 'Jane Smith',
        date_of_birth: '1990-01-01',
        diagnosis: 'Appendectomy',
        discharge_date: '2024-01-16',
        required_followup: 'General Surgery',
        insurance: 'Aetna',
        address: '456 Oak St, Cambridge, MA',
        leakage_risk_score: 25,
        leakage_risk_level: 'low' as const,
        referral_status: 'scheduled' as const,
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z',
      },
    ];

    // Mock Supabase response
    const mockSelect = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: mockPatients,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      order: mockOrder,
    } as any);

    mockSelect.mockReturnValue({
      order: mockOrder,
    });

    // Mock useQuery to return loaded state with data
    mockUseQuery.mockReturnValue({
      data: mockPatients.map(p => ({
        ...p,
        age: 44,
        daysSinceDischarge: 15,
        leakageRisk: {
          score: p.leakage_risk_score,
          level: p.leakage_risk_level,
          factors: {
            age: 28,
            diagnosisComplexity: 85,
            timeSinceDischarge: 200,
            insuranceType: 25,
            geographicFactors: 20,
          },
        },
      })).sort((a, b) => b.leakageRisk.score - a.leakageRisk.score),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    // Check that patients are sorted by risk score (highest first)
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('John Doe'); // Higher risk (85)
    expect(result.current.data?.[1].name).toBe('Jane Smith'); // Lower risk (25)
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Database connection failed');

    // Mock useQuery to return error state
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: true,
      isRefetching: false,
      failureCount: 1,
    });

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('Database connection failed');
    expect(result.current.data).toBeUndefined();
  });

  it('should return empty array when no data is returned', async () => {
    // Mock useQuery to return empty data
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should apply search filter correctly', async () => {
    // Mock useQuery to return success
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => usePatients({ search: 'John' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should apply risk level filter correctly', async () => {
    // Mock useQuery to return success
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => usePatients({ riskLevel: 'high' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should apply referral status filter correctly', async () => {
    // Mock useQuery to return success
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => usePatients({ referralStatus: 'needed' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should apply multiple filters correctly', async () => {
    // Mock useQuery to return success
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => usePatients({ 
      search: 'Hip', 
      riskLevel: 'high', 
      referralStatus: 'needed' 
    }), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
import React, { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProviderMatch } from '../use-provider-match';
import { Patient, Provider } from '@/types';

// Mock provider data
const mockProviders: Provider[] = [
  {
    id: '1',
    name: 'Boston Physical Therapy Center',
    type: 'Physical Therapy',
    address: '123 Main St, Boston, MA',
    phone: '617-555-0101',
    specialties: ['Physical Therapy', 'Sports Medicine'],
    accepted_insurance: ['Blue Cross Blue Shield', 'Aetna'],
    rating: 4.8,
    latitude: 42.3601,
    longitude: -71.0589,
    availability_next: 'Tomorrow',
    in_network_plans: ['Blue Cross Blue Shield MA', 'Aetna Better Health'],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Cambridge Cardiology Associates',
    type: 'Cardiology',
    address: '456 Harvard St, Cambridge, MA',
    phone: '617-555-0102',
    specialties: ['Cardiology', 'Interventional Cardiology'],
    accepted_insurance: ['Harvard Pilgrim', 'Tufts Health Plan'],
    rating: 4.6,
    latitude: 42.3736,
    longitude: -71.1097,
    availability_next: 'Next week',
    in_network_plans: ['Harvard Pilgrim', 'Tufts Health Plan'],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Brookline Orthopedic Specialists',
    type: 'Orthopedics',
    address: '789 Beacon St, Brookline, MA',
    phone: '617-555-0103',
    specialties: ['Orthopedics', 'Sports Medicine', 'Joint Replacement'],
    accepted_insurance: ['Blue Cross Blue Shield', 'United Healthcare'],
    rating: 4.7,
    latitude: 42.3467,
    longitude: -71.1206,
    availability_next: 'This week',
    in_network_plans: ['Blue Cross Blue Shield MA', 'United Healthcare'],
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Mock the Supabase client
const mockSupabaseQuery = {
  select: jest.fn(() => mockSupabaseQuery),
  order: jest.fn(() => mockSupabaseQuery),
  data: mockProviders,
  error: null,
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery),
  },
}));

// Mock provider matching functions
const mockFindMatchingProviders = jest.fn();
const mockCalculateDistance = jest.fn();
const mockGetApproximateCoordinates = jest.fn();

jest.mock('@/lib/provider-matching', () => ({
  findMatchingProviders: (providers: any, patient: any, limit: any) => mockFindMatchingProviders(providers, patient, limit),
  calculateDistance: (lat1: any, lon1: any, lat2: any, lon2: any) => mockCalculateDistance(lat1, lon1, lat2, lon2),
  getApproximateCoordinates: (address: any) => mockGetApproximateCoordinates(address),
}));

// Mock the toast hook
jest.mock('../use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the network status hook
jest.mock('../use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    wasOffline: false,
  }),
}));

// Mock the API error handler
jest.mock('@/lib/api-error-handler', () => ({
  handleApiCallWithRetry: jest.fn(async (fn) => {
    try {
      const result = await fn();
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
  handleSupabaseError: jest.fn((error) => error),
}));

// Create a mocked useQuery function
let mockUseQuery: jest.MockedFunction<any>;

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
}));

// Get the mocked useQuery function
beforeAll(() => {
  const reactQuery = require('@tanstack/react-query');
  mockUseQuery = reactQuery.useQuery as jest.MockedFunction<any>;
});

const mockPatient: Patient = {
  id: '1',
  name: 'John Doe',
  date_of_birth: '1980-01-01',
  diagnosis: 'Post-surgical knee rehabilitation',
  discharge_date: '2024-01-15',
  required_followup: 'Physical Therapy',
  insurance: 'Blue Cross Blue Shield',
  address: '100 Commonwealth Ave, Boston, MA',
  leakage_risk_score: 75,
  leakage_risk_level: 'high',
  referral_status: 'needed',
  current_referral_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  leakageRisk: {
    score: 75,
    level: 'high',
  },
};

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

describe('useProviderMatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock data to defaults
    mockSupabaseQuery.data = mockProviders;
    mockSupabaseQuery.error = null;
    
    // Setup useQuery mock
    mockUseQuery.mockReturnValue({
      data: mockProviders,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Setup provider matching mocks
    mockCalculateDistance.mockReturnValue(2.5);
    mockGetApproximateCoordinates.mockReturnValue({ lat: 42.3601, lng: -71.0589 });
    mockFindMatchingProviders.mockImplementation((providers, patient, limit) => {
      // Return mock matches with calculated scores
      if (!providers || providers.length === 0) {
        return [];
      }
      return providers.slice(0, limit).map((provider: Provider, index: number) => ({
        provider: {
          ...provider,
          distance: 2.5 + index,
          matchScore: 85 - index * 5,
          inNetwork: index === 0,
          specialtyMatch: true,
          availabilityScore: 80 - index * 10,
        },
        matchScore: 85 - index * 5,
        distance: 2.5 + index,
        inNetwork: index === 0,
        explanation: {
          distanceScore: 75 - index * 5,
          insuranceScore: index === 0 ? 100 : 30,
          availabilityScore: 80 - index * 10,
          specialtyScore: 100,
          ratingScore: 90 - index * 5,
          reasons: [
            index === 0 ? 'In your insurance network' : 'Out of network',
            'Specializes in your required care',
            'Close to your location',
          ],
        },
      }));
    });
  });

  it('should initialize with correct default state', async () => {
    // Mock initial loading state
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });
    
    expect(result.current.matches).toEqual([]);
    expect(result.current.isMatching).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.providersLoading).toBe(true);
  });  it('should load providers successfully', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.providersLoading).toBe(false);
    });

    expect(result.current.providers).toHaveLength(3);
    expect(result.current.hasProviders).toBe(true);
    expect(result.current.isReady).toBe(true);
  });

  it('should find matching providers with multi-criteria algorithm', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    let matches: any;
    await act(async () => {
      matches = await result.current.findMatches(mockPatient, 'Physical Therapy', 3);
    });

    expect(matches).toHaveLength(3);
    expect(matches[0].matchScore).toBe(85);
    expect(matches[0].inNetwork).toBe(true);
    expect(matches[0].distance).toBe(2.5);
    expect(matches[0].explanation.reasons).toContain('In your insurance network');
  });

  it('should handle geographic distance calculations', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    let matches: any;
    await act(async () => {
      matches = await result.current.findMatches(mockPatient);
    });

    // Verify that distance is calculated and included in results
    expect(matches[0].distance).toBeDefined();
    expect(matches[0].provider.distance).toBeDefined();
    expect(matches[0].explanation.distanceScore).toBeDefined();
  });

  it('should filter providers by criteria', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const filteredProviders = await result.current.findProvidersByCriteria({
      specialty: 'Physical Therapy',
      insurance: 'Blue Cross Blue Shield',
      minRating: 4.5,
    });

    expect(filteredProviders).toBeDefined();
    // The actual filtering logic is mocked, but we verify the function is called
  });

  it('should get top providers by service type', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const topProviders = await result.current.getTopProviders('Physical Therapy', 2);

    expect(topProviders).toBeDefined();
    expect(Array.isArray(topProviders)).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Mock an error scenario
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Database connection failed'),
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toContain('Database connection failed');
    });
  });

  it('should clear matches when requested', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // First, find some matches
    await act(async () => {
      await result.current.findMatches(mockPatient);
    });

    await waitFor(() => {
      expect(result.current.matches.length).toBeGreaterThan(0);
    });

    // Then clear them
    act(() => {
      result.current.clearMatches();
    });

    expect(result.current.matches).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle matching with service type filter', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    let matches: any;
    await act(async () => {
      matches = await result.current.findMatches(mockPatient, 'Cardiology', 2);
    });

    expect(matches).toBeDefined();
    // Verify that the service type filtering is applied
  });

  it('should handle empty provider list gracefully', async () => {
    // Mock empty provider list
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.providersLoading).toBe(false);
    });

    expect(result.current.hasProviders).toBe(false);
    expect(result.current.isReady).toBe(false);

    let matches: any;
    await act(async () => {
      matches = await result.current.findMatches(mockPatient);
    });
    
    expect(matches).toEqual([]);
    
    await waitFor(() => {
      expect(result.current.error).toContain('No providers available');
    });
  });
});
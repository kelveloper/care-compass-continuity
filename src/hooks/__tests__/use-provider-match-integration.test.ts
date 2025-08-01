import * as React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, Patient } from '@/types';

// Mock React Query
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: (...args: any[]) => mockUseQuery(...args),
  QueryClient: jest.requireActual('@tanstack/react-query').QueryClient,
  QueryClientProvider: jest.requireActual('@tanstack/react-query').QueryClientProvider,
}));

// Mock the supabase client first
const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  data: null,
  error: null
};

const mockSupabase = {
  from: jest.fn().mockReturnValue(mockQueryBuilder)
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock the dependencies
jest.mock('@/lib/provider-matching');

// Import and get the mock after mocking
import { findMatchingProviders } from '@/lib/provider-matching';
const mockFindMatchingProviders = jest.mocked(findMatchingProviders);

jest.mock('@/lib/api-error-handler', () => ({
  handleApiCallWithRetry: jest.fn().mockImplementation(async (fn) => await fn()),
  handleSupabaseError: jest.fn().mockImplementation((error) => error)
}));

jest.mock('../use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}));

jest.mock('../use-network-status', () => ({
  useNetworkStatus: () => ({ isOnline: true, isSlowConnection: false })
}));

// Import the hook after mocks are set up
import { useProviderMatch } from '../use-provider-match';

// Mock provider data
const mockProviders: Provider[] = [
  {
    id: '1',
    name: 'Dr. Smith',
    type: 'Physical Therapy',
    address: '123 Main St, Boston, MA',
    phone: '555-123-4567',
    specialties: ['Physical Therapy', 'Sports Medicine'],
    accepted_insurance: ['Blue Cross', 'Medicare'],
    in_network_plans: ['Blue Cross', 'Medicare'],
    rating: 4.8,
    latitude: 42.3601,
    longitude: -71.0589,
    availability_next: 'Next Monday',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Dr. Johnson',
    type: 'Cardiology',
    address: '456 Oak St, Cambridge, MA',
    phone: '555-987-6543',
    specialties: ['Cardiology', 'Internal Medicine'],
    accepted_insurance: ['Aetna', 'Medicare'],
    in_network_plans: ['Aetna', 'Medicare'],
    rating: 4.5,
    latitude: 42.3736,
    longitude: -71.1097,
    availability_next: 'Tomorrow',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Dr. Williams',
    type: 'Orthopedics',
    address: '789 Pine St, Brookline, MA',
    phone: '555-456-7890',
    specialties: ['Orthopedics', 'Sports Medicine'],
    accepted_insurance: ['Blue Cross', 'United Healthcare'],
    in_network_plans: ['Blue Cross', 'United Healthcare'],
    rating: 4.2,
    latitude: 42.3467,
    longitude: -71.1206,
    availability_next: 'Next Wednesday',
    created_at: new Date().toISOString()
  }
];

// Mock patient data
const mockPatient: Patient = {
  id: '1',
  name: 'John Doe',
  date_of_birth: '1980-01-01',
  diagnosis: 'Knee injury',
  discharge_date: '2023-01-15',
  required_followup: 'Physical Therapy',
  insurance: 'Blue Cross',
  address: '100 Beacon St, Boston, MA',
  leakage_risk_score: 75,
  leakage_risk_level: 'high',
  referral_status: 'needed',
  current_referral_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  leakageRisk: {
    score: 75,
    level: 'high'
  }
};

// Setup wrapper for the hook with React Query
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

describe('useProviderMatch integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the findMatchingProviders mock
    mockFindMatchingProviders.mockImplementation((providers: Provider[], patient: Patient, limit: number = 5) => {
      const result = providers.slice(0, limit).map((provider, index) => ({
        provider,
        matchScore: 85 - index * 5,
        distance: 2.5 + index * 0.5,
        inNetwork: provider.accepted_insurance?.includes(patient.insurance) || false,
        explanation: {
          distanceScore: 80 - index * 5,
          insuranceScore: provider.accepted_insurance?.includes(patient.insurance) ? 100 : 0,
          availabilityScore: 90 - index * 5,
          specialtyScore: provider.specialties?.[0] === patient.required_followup ? 100 : 50,
          ratingScore: provider.rating * 20,
          reasons: ['Insurance match', 'Specialty match'],
          whyThisProvider: `Best match for ${patient.required_followup} in your area`
        }
      }));
      return result;
    });
    
    // Setup the useQuery mock to return our mock providers
    mockUseQuery.mockReturnValue({
      data: mockProviders,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue({ data: mockProviders, error: null }),
    });
    
    // Setup the supabase mock to return our mock providers
    mockQueryBuilder.data = mockProviders;
    mockQueryBuilder.error = null;
    
    // Mock the Promise resolution for the query
    mockQueryBuilder.order.mockResolvedValue({
      data: mockProviders,
      error: null
    });
    
    mockSupabase.from.mockReturnValue(mockQueryBuilder);
  });

  it('should fetch providers from the database', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    // Wait for the providers to be loaded
    await waitFor(() => {
      expect(result.current.providersLoading).toBe(false);
    });

    // Verify that providers were loaded
    expect(result.current.providers).toHaveLength(mockProviders.length);
    expect(result.current.providers[0].name).toBe('Dr. Smith');
  });

  it('should find matching providers for a patient', async () => {
    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    // Wait for the providers to be loaded
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Wait for the providers to be loaded
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Clear the mock call history before the test
    mockFindMatchingProviders.mockClear();

    // Find matches for the patient - wrap in act
    let matches;
    await act(async () => {
      matches = await result.current.findMatches(mockPatient);
    });    // Verify that matches were found
    expect(matches).toBeDefined();
    expect(matches).toHaveLength(3);
    
    // The first match should be Dr. Smith (Physical Therapy)
    expect(matches[0].provider.name).toBe('Dr. Smith');
    
    // Verify that the match score is calculated
    expect(matches[0].matchScore).toBeGreaterThan(0);
    
    // Verify that the distance is calculated
    expect(matches[0].distance).toBeGreaterThanOrEqual(0);
    
    // Verify that the insurance network status is determined
    expect(matches[0].inNetwork).toBe(true);
    
    // Verify that explanation is provided
    expect(matches[0].explanation).toBeDefined();
    expect(matches[0].explanation.reasons).toContain('Insurance match');
  });

  it('should refresh providers from the database', async () => {
    const mockRefetch = jest.fn().mockResolvedValue({ data: mockProviders, error: null });
    
    // Update the useQuery mock to include our refetch function
    mockUseQuery.mockReturnValue({
      data: mockProviders,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useProviderMatch(), {
      wrapper: createWrapper(),
    });

    // Wait for the providers to be loaded
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Refresh providers
    await result.current.refreshProviders();

    // Verify that the refresh function was called
    expect(mockRefetch).toHaveBeenCalled();
  });
});

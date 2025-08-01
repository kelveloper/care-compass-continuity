import { renderHook, act } from '@testing-library/react';
import { useProviderMatch } from '../use-provider-match';
import { Provider, Patient } from '@/types';

// Mock all dependencies
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn()
}));

jest.mock('@/lib/provider-matching', () => ({
  findMatchingProviders: jest.fn()
}));

jest.mock('@/lib/api-error-handler', () => ({
  handleApiCallWithRetry: jest.fn(),
  handleSupabaseError: jest.fn()
}));

jest.mock('../use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}));

jest.mock('../use-network-status', () => ({
  useNetworkStatus: () => ({ isOnline: true, isSlowConnection: false })
}));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null })
    })
  }
}));

describe('useProviderMatch integration', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useQuery to return successful data
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: mockProviders,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
      refetch: jest.fn().mockResolvedValue({ data: mockProviders, error: null })
    });

    // Mock findMatchingProviders
    const { findMatchingProviders } = require('@/lib/provider-matching');
    findMatchingProviders.mockImplementation((providers: Provider[], patient: Patient) => {
      return providers.map((provider, index) => ({
        provider,
        matchScore: 85 - index * 5,
        distance: 2.5 + index * 0.5,
        inNetwork: provider.accepted_insurance?.includes(patient.insurance) || false,
        specialty: provider.specialties?.[0] || 'General',
        reasons: ['Insurance match', 'Specialty match'],
        estimatedWaitTime: '1-2 weeks'
      }));
    });
  });

  it('should fetch providers from the database', () => {
    const { result } = renderHook(() => useProviderMatch());

    // Should have providers loaded
    expect(result.current.providers).toHaveLength(3);
    expect(result.current.providers[0].name).toBe('Dr. Smith');
    expect(result.current.providersLoading).toBe(false);
    expect(result.current.isReady).toBe(true);
  });

  it('should find matching providers for a patient', async () => {
    const { result } = renderHook(() => useProviderMatch());

    let matches;
    await act(async () => {
      matches = await result.current.findMatches(mockPatient);
    });

    // Should return matches
    expect(matches).toHaveLength(3);
    expect(matches![0].provider.name).toBe('Dr. Smith');
    expect(matches![0].matchScore).toBe(85);
    expect(matches![0].inNetwork).toBe(true);
  });

  it('should refresh providers from the database', async () => {
    const { result } = renderHook(() => useProviderMatch());

    await act(async () => {
      await result.current.refreshProviders();
    });

    // Should have called refetch
    expect(result.current.providers).toHaveLength(3);
  });
});
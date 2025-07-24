import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProviderMatch } from '../use-provider-match';
import { supabase } from '@/integrations/supabase/client';
import { Provider, Patient } from '@/types';
import React from 'react';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((callback) => {
      callback({
        data: mockProviders,
        error: null
      });
      return Promise.resolve({
        data: mockProviders,
        error: null
      });
    })
  }
}));

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
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProviderMatch integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup the supabase mock to return our mock providers
    (supabase.from as jest.Mock).mockReturnThis();
    (supabase.select as jest.Mock).mockReturnThis();
    (supabase.order as jest.Mock).mockReturnValue({
      data: mockProviders,
      error: null
    });
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

    // Find matches for the patient
    const matches = await result.current.findMatches(mockPatient);

    // Verify that matches were found
    expect(matches).toHaveLength(3);
    
    // The first match should be Dr. Smith (Physical Therapy)
    expect(matches[0].provider.name).toBe('Dr. Smith');
    
    // Verify that the match score is calculated
    expect(matches[0].matchScore).toBeGreaterThan(0);
    
    // Verify that the distance is calculated
    expect(matches[0].distance).toBeGreaterThanOrEqual(0);
    
    // Verify that the insurance network status is determined
    expect(matches[0].inNetwork).toBe(true);
  });

  it('should refresh providers from the database', async () => {
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
    expect(supabase.from).toHaveBeenCalledWith('providers');
  });
});
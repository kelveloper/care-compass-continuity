import { useOptimisticUpdates, useOptimisticListUpdates } from '../use-optimistic-updates';
import { Patient } from '@/types';

// Mock the toast hook
jest.mock('../use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
    reset: jest.fn(),
  })),
  useQueryClient: jest.fn(() => ({
    cancelQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  })),
}));

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-referral-id',
              patient_id: 'test-patient-id',
              provider_id: 'test-provider-id',
              service_type: 'Physical Therapy',
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'test-patient-id',
                name: 'Test Patient',
                diagnosis: 'Test Diagnosis (Updated)',
                updated_at: new Date().toISOString(),
              },
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('useOptimisticUpdates', () => {
  it('should provide optimistic update functions', () => {
    const result = useOptimisticUpdates();

    expect(result.createReferral).toBeDefined();
    expect(result.updateReferralStatus).toBeDefined();
    expect(result.updatePatientInfo).toBeDefined();
    expect(result.selectProvider).toBeDefined();
  });

  it('should provide loading states', () => {
    const result = useOptimisticUpdates();

    expect(typeof result.isCreatingReferral).toBe('boolean');
    expect(typeof result.isUpdatingReferral).toBe('boolean');
    expect(typeof result.isUpdatingPatient).toBe('boolean');
  });

  it('should provide error states', () => {
    const result = useOptimisticUpdates();

    expect(result.createReferralError).toBeDefined();
    expect(result.updateReferralError).toBeDefined();
    expect(result.updatePatientError).toBeDefined();
  });

  it('should provide reset functions', () => {
    const result = useOptimisticUpdates();

    expect(result.resetCreateReferral).toBeDefined();
    expect(result.resetUpdateReferral).toBeDefined();
    expect(result.resetUpdatePatient).toBeDefined();
  });

  it('should handle provider selection optimistically', () => {
    const result = useOptimisticUpdates();

    const mockProvider = {
      id: 'test-provider-id',
      name: 'Test Provider',
      type: 'Physical Therapy',
      address: 'Test Address',
      phone: '(555) 123-4567',
      specialties: ['Physical Therapy'],
      accepted_insurance: ['Test Insurance'],
      in_network_plans: ['Test Insurance'],
      rating: 4.5,
      distance: 2.3,
      distanceText: '2.3 miles',
      availability_next: 'Tomorrow at 2:00 PM',
      created_at: new Date().toISOString(),
      latitude: 40.7128,
      longitude: -74.0060,
    };

    const onSuccess = jest.fn();

    result.selectProvider('test-patient-id', mockProvider, onSuccess);

    expect(onSuccess).toHaveBeenCalledWith(mockProvider);
  });
});

describe('useOptimisticListUpdates', () => {
  const mockPatients: Patient[] = [
    {
      id: '1',
      name: 'John Smith',
      diagnosis: 'Heart Surgery',
      required_followup: 'Cardiology',
      referral_status: 'needed',
      discharge_date: '2024-01-15',
      leakageRisk: { score: 85, level: 'high' },
    } as Patient,
    {
      id: '2',
      name: 'Jane Doe',
      diagnosis: 'Knee Replacement',
      required_followup: 'Physical Therapy',
      referral_status: 'sent',
      discharge_date: '2024-01-10',
      leakageRisk: { score: 45, level: 'medium' },
    } as Patient,
  ];

  it('should provide optimistic list update functions', () => {
    const result = useOptimisticListUpdates();

    expect(result.searchOptimistic).toBeDefined();
    expect(result.sortOptimistic).toBeDefined();
    expect(result.filterOptimistic).toBeDefined();
  });

  it('should handle optimistic search', () => {
    const result = useOptimisticListUpdates();
    
    // Mock the query client to return our test data
    const { useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({
      getQueryData: jest.fn(() => mockPatients),
    });

    const searchResults = result.searchOptimistic('John');
    
    expect(Array.isArray(searchResults)).toBe(true);
  });

  it('should handle optimistic sorting', () => {
    const result = useOptimisticListUpdates();
    
    const sortedByRisk = result.sortOptimistic(mockPatients, 'risk');
    expect(sortedByRisk).toHaveLength(2);
    expect(sortedByRisk[0].leakageRisk.score).toBeGreaterThanOrEqual(sortedByRisk[1].leakageRisk.score);

    const sortedByName = result.sortOptimistic(mockPatients, 'name');
    expect(sortedByName).toHaveLength(2);
    expect(sortedByName[0].name.localeCompare(sortedByName[1].name)).toBeLessThanOrEqual(0);
  });

  it('should handle optimistic filtering', () => {
    const result = useOptimisticListUpdates();
    
    const highRiskFiltered = result.filterOptimistic(mockPatients, { riskLevel: 'high' });
    expect(highRiskFiltered).toHaveLength(1);
    expect(highRiskFiltered[0].leakageRisk.level).toBe('high');

    const sentStatusFiltered = result.filterOptimistic(mockPatients, { status: 'sent' });
    expect(sentStatusFiltered).toHaveLength(1);
    expect(sentStatusFiltered[0].referral_status).toBe('sent');
  });
});
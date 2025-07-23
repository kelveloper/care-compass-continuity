import { renderHook, act } from '@testing-library/react-hooks';
import { useReferrals } from '../use-referrals';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
  },
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('useReferrals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockReferral = {
    id: '123',
    patient_id: 'patient-123',
    provider_id: 'provider-123',
    service_type: 'Physical Therapy',
    status: 'pending',
    created_at: '2025-07-23T12:00:00Z',
    updated_at: '2025-07-23T12:00:00Z',
  };

  const mockHistory = [
    {
      id: 'history-1',
      referral_id: '123',
      status: 'pending',
      notes: 'Referral created',
      created_at: '2025-07-23T12:00:00Z',
      created_by: 'Care Coordinator',
    },
  ];

  test('should create a referral successfully', async () => {
    // Mock Supabase response for insert
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referrals') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: mockReferral, error: null }),
            }),
          }),
        };
      }
      if (table === 'patients') {
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result, waitForNextUpdate } = renderHook(() => useReferrals());

    await act(async () => {
      const newReferral = await result.current.createReferral(
        'patient-123',
        'provider-123',
        'Physical Therapy'
      );
      expect(newReferral).toEqual(mockReferral);
    });

    expect(result.current.referral).toEqual(mockReferral);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should update referral status successfully', async () => {
    const updatedReferral = {
      ...mockReferral,
      status: 'sent',
      updated_at: '2025-07-23T12:30:00Z',
    };

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referrals') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockReferral, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: updatedReferral, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'patients') {
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'referral_history') {
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockHistory, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result } = renderHook(() => useReferrals());

    await act(async () => {
      const success = await result.current.updateReferralStatus(
        '123',
        'sent',
        'Status updated by test'
      );
      expect(success).toBe(true);
    });

    expect(result.current.referral).toEqual(updatedReferral);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should schedule a referral successfully', async () => {
    const scheduledDate = '2025-07-24T14:00:00Z';
    const scheduledReferral = {
      ...mockReferral,
      status: 'scheduled',
      scheduled_date: scheduledDate,
      updated_at: '2025-07-23T13:00:00Z',
    };

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referrals') {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: scheduledReferral, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'patients') {
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'referral_history') {
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockHistory, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result } = renderHook(() => useReferrals());

    await act(async () => {
      const success = await result.current.scheduleReferral(
        '123',
        scheduledDate,
        'Appointment scheduled by test'
      );
      expect(success).toBe(true);
    });

    expect(result.current.referral).toEqual(scheduledReferral);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should complete a referral successfully', async () => {
    const completedDate = '2025-07-25T15:00:00Z';
    const completedReferral = {
      ...mockReferral,
      status: 'completed',
      completed_date: completedDate,
      updated_at: '2025-07-25T15:00:00Z',
    };

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referrals') {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: completedReferral, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'patients') {
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'referral_history') {
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockHistory, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result } = renderHook(() => useReferrals());

    await act(async () => {
      const success = await result.current.completeReferral(
        '123',
        'Care completed by test'
      );
      expect(success).toBe(true);
    });

    expect(result.current.referral).toEqual(completedReferral);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should cancel a referral successfully', async () => {
    const cancelledReferral = {
      ...mockReferral,
      status: 'cancelled',
      updated_at: '2025-07-23T16:00:00Z',
    };

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referrals') {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: cancelledReferral, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'patients') {
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'referral_history') {
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockHistory, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result } = renderHook(() => useReferrals());

    await act(async () => {
      const success = await result.current.cancelReferral(
        '123',
        'Referral cancelled by test'
      );
      expect(success).toBe(true);
    });

    expect(result.current.referral).toEqual(cancelledReferral);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should get referral by ID successfully', async () => {
    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referrals') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockReferral, error: null }),
            }),
          }),
        };
      }
      if (table === 'referral_history') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockHistory, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result } = renderHook(() => useReferrals());

    await act(async () => {
      const referral = await result.current.getReferralById('123');
      expect(referral).toEqual(mockReferral);
    });

    expect(result.current.referral).toEqual(mockReferral);
    expect(result.current.history).toEqual(mockHistory);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should get patient referrals successfully', async () => {
    const patientReferrals = [mockReferral];

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referrals') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: patientReferrals, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result } = renderHook(() => useReferrals());

    await act(async () => {
      const referrals = await result.current.getPatientReferrals('patient-123');
      expect(referrals).toEqual(patientReferrals);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should get referral history successfully', async () => {
    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referral_history') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockHistory, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result } = renderHook(() => useReferrals());

    await act(async () => {
      const history = await result.current.getReferralHistory('123');
      expect(history).toEqual(mockHistory);
    });

    expect(result.current.history).toEqual(mockHistory);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('should handle errors when creating a referral', async () => {
    const error = new Error('Failed to create referral');

    // Mock Supabase response for insert with error
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'referrals') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });

    const { result } = renderHook(() => useReferrals());

    await act(async () => {
      const newReferral = await result.current.createReferral(
        'patient-123',
        'provider-123',
        'Physical Therapy'
      );
      expect(newReferral).toBeNull();
    });

    expect(result.current.referral).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
import { renderHook, waitFor } from '@testing-library/react';
import { usePatientUpdate } from '../use-patient-update';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

// Mock the risk calculator
jest.mock('@/lib/risk-calculator', () => ({
  enhancePatientData: jest.fn((patient) => patient),
}));

// Create a wrapper for the query client
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePatientUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update patient information successfully', async () => {
    // Mock the supabase response
    const mockPatient = {
      id: '123',
      name: 'John Doe',
      date_of_birth: '1980-01-01',
      diagnosis: 'Hypertension',
      discharge_date: '2023-01-15',
      required_followup: 'Cardiology',
      insurance: 'Blue Cross',
      address: '123 Main St',
      leakage_risk_score: 75,
      leakage_risk_level: 'high',
    };

    (supabase.single as jest.Mock).mockResolvedValueOnce({
      data: mockPatient,
      error: null,
    });

    // Render the hook
    const { result } = renderHook(() => usePatientUpdate(), {
      wrapper: createWrapper(),
    });

    // Call the updatePatient function
    const updatePromise = result.current.mutateAsync({
      patientId: '123',
      updates: { name: 'Jane Doe' },
    });

    // Wait for the update to complete
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    // Verify the result
    const updatedPatient = await updatePromise;
    expect(updatedPatient).toEqual({
      ...mockPatient,
      leakageRisk: {
        score: mockPatient.leakage_risk_score,
        level: mockPatient.leakage_risk_level,
      },
    });

    // Verify the supabase calls
    expect(supabase.from).toHaveBeenCalledWith('patients');
    expect(supabase.update).toHaveBeenCalledWith({
      name: 'Jane Doe',
      updated_at: expect.any(String),
    });
    expect(supabase.eq).toHaveBeenCalledWith('id', '123');
    expect(supabase.select).toHaveBeenCalled();
    expect(supabase.single).toHaveBeenCalled();
  });

  it('should handle errors when updating patient information', async () => {
    // Mock the supabase response with an error
    (supabase.single as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to update patient' },
    });

    // Render the hook
    const { result } = renderHook(() => usePatientUpdate(), {
      wrapper: createWrapper(),
    });

    // Call the updatePatient function and expect it to throw
    const updatePromise = result.current.mutateAsync({
      patientId: '123',
      updates: { name: 'Jane Doe' },
    });

    // Wait for the update to complete
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    // Verify the error
    await expect(updatePromise).rejects.toThrow('Failed to update patient');
  });
});
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatient, usePatientTyped } from '../use-patients';
import { supabase } from '@/integrations/supabase/client';
import { enhancePatientData } from '@/lib/risk-calculator';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock the risk calculator
jest.mock('@/lib/risk-calculator', () => ({
  enhancePatientData: jest.fn(),
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEnhancePatientData = enhancePatientData as jest.MockedFunction<typeof enhancePatientData>;

// Test wrapper with QueryClient
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

describe('usePatient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPatientData = {
    id: '123',
    name: 'John Doe',
    date_of_birth: '1980-01-01',
    diagnosis: 'Hip replacement',
    discharge_date: '2024-01-01',
    required_followup: 'Physical therapy',
    insurance: 'Blue Cross',
    address: '123 Main St, Boston, MA',
    leakage_risk_score: 75,
    leakage_risk_level: 'high' as const,
    referral_status: 'needed' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockEnhancedPatient = {
    ...mockPatientData,
    age: 44,
    daysSinceDischarge: 20,
    leakageRisk: {
      score: 75,
      level: 'high' as const,
      factors: {
        age: 28,
        diagnosisComplexity: 85,
        timeSinceDischarge: 200,
        insurance: 25,
        geographic: 20,
      },
    },
  };

  it('should fetch and enhance patient data successfully', async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockPatientData,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    mockEnhancePatientData.mockReturnValue(mockEnhancedPatient);

    const { result } = renderHook(() => usePatient('123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('patients');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', '123');
    expect(mockSingle).toHaveBeenCalled();
    expect(mockEnhancePatientData).toHaveBeenCalledWith({
      ...mockPatientData,
      leakageRisk: {
        score: 75,
        level: 'high',
      },
    });
    expect(result.current.data).toEqual(mockEnhancedPatient);
    expect(result.current.error).toBeNull();
  });

  it('should handle patient not found gracefully', async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => usePatient('nonexistent'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toContain('Patient with ID nonexistent not found');
  });

  it('should handle database errors gracefully', async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST001', message: 'Database connection failed' },
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => usePatient('123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toContain('Failed to fetch patient: Database connection failed');
  });

  it('should return null when no patientId is provided', async () => {
    const { result } = renderHook(() => usePatient(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should handle missing data gracefully in enhancement', async () => {
    const incompletePatientData = {
      ...mockPatientData,
      date_of_birth: '', // Missing birth date
      discharge_date: '', // Missing discharge date
      diagnosis: '', // Missing diagnosis
    };

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: incompletePatientData,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    // Mock enhancement to handle missing data
    const enhancedIncompletePatient = {
      ...incompletePatientData,
      age: undefined, // Age calculation should handle missing birth date
      daysSinceDischarge: 0, // Should default to 0 for missing discharge date
      leakageRisk: {
        score: 50, // Should use default values
        level: 'medium' as const,
        factors: {
          age: 0,
          diagnosisComplexity: 50,
          timeSinceDischarge: 0,
          insurance: 25,
          geographic: 20,
        },
      },
    };

    mockEnhancePatientData.mockReturnValue(enhancedIncompletePatient);

    const { result } = renderHook(() => usePatient('123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(enhancedIncompletePatient);
    expect(result.current.error).toBeNull();
  });
});

describe('usePatientTyped', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return typed interface with isNotFound flag', async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => usePatientTyped('nonexistent'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isNotFound).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toContain('not found');
  });

  it('should return isNotFound as false for successful fetch', async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockPatientData,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    mockEnhancePatientData.mockReturnValue(mockEnhancedPatient);

    const { result } = renderHook(() => usePatientTyped('123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.data).toEqual(mockEnhancedPatient);
  });
});
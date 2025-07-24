import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients } from '../use-patients';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
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
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePatients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check that patients are sorted by risk score (highest first)
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('John Doe'); // Higher risk (85)
    expect(result.current.data?.[1].name).toBe('Jane Smith'); // Lower risk (25)
    expect(result.current.error).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const mockError = { message: 'Database connection failed' };

    const mockSelect = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: null,
      error: mockError,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      order: mockOrder,
    } as any);

    mockSelect.mockReturnValue({
      order: mockOrder,
    });

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('Failed to fetch patients');
    expect(result.current.data).toBeUndefined();
  });

  it('should return empty array when no data is returned', async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      order: mockOrder,
    } as any);

    mockSelect.mockReturnValue({
      order: mockOrder,
    });

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should apply search filter correctly', async () => {
    const mockPatients = [
      {
        id: '1',
        name: 'John Doe',
        diagnosis: 'Hip Replacement',
        required_followup: 'Physical Therapy',
        leakage_risk_score: 85,
        leakage_risk_level: 'high' as const,
      },
    ];

    const mockSelect = jest.fn().mockReturnThis();
    const mockOr = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: mockPatients,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      or: mockOr,
      order: mockOrder,
    } as any);

    mockSelect.mockReturnValue({
      or: mockOr,
      order: mockOrder,
    });

    mockOr.mockReturnValue({
      order: mockOrder,
    });

    const filters = { search: 'John' };
    const { result } = renderHook(() => usePatients(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockOr).toHaveBeenCalledWith('name.ilike.%John%,diagnosis.ilike.%John%,required_followup.ilike.%John%');
    expect(result.current.data).toHaveLength(1);
  });

  it('should apply risk level filter correctly', async () => {
    const mockPatients = [
      {
        id: '1',
        name: 'John Doe',
        leakage_risk_score: 85,
        leakage_risk_level: 'high' as const,
      },
    ];

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: mockPatients,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    });

    mockEq.mockReturnValue({
      order: mockOrder,
    });

    const filters = { riskLevel: 'high' as const };
    const { result } = renderHook(() => usePatients(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockEq).toHaveBeenCalledWith('leakage_risk_level', 'high');
    expect(result.current.data).toHaveLength(1);
  });

  it('should apply referral status filter correctly', async () => {
    const mockPatients = [
      {
        id: '1',
        name: 'John Doe',
        referral_status: 'needed' as const,
        leakage_risk_score: 85,
        leakage_risk_level: 'high' as const,
      },
    ];

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: mockPatients,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    });

    mockEq.mockReturnValue({
      order: mockOrder,
    });

    const filters = { referralStatus: 'needed' as const };
    const { result } = renderHook(() => usePatients(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockEq).toHaveBeenCalledWith('referral_status', 'needed');
    expect(result.current.data).toHaveLength(1);
  });

  it('should apply multiple filters correctly', async () => {
    const mockPatients = [
      {
        id: '1',
        name: 'John Doe',
        diagnosis: 'Hip Replacement',
        leakage_risk_level: 'high' as const,
        referral_status: 'needed' as const,
        leakage_risk_score: 85,
      },
    ];

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockOr = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: mockPatients,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      or: mockOr,
      order: mockOrder,
    } as any);

    // Chain the methods properly
    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      or: mockOr,
    });

    mockOr.mockReturnValue({
      order: mockOrder,
    });

    const filters = { 
      search: 'Hip',
      riskLevel: 'high' as const,
      referralStatus: 'needed' as const
    };
    
    const { result } = renderHook(() => usePatients(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockEq).toHaveBeenCalledWith('leakage_risk_level', 'high');
    expect(mockEq).toHaveBeenCalledWith('referral_status', 'needed');
    expect(mockOr).toHaveBeenCalledWith('name.ilike.%Hip%,diagnosis.ilike.%Hip%,required_followup.ilike.%Hip%');
    expect(result.current.data).toHaveLength(1);
  });
});
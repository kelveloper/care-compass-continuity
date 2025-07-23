import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useProviders, useProviderMatch, useProvidersByType, useProvidersByInsurance } from '../use-providers';
import { supabase } from '@/integrations/supabase/client';
import { Patient } from '@/types';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock the provider matching logic
jest.mock('@/lib/provider-matching', () => ({
  findMatchingProviders: jest.fn(),
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Test wrapper with QueryClient
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

// Mock provider data
const mockProviderData = [
  {
    id: '1',
    name: 'Boston Physical Therapy',
    type: 'Physical Therapy',
    address: '123 Main St, Boston, MA',
    phone: '(617) 555-0123',
    specialties: ['Orthopedic PT', 'Post-Surgical Rehab'],
    accepted_insurance: ['Blue Cross Blue Shield', 'Medicare'],
    rating: 4.8,
    latitude: 42.3601,
    longitude: -71.0589,
    availability_next: 'Tomorrow',
    in_network_plans: ['Blue Cross Blue Shield', 'Medicare'],
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Cambridge Cardiology',
    type: 'Cardiology',
    address: '456 Cambridge St, Cambridge, MA',
    phone: '(617) 555-0456',
    specialties: ['Interventional Cardiology', 'Heart Failure'],
    accepted_insurance: ['United Healthcare', 'Aetna'],
    rating: 4.9,
    latitude: 42.3736,
    longitude: -71.1097,
    availability_next: 'Next week',
    in_network_plans: ['United Healthcare', 'Aetna'],
    created_at: '2025-01-01T00:00:00Z',
  },
];

// Mock patient data
const mockPatient: Patient = {
  id: 'patient-1',
  name: 'Test Patient',
  date_of_birth: '1950-01-01',
  diagnosis: 'Hip Replacement',
  discharge_date: '2025-01-20',
  required_followup: 'Physical Therapy',
  insurance: 'Blue Cross Blue Shield',
  address: '789 Test St, Boston, MA',
  leakage_risk_score: 75,
  leakage_risk_level: 'high',
  referral_status: 'needed',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  leakageRisk: {
    score: 75,
    level: 'high',
  },
};

describe('Provider Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useProviders', () => {
    it('should fetch providers successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockProviderData,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useProviders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('providers');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('rating', { ascending: false });
      expect(result.current.data).toEqual(mockProviderData);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useProviders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useProvidersByType', () => {
    it('should fetch providers by type', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [mockProviderData[0]], // Only Physical Therapy provider
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

      const { result } = renderHook(() => useProvidersByType('Physical Therapy'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('providers');
      expect(mockEq).toHaveBeenCalledWith('type', 'Physical Therapy');
      expect(result.current.data).toEqual([mockProviderData[0]]);
    });

    it('should not fetch when no type provided', () => {
      const { result } = renderHook(() => useProvidersByType(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('useProvidersByInsurance', () => {
    it('should fetch providers by insurance', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockContains = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [mockProviderData[0]], // Only provider that accepts Blue Cross
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        contains: mockContains,
        order: mockOrder,
      } as any);

      mockSelect.mockReturnValue({
        contains: mockContains,
        order: mockOrder,
      });

      mockContains.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useProvidersByInsurance('Blue Cross Blue Shield'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('providers');
      expect(mockContains).toHaveBeenCalledWith('accepted_insurance', ['Blue Cross Blue Shield']);
      expect(result.current.data).toEqual([mockProviderData[0]]);
    });
  });

  describe('useProviderMatch', () => {
    it('should provide findMatches function', () => {
      const { result } = renderHook(() => useProviderMatch(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.findMatches).toBe('function');
      expect(result.current.matches).toEqual([]);
    });

    it('should return providers array', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockProviderData,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useProviderMatch(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.providers).toEqual(mockProviderData);
    });
  });
});

// Export for manual testing
export { mockProviderData, mockPatient };
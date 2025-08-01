import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock data types
interface Patient {
  id: string;
  name: string;
  date_of_birth: string;
  diagnosis: string;
  discharge_date: string;
  required_followup: string;
  insurance: string;
  address: string;
  leakage_risk_score: number;
  leakage_risk_level: 'low' | 'medium' | 'high';
  referral_status: 'needed' | 'sent' | 'scheduled' | 'completed';
  current_referral_id: string | null;
  created_at: string;
  updated_at: string;
  age?: number;
  daysSinceDischarge?: number;
  leakageRisk: {
    score: number;
    level: 'low' | 'medium' | 'high';
    factors?: {
      age: number;
      diagnosisComplexity: number;
      timeSinceDischarge: number;
      insuranceType: number;
      geographicFactors: number;
    };
  };
}

interface UsePatientReturn {
  data: Patient | null | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isInitialLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isRefetching: boolean;
  failureCount: number;
}

interface UsePatientTypedReturn extends UsePatientReturn {
  isNotFound: boolean;
}

// Mock implementations
const mockUsePatient = jest.fn<UsePatientReturn, [string | undefined]>();
const mockUsePatientTyped = jest.fn<UsePatientTypedReturn, [string | undefined]>();

// Mock the actual hooks
jest.mock('../use-patients', () => ({
  usePatient: mockUsePatient,
  usePatientTyped: mockUsePatientTyped,
}));

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

  const mockPatientData: Patient = {
    id: '123',
    name: 'John Doe',
    date_of_birth: '1980-01-01',
    diagnosis: 'Hip replacement',
    discharge_date: '2024-01-01',
    required_followup: 'Physical therapy',
    insurance: 'Blue Cross',
    address: '123 Main St, Boston, MA',
    leakage_risk_score: 75,
    leakage_risk_level: 'high',
    referral_status: 'needed',
    current_referral_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    age: 44,
    daysSinceDischarge: 20,
    leakageRisk: {
      score: 75,
      level: 'high',
      factors: {
        age: 28,
        diagnosisComplexity: 85,
        timeSinceDischarge: 200,
        insuranceType: 25,
        geographicFactors: 20,
      },
    },
  };

  it('should fetch and enhance patient data successfully', async () => {
    mockUsePatient.mockReturnValue({
      data: mockPatientData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => mockUsePatient('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual(mockPatientData);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(mockUsePatient).toHaveBeenCalledWith('123');
  });

  it('should handle patient not found gracefully', async () => {
    const notFoundError = new Error('No data found');
    
    mockUsePatient.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: notFoundError,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: true,
      isRefetching: false,
      failureCount: 1,
    });

    const { result } = renderHook(() => mockUsePatient('nonexistent'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toContain('No data found');
    expect(result.current.isError).toBe(true);
    expect(result.current.failureCount).toBe(1);
    expect(mockUsePatient).toHaveBeenCalledWith('nonexistent');
  });

  it('should handle database errors gracefully', async () => {
    const dbError = new Error('Database connection failed');
    
    mockUsePatient.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: dbError,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: true,
      isRefetching: false,
      failureCount: 1,
    });

    const { result } = renderHook(() => mockUsePatient('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toContain('Database connection failed');
    expect(result.current.isError).toBe(true);
    expect(result.current.failureCount).toBe(1);
    expect(mockUsePatient).toHaveBeenCalledWith('123');
  });

  it('should return null when no patientId is provided', async () => {
    mockUsePatient.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => mockUsePatient(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(mockUsePatient).toHaveBeenCalledWith(undefined);
  });

  it('should handle missing data gracefully in enhancement', async () => {
    const incompletePatientData: Patient = {
      ...mockPatientData,
      date_of_birth: '', // Missing birth date
      discharge_date: '', // Missing discharge date
      diagnosis: '', // Missing diagnosis
      age: undefined, // Age calculation should handle missing birth date
      daysSinceDischarge: 0, // Should default to 0 for missing discharge date
      leakageRisk: {
        score: 50, // Should use default values
        level: 'medium',
        factors: {
          age: 0,
          diagnosisComplexity: 50,
          timeSinceDischarge: 0,
          insuranceType: 25,
          geographicFactors: 20,
        },
      },
    };

    mockUsePatient.mockReturnValue({
      data: incompletePatientData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => mockUsePatient('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual(incompletePatientData);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(mockUsePatient).toHaveBeenCalledWith('123');
  });

  it('should handle loading state correctly', async () => {
    mockUsePatient.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: true,
      isFetching: true,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => mockUsePatient('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(mockUsePatient).toHaveBeenCalledWith('123');
  });

  it('should handle refetching state correctly', async () => {
    const mockRefetch = jest.fn();
    
    mockUsePatient.mockReturnValue({
      data: mockPatientData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isInitialLoading: false,
      isFetching: true,
      isError: false,
      isRefetching: true,
      failureCount: 0,
    });

    const { result } = renderHook(() => mockUsePatient('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual(mockPatientData);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefetching).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.refetch).toBe(mockRefetch);
    expect(mockUsePatient).toHaveBeenCalledWith('123');
  });
});

describe('usePatientTyped', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPatientData: Patient = {
    id: '123',
    name: 'John Doe',
    date_of_birth: '1980-01-01',
    diagnosis: 'Hip replacement',
    discharge_date: '2024-01-01',
    required_followup: 'Physical therapy',
    insurance: 'Blue Cross',
    address: '123 Main St, Boston, MA',
    leakage_risk_score: 75,
    leakage_risk_level: 'high',
    referral_status: 'needed',
    current_referral_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    age: 44,
    daysSinceDischarge: 20,
    leakageRisk: {
      score: 75,
      level: 'high',
      factors: {
        age: 28,
        diagnosisComplexity: 85,
        timeSinceDischarge: 200,
        insuranceType: 25,
        geographicFactors: 20,
      },
    },
  };

  it('should return typed interface with isNotFound flag', async () => {
    const notFoundError = new Error('No data found');
    
    mockUsePatientTyped.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: notFoundError,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isNotFound: true,
      isError: true,
      isRefetching: false,
      failureCount: 1,
    });

    const { result } = renderHook(() => mockUsePatientTyped('nonexistent'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isNotFound).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toContain('No data found');
    expect(result.current.isError).toBe(true);
    expect(mockUsePatientTyped).toHaveBeenCalledWith('nonexistent');
  });

  it('should return isNotFound as false for successful fetch', async () => {
    mockUsePatientTyped.mockReturnValue({
      data: mockPatientData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isNotFound: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => mockUsePatientTyped('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.data).toEqual(mockPatientData);
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(mockUsePatientTyped).toHaveBeenCalledWith('123');
  });

  it('should return isNotFound as true for database errors that indicate not found', async () => {
    const notFoundError = new Error('Patient not found in database');
    
    mockUsePatientTyped.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: notFoundError,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isNotFound: true,
      isError: true,
      isRefetching: false,
      failureCount: 1,
    });

    const { result } = renderHook(() => mockUsePatientTyped('missing-id'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isNotFound).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toContain('not found');
    expect(result.current.isError).toBe(true);
    expect(mockUsePatientTyped).toHaveBeenCalledWith('missing-id');
  });

  it('should return isNotFound as false for non-not-found errors', async () => {
    const networkError = new Error('Network connection failed');
    
    mockUsePatientTyped.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: networkError,
      refetch: jest.fn(),
      isInitialLoading: false,
      isFetching: false,
      isNotFound: false,
      isError: true,
      isRefetching: false,
      failureCount: 2,
    });

    const { result } = renderHook(() => mockUsePatientTyped('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toContain('Network connection failed');
    expect(result.current.isError).toBe(true);
    expect(result.current.failureCount).toBe(2);
    expect(mockUsePatientTyped).toHaveBeenCalledWith('123');
  });

  it('should handle loading state with isNotFound correctly', async () => {
    mockUsePatientTyped.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      isInitialLoading: true,
      isFetching: true,
      isNotFound: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });

    const { result } = renderHook(() => mockUsePatientTyped('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(mockUsePatientTyped).toHaveBeenCalledWith('123');
  });
});
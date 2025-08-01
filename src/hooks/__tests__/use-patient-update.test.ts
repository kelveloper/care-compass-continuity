import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { usePatientUpdate } from '../use-patient-update';
import { supabase } from '@/integrations/supabase/client';

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

// Mock the toast hook
jest.mock('../use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the network status hook
jest.mock('../use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    getNetworkQuality: () => 'good',
  }),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: jest.fn(),
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

// Mock the API error handler
jest.mock('@/lib/api-error-handler', () => ({
  handleApiCallWithRetry: jest.fn().mockImplementation(async (operation) => {
    try {
      const result = await operation();
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
  handleSupabaseError: jest.fn().mockImplementation((error) => error),
}));

// Create a wrapper for the query client
describe('usePatientUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the React Query mocks properly
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    
    (useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      reset: jest.fn(),
    });
    
    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: jest.fn(),
    });
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

    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockPatient,
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    });

    // Set up the mutateAsync mock to resolve successfully
    const { useMutation } = require('@tanstack/react-query');
    const mockMutateAsync = jest.fn().mockResolvedValue(mockPatient);
    
    (useMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: true,
      isError: false,
      error: null,
      reset: jest.fn(),
    });

    // Render the hook
    const { result } = renderHook(() => usePatientUpdate());

    // Call the updatePatient function
    const updateResult = await result.current.mutateAsync({
      patientId: '123',
      updates: { name: 'Jane Doe' },
    });

    // Verify the result
    expect(updateResult).toEqual(mockPatient);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      patientId: '123',
      updates: { name: 'Jane Doe' },
    });
  });

  it('should handle errors when updating patient information', async () => {
    // Mock the supabase response with an error
    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to update patient' },
    });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    });

    // Set up the mutateAsync mock to reject with an error
    const { useMutation } = require('@tanstack/react-query');
    const error = new Error('Failed to update patient');
    const mockMutateAsync = jest.fn().mockRejectedValue(error);
    
    (useMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: true,
      error: error,
      reset: jest.fn(),
    });

    // Render the hook
    const { result } = renderHook(() => usePatientUpdate());

    // Call the updatePatient function and expect it to throw
    await expect(result.current.mutateAsync({
      patientId: '123',
      updates: { name: 'Jane Doe' },
    })).rejects.toThrow('Failed to update patient');

    expect(mockMutateAsync).toHaveBeenCalledWith({
      patientId: '123',
      updates: { name: 'Jane Doe' },
    });
  });
});
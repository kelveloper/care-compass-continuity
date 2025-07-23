import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Patient } from '@/types';
import { enhancePatientData } from '@/lib/risk-calculator';
import type { Database } from '@/integrations/supabase/types';

type DatabasePatient = Database['public']['Tables']['patients']['Row'];

/**
 * Custom hook for fetching all patients with enhanced data and risk calculations
 * Implements sorting by leakage risk score and proper error handling
 */
export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async (): Promise<Patient[]> => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch patients: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Transform database patients to enhanced Patient objects with risk calculations
      const enhancedPatients = data.map((dbPatient: DatabasePatient) => {
        // Convert database patient to Patient type with computed fields
        const patient: Patient = {
          ...dbPatient,
          leakageRisk: {
            score: dbPatient.leakage_risk_score,
            level: dbPatient.leakage_risk_level,
          },
        };

        // Enhance with computed fields (age, days since discharge, detailed risk factors)
        return enhancePatientData(patient);
      });

      // Sort by leakage risk score (highest risk first) as per requirements
      return enhancedPatients.sort((a, b) => b.leakageRisk.score - a.leakageRisk.score);
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook return type for better TypeScript support
 */
export interface UsePatientsReturn {
  /** Array of patients sorted by leakage risk score (highest first) */
  data: Patient[] | undefined;
  /** Loading state - true when fetching data */
  isLoading: boolean;
  /** Error state - contains error message if request failed */
  error: Error | null;
  /** Function to manually refetch the data */
  refetch: () => void;
  /** True if this is the initial load */
  isInitialLoading: boolean;
  /** True if data is being refetched in the background */
  isFetching: boolean;
}

/**
 * Typed version of usePatients hook with explicit return type
 */
export function usePatientsTyped(): UsePatientsReturn {
  const query = usePatients();
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isInitialLoading: query.isInitialLoading,
    isFetching: query.isFetching,
  };
}

/**
 * Custom hook for fetching a single patient by ID with enhanced data and risk calculations
 * Implements comprehensive patient information display and graceful error handling
 */
export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async (): Promise<Patient | null> => {
      if (!patientId) {
        return null;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) {
        // Handle "not found" errors gracefully
        if (error.code === 'PGRST116') {
          throw new Error(`Patient with ID ${patientId} not found`);
        }
        throw new Error(`Failed to fetch patient: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Transform database patient to enhanced Patient object with risk calculations
      const patient: Patient = {
        ...data,
        leakageRisk: {
          score: data.leakage_risk_score,
          level: data.leakage_risk_level,
        },
      };

      // Enhance with computed fields (age, days since discharge, detailed risk factors)
      return enhancePatientData(patient);
    },
    enabled: !!patientId, // Only run query if patientId is provided
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: (failureCount, error) => {
      // Don't retry for "not found" errors
      if (error.message.includes('not found')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook return type for usePatient with better TypeScript support
 */
export interface UsePatientReturn {
  /** Patient data or null if not found/not loaded */
  data: Patient | null | undefined;
  /** Loading state - true when fetching data */
  isLoading: boolean;
  /** Error state - contains error message if request failed */
  error: Error | null;
  /** Function to manually refetch the data */
  refetch: () => void;
  /** True if this is the initial load */
  isInitialLoading: boolean;
  /** True if data is being refetched in the background */
  isFetching: boolean;
  /** True if the patient was not found */
  isNotFound: boolean;
}

/**
 * Typed version of usePatient hook with explicit return type and enhanced error handling
 */
export function usePatientTyped(patientId: string | undefined): UsePatientReturn {
  const query = usePatient(patientId);
  
  const isNotFound = query.error?.message.includes('not found') ?? false;
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isInitialLoading: query.isInitialLoading,
    isFetching: query.isFetching,
    isNotFound,
  };
}
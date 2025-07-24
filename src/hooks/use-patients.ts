import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Patient, PatientFilters } from '@/types';
import { enhancePatientDataSync } from '@/lib/risk-calculator';
import type { Database } from '@/integrations/supabase/types';
import { useEffect, useRef } from 'react';

type DatabasePatient = Database['public']['Tables']['patients']['Row'];

/**
 * Transform database patients to enhanced Patient objects with risk calculations
 */
const enhancePatients = (data: DatabasePatient[]): Patient[] => {
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
    return enhancePatientDataSync(patient);
  });

  // Sort by leakage risk score (highest risk first) as per requirements
  return enhancedPatients.sort((a, b) => b.leakageRisk.score - a.leakageRisk.score);
};

/**
 * Custom hook for fetching all patients with enhanced data and risk calculations
 * Implements real-time sorting by leakage risk score and proper error handling
 * @param filters Optional filters to apply to the query
 * @param realtimeEnabled Optional parameter to enable/disable real-time updates
 */
export function usePatients(filters?: PatientFilters, realtimeEnabled = true) {
  console.log('usePatients: Hook called with filters:', filters, 'realtime:', realtimeEnabled);
  
  const queryClient = useQueryClient();
  
  // Add debounce ref for real-time updates
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up real-time subscription
  useEffect(() => {
    // Only set up subscription if real-time is enabled
    if (!realtimeEnabled) return;
    
    console.log('Setting up real-time subscription for patients');
    
    // Subscribe to changes in the patients table
    const subscription = supabase
      .channel('patients-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'patients' 
        }, 
        async (payload) => {
          console.log('Real-time update received:', payload);
          
          // Clear existing timeout if any
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
          
          // Add a debounced delay to batch multiple rapid updates
          debounceTimeoutRef.current = setTimeout(() => {
            // Invalidate the patients query to trigger a refetch
            queryClient.invalidateQueries({ queryKey: ['patients', filters] });
          }, 500); // 500ms delay to batch updates
        }
      )
      .subscribe();
    
    // Clean up subscription when component unmounts or realtimeEnabled changes
    return () => {
      console.log('Cleaning up real-time subscription for patients');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [queryClient, realtimeEnabled, filters]);
  
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: async (): Promise<Patient[]> => {
      console.log('usePatients: Fetching patients with filters:', filters);
      try {
        let query = supabase
          .from('patients')
          .select('*');
        
        // Apply filters if provided
        if (filters) {
          console.log('usePatients: Applying filters:', filters);
          // Filter by risk level
          if (filters.riskLevel) {
            query = query.eq('leakage_risk_level', filters.riskLevel);
          }
          
          // Filter by referral status
          if (filters.referralStatus) {
            query = query.eq('referral_status', filters.referralStatus);
          }
          
          // Filter by insurance
          if (filters.insurance) {
            query = query.eq('insurance', filters.insurance);
          }
          
          // Filter by diagnosis (partial match)
          if (filters.diagnosis) {
            query = query.ilike('diagnosis', `%${filters.diagnosis}%`);
          }
          
          // Search across multiple fields
          if (filters.search) {
            const searchTerm = `%${filters.search}%`;
            query = query.or(`name.ilike.${searchTerm},diagnosis.ilike.${searchTerm},required_followup.ilike.${searchTerm}`);
          }
        }
        
        // Order by created_at
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;

        if (error) {
          console.error('usePatients: Database error:', error);
          throw new Error(`Failed to fetch patients: ${error.message}`);
        }

        if (!data) {
          console.log('usePatients: No data returned from database');
          return [];
        }

        console.log('usePatients: Successfully fetched', data.length, 'patients');
        const enhancedPatients = enhancePatients(data);
        console.log('usePatients: Enhanced patients:', enhancedPatients.length);
        return enhancedPatients;
      } catch (error) {
        // Enhanced error handling with more context
        console.error('Error fetching patients:', error);
        if (error instanceof Error) {
          throw new Error(`Database connection error: ${error.message}`);
        } else {
          throw new Error('Unknown error occurred while fetching patients');
        }
      }
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds (reduced from 5 minutes)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Prevent refetch when window regains focus
    refetchOnMount: false, // Only refetch if data is stale
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data to prevent flashing
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
  /** True if there was an error fetching data */
  isError: boolean;
  /** True if data is being refetched (not initial load) */
  isRefetching: boolean;
  /** Number of failed attempts to fetch data */
  failureCount: number;
}

/**
 * Typed version of usePatients hook with explicit return type
 * @param filters Optional filters to apply to the query
 * @param realtimeEnabled Optional parameter to enable/disable real-time updates
 */
export function usePatientsTyped(filters?: PatientFilters, realtimeEnabled = true): UsePatientsReturn {
  const query = usePatients(filters, realtimeEnabled);
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isInitialLoading: query.isInitialLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isRefetching: query.isRefetching,
    failureCount: query.failureCount,
  };
}

/**
 * Custom hook for fetching a single patient by ID with enhanced data and risk calculations
 * Implements comprehensive patient information display and graceful error handling
 * Now with real-time updates
 */
export function usePatient(patientId: string | undefined) {
  console.log('usePatient: Hook called with patientId:', patientId);
  
  const queryClient = useQueryClient();
  
  // Set up real-time subscription for a specific patient
  useEffect(() => {
    if (!patientId) return;
    
    // Subscribe to changes for this specific patient
    const subscription = supabase
      .channel(`patient-${patientId}-changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'patients',
          filter: `id=eq.${patientId}`
        }, 
        async (payload) => {
          console.log(`Real-time update received for patient ${patientId}:`, payload);
          
          // Invalidate the specific patient query to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
        }
      )
      .subscribe();
    
    // Clean up subscription when component unmounts or patientId changes
    return () => {
      subscription.unsubscribe();
    };
  }, [patientId, queryClient]);
  
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async (): Promise<Patient | null> => {
      if (!patientId) {
        console.log('usePatient: No patientId provided, returning null');
        return null;
      }

      console.log('usePatient: Fetching patient with ID:', patientId);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (error) {
          console.error('usePatient: Database error:', error);
          // Handle "not found" errors gracefully
          if (error.code === 'PGRST116') {
            throw new Error(`Patient with ID ${patientId} not found`);
          }
          throw new Error(`Failed to fetch patient: ${error.message}`);
        }

        if (!data) {
          console.log('usePatient: No data returned for patient:', patientId);
          return null;
        }

        console.log('usePatient: Successfully fetched patient:', data.id, data.name);

        // Transform database patient to enhanced Patient object with risk calculations
        const patient: Patient = {
          ...data,
          leakageRisk: {
            score: data.leakage_risk_score,
            level: data.leakage_risk_level,
          },
        };

        // Enhance with computed fields (age, days since discharge, detailed risk factors)
        return enhancePatientDataSync(patient);
      } catch (error) {
        // Enhanced error handling with more context
        console.error(`Error fetching patient ${patientId}:`, error);
        if (error instanceof Error) {
          // Preserve the original error message for "not found" errors
          if (error.message.includes('not found')) {
            throw error;
          }
          throw new Error(`Database connection error: ${error.message}`);
        } else {
          throw new Error('Unknown error occurred while fetching patient data');
        }
      }
    },
    enabled: !!patientId, // Only run query if patientId is provided
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
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
    refetchOnWindowFocus: false, // Prevent refetch when window regains focus
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data to prevent flashing
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
  /** True if there was an error fetching data */
  isError: boolean;
  /** True if data is being refetched (not initial load) */
  isRefetching: boolean;
  /** Number of failed attempts to fetch data */
  failureCount: number;
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
    isError: query.isError,
    isRefetching: query.isRefetching,
    failureCount: query.failureCount,
  };
}
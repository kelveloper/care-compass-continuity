import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Patient, PatientFilters } from '@/types';
import { enhancePatientDataSync } from '@/lib/risk-calculator';
import type { Database } from '@/integrations/supabase/types';
import { useEffect, useRef } from 'react';
import { useToast } from './use-toast';

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
  const { toast } = useToast();
  
  // Add debounce ref for real-time updates
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Note: Real-time subscriptions are now handled by useBackgroundSync hook
  // This provides centralized real-time updates for better performance
  
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: async (): Promise<Patient[]> => {
      console.log('usePatients: Fetching patients with filters:', filters);
      try {
        // Try optimized query functions first, then fallback to regular queries
        let data, error;
        
        try {
          // Use optimized high-risk patient function if filtering by high risk
          if (filters?.riskLevel === 'high' || (filters?.minRiskScore && filters.minRiskScore >= 70)) {
            console.log('usePatients: Using optimized high-risk patient function');
            const { getHighRiskPatients } = await import('@/lib/query-utils');
            
            const optimizedPatients = await getHighRiskPatients({
              riskThreshold: filters.minRiskScore || 70,
              limit: filters.limit || 100,
              offset: 0
            });
            
            if (optimizedPatients.length > 0) {
              console.log('usePatients: Successfully fetched', optimizedPatients.length, 'high-risk patients from optimized function');
              return optimizedPatients;
            }
          }
          
          // Use optimized search function if search term is provided
          if (filters?.search) {
            console.log('usePatients: Using optimized full-text search');
            const { performFullTextSearch } = await import('@/lib/query-utils');
            
            const searchResults = await performFullTextSearch({
              searchTerm: filters.search,
              searchType: 'patients',
              limit: filters.limit || 100
            });
            
            if (searchResults.patients.length > 0) {
              console.log('usePatients: Successfully fetched', searchResults.patients.length, 'patients from optimized search');
              return searchResults.patients;
            }
          }
          
          // Use optimized dashboard view for general queries
          let query = supabase
            .from('dashboard_patients')
            .select('*');
          
          // Apply filters if provided with optimized queries
          if (filters) {
            console.log('usePatients: Applying optimized filters:', filters);
            
            // Filter by risk level (uses index)
            if (filters.riskLevel) {
              query = query.eq('leakage_risk_level', filters.riskLevel);
            }
            
            // Filter by referral status (uses index)
            if (filters.referralStatus) {
              query = query.eq('referral_status', filters.referralStatus);
            }
            
            // Filter by insurance (uses index)
            if (filters.insurance) {
              query = query.eq('insurance', filters.insurance);
            }
            
            // Filter by diagnosis using full-text search (uses GIN index)
            if (filters.diagnosis) {
              query = query.textSearch('diagnosis', filters.diagnosis, {
                type: 'websearch',
                config: 'english'
              });
            }
            
            // Add age filter if provided
            if (filters.minAge) {
              query = query.gte('age', filters.minAge);
            }
            if (filters.maxAge) {
              query = query.lte('age', filters.maxAge);
            }
            
            // Add days since discharge filter if provided
            if (filters.maxDaysSinceDischarge) {
              query = query.lte('days_since_discharge', filters.maxDaysSinceDischarge);
            }
          }
          
          // Order by risk score (uses covering index for better performance)
          query = query.order('leakage_risk_score', { ascending: false })
                      .order('created_at', { ascending: false });
          
          // Limit results for better performance (add pagination support)
          const limit = filters?.limit || 100;
          query = query.limit(limit);
          
          const result = await query;
          data = result.data;
          error = result.error;
          
          if (!error && data) {
            console.log('usePatients: Successfully fetched', data.length, 'patients from optimized view');
            const enhancedPatients = enhancePatients(data);
            console.log('usePatients: Enhanced patients:', enhancedPatients.length);
            return enhancedPatients;
          }
        } catch (optimizedError) {
          console.warn('usePatients: Optimized queries not available, falling back to regular table');
          error = optimizedError;
        }
        
        // Fallback to regular patients table if optimized view fails
        if (error || !data) {
          console.log('usePatients: Using fallback patients table query');
          let fallbackQuery = supabase
            .from('patients')
            .select('*');
          
          // Apply filters if provided
          if (filters) {
            console.log('usePatients: Applying fallback filters:', filters);
            // Filter by risk level
            if (filters.riskLevel) {
              fallbackQuery = fallbackQuery.eq('leakage_risk_level', filters.riskLevel);
            }
            
            // Filter by referral status
            if (filters.referralStatus) {
              fallbackQuery = fallbackQuery.eq('referral_status', filters.referralStatus);
            }
            
            // Filter by insurance
            if (filters.insurance) {
              fallbackQuery = fallbackQuery.eq('insurance', filters.insurance);
            }
            
            // Filter by diagnosis (partial match)
            if (filters.diagnosis) {
              fallbackQuery = fallbackQuery.ilike('diagnosis', `%${filters.diagnosis}%`);
            }
            
            // Search across multiple fields
            if (filters.search) {
              const searchTerm = `%${filters.search}%`;
              fallbackQuery = fallbackQuery.or(`name.ilike.${searchTerm},diagnosis.ilike.${searchTerm},required_followup.ilike.${searchTerm}`);
            }
          }
          
          // Order by created_at for fallback
          fallbackQuery = fallbackQuery.order('leakage_risk_score', { ascending: false })
                                      .order('created_at', { ascending: false });
          
          // Limit results
          const limit = filters?.limit || 100;
          fallbackQuery = fallbackQuery.limit(limit);
          
          const fallbackResult = await fallbackQuery;

          if (fallbackResult.error) {
            console.error('usePatients: Fallback database error:', fallbackResult.error);
            throw new Error(`Failed to fetch patients: ${fallbackResult.error.message}`);
          }

          if (!fallbackResult.data) {
            console.log('usePatients: No data returned from fallback database');
            return [];
          }

          console.log('usePatients: Successfully fetched', fallbackResult.data.length, 'patients from fallback');
          const enhancedPatients = enhancePatients(fallbackResult.data);
          console.log('usePatients: Enhanced patients:', enhancedPatients.length);
          return enhancedPatients;
        }

        return [];
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
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes (optimized for patient data)
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: true, // Refetch when window regains focus for fresh patient data
    refetchOnMount: 'always', // Always refetch on mount for critical patient data
    refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
    refetchIntervalInBackground: true, // Continue background refetch even when tab is not active
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data to prevent flashing
    onError: (error) => {
      // Show toast notification for network/database errors
      toast({
        title: 'Failed to Load Patients',
        description: error.message || 'There was a problem connecting to the database. Please check your connection and try again.',
        variant: 'destructive',
      });
    },
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
  const { toast } = useToast();
  
  // Note: Real-time subscriptions are now handled by useBackgroundSync hook
  // This provides centralized real-time updates for better performance
  
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
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: (failureCount, error) => {
      // Don't retry for "not found" errors
      if (error.message.includes('not found')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: true, // Refetch when window regains focus for fresh patient data
    refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes for individual patients
    refetchIntervalInBackground: true, // Continue background refetch even when tab is not active
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data to prevent flashing
    onError: (error) => {
      // Only show toast for non-"not found" errors
      if (!error.message.includes('not found')) {
        toast({
          title: 'Failed to Load Patient',
          description: error.message || 'There was a problem loading patient data. Please try again.',
          variant: 'destructive',
        });
      }
    },
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
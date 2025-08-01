import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Patient, PatientFilters } from '@/types';
import { enhancePatientDataSync } from '@/lib/risk-calculator';
import type { Database } from '@/integrations/supabase/types';
import { useEffect, useRef } from 'react';
import { useToast } from './use-toast';
import { useErrorHandler } from './use-error-handler';
import { handleSupabaseError, handleApiCallWithRetry } from '@/lib/api-error-handler';
import { useNetworkStatus } from './use-network-status';
import { useOfflineAwareOperation } from './use-offline-state';

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
  const { handleError } = useErrorHandler({ 
    context: 'usePatients',
    showToast: false // We'll handle toasts manually for better UX
  });
  const networkStatus = useNetworkStatus();
  const { executeOfflineAware } = useOfflineAwareOperation();
  
  // Add debounce ref for real-time updates
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Note: Real-time subscriptions are now handled by useBackgroundSync hook
  // This provides centralized real-time updates for better performance
  
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: async (): Promise<Patient[]> => {
      console.log('usePatients: Fetching patients with filters:', filters);
      
      // Use offline-aware operation with fallback to cached data
      const result = await executeOfflineAware(
        // Online operation
        async () => handleApiCallWithRetry(
          async () => {
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
          
          // Start with regular patients table since dashboard_patients view may not exist
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
            
            // Filter by diagnosis (partial match since full-text search may not be available)
            if (filters.diagnosis) {
              query = query.ilike('diagnosis', `%${filters.diagnosis}%`);
            }
            
            // Search across multiple fields
            if (filters.search) {
              const searchTerm = `%${filters.search}%`;
              query = query.or(`name.ilike.${searchTerm},diagnosis.ilike.${searchTerm},required_followup.ilike.${searchTerm}`);
            }
          }
          
          // Order by risk score (highest first) then by created date
          query = query.order('leakage_risk_score', { ascending: false })
                      .order('created_at', { ascending: false });
          
          // Limit results for better performance
          const limit = filters?.limit || 100;
          query = query.limit(limit);
          
          const result = await query;
          data = result.data;
          error = result.error;
          
          if (!error && data) {
            console.log('usePatients: Successfully fetched', data.length, 'patients from patients table');
            console.log('usePatients: Sample raw patient:', data[0]);
            const enhancedPatients = enhancePatients(data);
            console.log('usePatients: Enhanced patients:', enhancedPatients.length);
            console.log('usePatients: Sample enhanced patient:', enhancedPatients[0]);
            return enhancedPatients;
          }
        } catch (queryError) {
          console.error('usePatients: Database query error:', queryError);
          throw handleSupabaseError(queryError);
        }
        
        // Handle case where query succeeded but returned no data
        if (!data) {
          console.log('usePatients: No data returned from database');
          return [];
        }

        // If we get here, there was an error
        if (error) {
          console.error('usePatients: Database error:', error);
          throw handleSupabaseError(error);
        }

        return [];
          },
          {
            context: 'fetchPatients',
            maxRetries: networkStatus.getNetworkQuality() === 'poor' ? 1 : 3,
            retryDelay: networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000,
            networkAware: true,
            onRetry: (attempt, error) => {
              console.log(`usePatients: Retry attempt ${attempt} after error:`, error.message);
            }
          }
        ),
        {
          feature: 'view-patients',
          fallback: async () => {
            // Offline fallback - return cached data if available
            console.log('usePatients: Using offline fallback');
            const cachedData = queryClient.getQueryData(['patients', filters]);
            if (cachedData) {
              console.log('usePatients: Returning cached data');
              return { data: cachedData as Patient[], error: null, attempts: 1 };
            }
            
            // If no cached data, return empty array
            console.log('usePatients: No cached data available offline');
            return { data: [], error: null, attempts: 1 };
          },
          operationName: 'fetch patients',
          showOfflineMessage: false, // We'll show this in the UI component
        }
      );

      return result?.data || [];
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes (optimized for patient data)
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!networkStatus.isOnline) return false;
      
      // Reduce retries on poor connections
      const maxRetries = networkStatus.getNetworkQuality() === 'poor' ? 1 : 3;
      
      // Don't retry for certain error types
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as Error).message.toLowerCase();
        if (errorMessage.includes('not found') || 
            errorMessage.includes('unauthorized') || 
            errorMessage.includes('forbidden')) {
          return false;
        }
      }
      
      return failureCount < maxRetries;
    },
    retryDelay: (attemptIndex) => {
      // Longer delays on poor connections
      const baseDelay = networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000;
      return Math.min(baseDelay * 2 ** attemptIndex, 30000);
    },
    refetchOnWindowFocus: true, // Refetch when window regains focus for fresh patient data
    refetchOnMount: 'always', // Always refetch on mount for critical patient data
    refetchInterval: () => {
      // Adjust refetch interval based on network quality
      if (!networkStatus.isOnline) return false;
      
      const quality = networkStatus.getNetworkQuality();
      switch (quality) {
        case 'good': return 5 * 60 * 1000; // 5 minutes
        case 'fair': return 10 * 60 * 1000; // 10 minutes
        case 'poor': return 15 * 60 * 1000; // 15 minutes
        default: return false;
      }
    },
    refetchIntervalInBackground: networkStatus.getNetworkQuality() !== 'poor', // Don't background refetch on poor connections
    placeholderData: (previousData) => previousData || [], // Keep previous data while fetching new data to prevent flashing
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
    data: query.data || undefined,
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
  const { handleError } = useErrorHandler({ 
    context: 'usePatient',
    showToast: false // We'll handle toasts manually for better UX
  });
  const networkStatus = useNetworkStatus();
  
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
      
      // Use network-aware API call with retry logic
      const result = await handleApiCallWithRetry(
        async () => {
          const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

          if (error) {
            console.error('usePatient: Database error:', error);
            throw handleSupabaseError(error);
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
        },
        {
          context: 'fetchPatient',
          maxRetries: networkStatus.getNetworkQuality() === 'poor' ? 1 : 3,
          retryDelay: networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000,
          networkAware: true,
          onRetry: (attempt, error) => {
            console.log(`usePatient: Retry attempt ${attempt} for patient ${patientId} after error:`, error.message);
          }
        }
      );

      if (result.error) {
        console.error(`Error fetching patient ${patientId}:`, result.error);
        throw handleSupabaseError(result.error);
      }

      return result.data;
    },
    enabled: !!patientId, // Only run query if patientId is provided
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!networkStatus.isOnline) return false;
      
      // Don't retry for "not found" errors
      if (error.message.includes('not found')) {
        return false;
      }
      
      // Reduce retries on poor connections
      const maxRetries = networkStatus.getNetworkQuality() === 'poor' ? 1 : 3;
      return failureCount < maxRetries;
    },
    retryDelay: (attemptIndex) => {
      // Longer delays on poor connections
      const baseDelay = networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000;
      return Math.min(baseDelay * 2 ** attemptIndex, 30000);
    },
    refetchOnWindowFocus: true, // Refetch when window regains focus for fresh patient data
    refetchInterval: () => {
      // Adjust refetch interval based on network quality
      if (!networkStatus.isOnline) return false;
      
      const quality = networkStatus.getNetworkQuality();
      switch (quality) {
        case 'good': return 5 * 60 * 1000; // 5 minutes
        case 'fair': return 10 * 60 * 1000; // 10 minutes
        case 'poor': return false; // No background refetch on poor connections
        default: return false;
      }
    },
    refetchIntervalInBackground: networkStatus.getNetworkQuality() === 'good', // Only on good connections
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
    data: query.data || null,
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
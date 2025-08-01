import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Provider, Patient, ProviderMatch } from '@/types';
import { findMatchingProviders } from '@/lib/provider-matching';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from './use-toast';
import { handleApiCallWithRetry, handleSupabaseError } from '@/lib/api-error-handler';
import { useNetworkStatus } from './use-network-status';

type DatabaseProvider = Database['public']['Tables']['providers']['Row'];

/**
 * Custom hook for intelligent provider matching
 * Implements multi-criteria provider ranking algorithm with geographic distance calculations
 */
export function useProviderMatch() {
  const [currentMatches, setCurrentMatches] = useState<ProviderMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const { toast } = useToast();
  const networkStatus = useNetworkStatus();

  // Fetch all providers for matching
  const {
    data: providers,
    isLoading: providersLoading,
    error: providersError,
    refetch: refetchProviders
  } = useQuery({
    queryKey: ['providers', 'for-matching'],
    queryFn: async (): Promise<Provider[]> => {
      console.log('Fetching providers from database...');
      
      const result = await handleApiCallWithRetry(
        async () => {
          const queryResult = await supabase
            .from('providers')
            .select('*')
            .order('rating', { ascending: false })
            .order('name', { ascending: true });

          if (queryResult.error) {
            console.error('Database error fetching providers:', queryResult.error);
            throw handleSupabaseError(queryResult.error);
          }

          if (!queryResult.data) {
            console.warn('No provider data returned from database');
            return [];
          }

          console.log(`Successfully fetched ${queryResult.data.length} providers from database`);
          
          // Transform database providers to Provider objects
          return queryResult.data.map((dbProvider: DatabaseProvider) => ({
            ...dbProvider,
            specialties: dbProvider.specialties || [],
            accepted_insurance: dbProvider.accepted_insurance || [],
            in_network_plans: dbProvider.in_network_plans || [],
            type: dbProvider.type || 'General',
            rating: dbProvider.rating || 0,
            latitude: dbProvider.latitude || 0,
            longitude: dbProvider.longitude || 0,
            availability_next: dbProvider.availability_next || 'Call for availability',
            phone: dbProvider.phone || '',
            address: dbProvider.address || '',
            created_at: dbProvider.created_at || new Date().toISOString()
          }));
        },
        {
          context: 'fetchProvidersForMatching',
          maxRetries: 3,
          retryDelay: 1000,
          networkAware: true,
          onRetry: (attempt, error) => {
            console.log(`useProviderMatch: Retry attempt ${attempt} to fetch providers after error:`, error.message);
          }
        }
      );

      if (result.error) {
        console.error('Error in provider fetch:', result.error);
        throw result.error;
      }

      return result.data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchInterval: 15 * 60 * 1000,
    refetchIntervalInBackground: false,
  });

  /**
   * Find matching providers for a patient
   */
  const findMatches = useCallback(
    async (patient: Patient, serviceType?: string, limit: number = 5): Promise<ProviderMatch[]> => {
      setIsMatching(true);
      setMatchError(null);
      console.log(`Finding matches for patient ${patient.id} with service type: ${serviceType || patient.required_followup}`);

      try {
        if (!providers || providers.length === 0) {
          console.log('No providers available for matching');
          return [];
        }

        // Use the matching algorithm
        const matches = findMatchingProviders(providers, patient, limit);

        setCurrentMatches(matches);
        return matches;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to find provider matches';
        console.error('Provider matching error:', errorMessage);
        setMatchError(errorMessage);
        setCurrentMatches([]);
        
        toast({
          title: 'Provider Matching Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        
        return [];
      } finally {
        setIsMatching(false);
      }
    },
    [providers, toast]
  );

  /**
   * Refresh providers from database
   */
  const refreshProviders = useCallback(async () => {
    console.log('Manually refreshing providers...');
    await refetchProviders();
  }, [refetchProviders]);

  // Calculate loading and ready states
  const isReady = !providersLoading && !!providers && providers.length > 0;
  const hasError = !!providersError || !!matchError;

  return {
    // Provider data
    providers: providers || [],
    providersLoading,
    providersError,
    
    // Matching state
    currentMatches,
    isMatching,
    matchError,
    
    // Computed states
    isReady,
    hasError,
    
    // Actions
    findMatches,
    refreshProviders,
  };
}

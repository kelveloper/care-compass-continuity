import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Provider, Patient, ProviderMatch } from '@/types';
import { findMatchingProviders } from '@/lib/provider-matching';
import type { Database } from '@/integrations/supabase/types';

type DatabaseProvider = Database['public']['Tables']['providers']['Row'];

/**
 * Custom hook for fetching all providers
 * Implements proper error handling and caching
 */
export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: async (): Promise<Provider[]> => {
      // Use materialized view for better performance when available
      const { data, error } = await supabase
        .from('provider_match_cache')
        .select('*')
        .order('rating_score', { ascending: false })
        .order('availability_score', { ascending: false });

      if (error) {
        // Fallback to regular providers table if materialized view fails
        console.warn('Materialized view query failed, falling back to providers table:', error);
        const fallbackResult = await supabase
          .from('providers')
          .select('*')
          .order('rating', { ascending: false });
          
        if (fallbackResult.error) {
          throw new Error(`Failed to fetch providers: ${fallbackResult.error.message}`);
        }
        
        return fallbackResult.data?.map((dbProvider: DatabaseProvider) => ({
          ...dbProvider,
        })) || [];
      }

      if (!data) {
        return [];
      }

      // Transform cached provider data to Provider objects
      return data.map((cachedProvider: any) => ({
        ...cachedProvider,
        // Map cached fields back to original provider structure
        id: cachedProvider.id,
        name: cachedProvider.name,
        type: cachedProvider.type,
        address: cachedProvider.address,
        phone: cachedProvider.phone,
        specialties: cachedProvider.specialties,
        accepted_insurance: cachedProvider.accepted_insurance,
        in_network_plans: cachedProvider.in_network_plans,
        rating: cachedProvider.rating,
        latitude: cachedProvider.latitude,
        longitude: cachedProvider.longitude,
        availability_next: cachedProvider.availability_next,
        created_at: cachedProvider.created_at,
        // Include pre-calculated scores for faster matching
        _cached_availability_score: cachedProvider.availability_score,
        _cached_rating_score: cachedProvider.rating_score,
      }));
    },
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Providers don't change as frequently
    refetchInterval: 15 * 60 * 1000, // Background refetch every 15 minutes
    refetchIntervalInBackground: false, // Don't refetch providers in background to save resources
  });
}

// Note: useProviderMatch has been moved to its own dedicated file at src/hooks/use-provider-match.ts
// This provides better separation of concerns and more comprehensive matching functionality

/**
 * Custom hook for fetching providers by type/specialty
 */
export function useProvidersByType(providerType?: string) {
  return useQuery({
    queryKey: ['providers', 'by-type', providerType],
    queryFn: async (): Promise<Provider[]> => {
      // Use optimized query with covering index
      let query = supabase
        .from('providers')
        .select('*');

      if (providerType) {
        // Use composite index for type + rating
        query = query.eq('type', providerType);
      }
      
      // Order by rating using covering index
      query = query.order('rating', { ascending: false })
                  .order('name', { ascending: true }); // Secondary sort for consistency

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch providers: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      return data.map((dbProvider: DatabaseProvider) => ({
        ...dbProvider,
      }));
    },
    enabled: !!providerType, // Only run query if providerType is provided
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Providers don't change as frequently
    refetchInterval: 15 * 60 * 1000, // Background refetch every 15 minutes
    refetchIntervalInBackground: false, // Don't refetch providers in background to save resources
  });
}

/**
 * Custom hook for fetching providers that accept specific insurance
 */
export function useProvidersByInsurance(insurance?: string) {
  return useQuery({
    queryKey: ['providers', 'by-insurance', insurance],
    queryFn: async (): Promise<Provider[]> => {
      if (!insurance) {
        return [];
      }

      // Use GIN indexes for faster array searches
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .or(`in_network_plans.cs.{${insurance}},accepted_insurance.cs.{${insurance}}`)
        .order('rating', { ascending: false })
        .order('name', { ascending: true }); // Secondary sort for consistency

      if (error) {
        throw new Error(`Failed to fetch providers: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      return data.map((dbProvider: DatabaseProvider) => ({
        ...dbProvider,
      }));
    },
    enabled: !!insurance, // Only run query if insurance is provided
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Providers don't change as frequently
    refetchInterval: 15 * 60 * 1000, // Background refetch every 15 minutes
    refetchIntervalInBackground: false, // Don't refetch providers in background to save resources
  });
}

/**
 * Hook return types for better TypeScript support
 */
export interface UseProvidersReturn {
  /** Array of all providers sorted by rating */
  data: Provider[] | undefined;
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
 * Typed version of useProviders hook with explicit return type
 */
export function useProvidersTyped(): UseProvidersReturn {
  const query = useProviders();
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isInitialLoading: query.isInitialLoading,
    isFetching: query.isFetching,
  };
}
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
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('rating', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch providers: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Transform database providers to Provider objects
      return data.map((dbProvider: DatabaseProvider) => ({
        ...dbProvider,
      }));
    },
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
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
      let query = supabase
        .from('providers')
        .select('*')
        .order('rating', { ascending: false });

      if (providerType) {
        query = query.eq('type', providerType);
      }

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

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .contains('accepted_insurance', [insurance])
        .order('rating', { ascending: false });

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
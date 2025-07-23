import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Provider, Patient, ProviderMatch } from '@/types';
import { findMatchingProviders } from '@/lib/provider-matching';
import type { Database } from '@/integrations/supabase/types';

type DatabaseProvider = Database['public']['Tables']['providers']['Row'];

/**
 * Custom hook for intelligent provider matching
 * Implements multi-criteria provider ranking algorithm with geographic distance calculations
 * 
 * Requirements addressed:
 * - 3.1: Find and rank providers based on multiple matching criteria
 * - 3.2: Display top recommendations with detailed information
 * - 3.4: Consider specialty match, geographic proximity, insurance acceptance, and availability
 */
export function useProviderMatch() {
  const [currentMatches, setCurrentMatches] = useState<ProviderMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Fetch all providers for matching
  const {
    data: providers,
    isLoading: providersLoading,
    error: providersError,
    refetch: refetchProviders
  } = useQuery({
    queryKey: ['providers', 'for-matching'],
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

  /**
   * Find matching providers for a patient using multi-criteria algorithm
   * Implements geographic distance calculations and intelligent ranking
   * 
   * This function applies all four key filtering criteria:
   * - Insurance network matching
   * - Geographic proximity (using coordinates)
   * - Specialty matching
   * - Availability filtering
   * 
   * @param patient - Patient to find matches for
   * @param serviceType - Optional service type to filter by
   * @param limit - Maximum number of matches to return
   * @returns Promise resolving to array of provider matches
   */
  const findMatches = useCallback(
    async (patient: Patient, serviceType?: string, limit: number = 5): Promise<ProviderMatch[]> => {
      setIsMatching(true);
      setMatchError(null);

      try {
        if (!providers || providers.length === 0) {
          throw new Error('No providers available for matching');
        }

        // Step 1: Filter providers by service type if specified (specialty matching)
        let filteredProviders = providers;
        if (serviceType) {
          const { hasSpecialtyMatch } = await import('@/lib/provider-matching');
          
          // Use enhanced specialty matching
          filteredProviders = providers.filter(provider => {
            // If serviceType is provided, use it for matching
            if (serviceType) {
              return hasSpecialtyMatch(provider, serviceType);
            }
            
            // Otherwise use patient's required followup
            return hasSpecialtyMatch(provider, patient.required_followup);
          });
        }

        if (filteredProviders.length === 0) {
          throw new Error(`No providers found for service type: ${serviceType || patient.required_followup}`);
        }

        // Step 2: Filter by insurance network (insurance network matching)
        const { isInNetwork } = await import('@/lib/provider-matching');
        
        // Separate in-network and out-of-network providers
        const inNetworkProviders = filteredProviders.filter(provider => 
          isInNetwork(provider, patient.insurance)
        );
        
        // If we have enough in-network providers, prioritize them
        // Otherwise, include out-of-network providers to meet the limit
        let candidateProviders = inNetworkProviders;
        if (inNetworkProviders.length < limit) {
          const outOfNetworkProviders = filteredProviders.filter(provider => 
            !isInNetwork(provider, patient.insurance)
          );
          
          // Add out-of-network providers to fill the gap
          candidateProviders = [
            ...inNetworkProviders,
            ...outOfNetworkProviders
          ];
        }

        // Step 3: Use the enhanced provider matching algorithm with all criteria
        // - Geographic proximity (using coordinates)
        // - Insurance network matching
        // - Specialty matching
        // - Availability filtering
        const matches = findMatchingProviders(candidateProviders, patient, limit);
        
        setCurrentMatches(matches);
        return matches;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to find provider matches';
        setMatchError(errorMessage);
        setCurrentMatches([]);
        return [];
      } finally {
        setIsMatching(false);
      }
    },
    [providers]
  );

  /**
   * Find providers by specific criteria (specialty, insurance, location, availability)
   * Implements provider filtering logic for:
   * - Insurance network matching
   * - Geographic proximity (using coordinates)
   * - Specialty matching
   * - Availability filtering
   * 
   * @param criteria - Object containing filter criteria
   * @returns Promise resolving to filtered providers array
   */
  const findProvidersByCriteria = useCallback(
    async (criteria: {
      specialty?: string;
      insurance?: string;
      maxDistance?: number;
      patientLocation?: { lat: number; lng: number };
      minRating?: number;
      availability?: string;
      availabilityMinScore?: number;
      sortBy?: 'distance' | 'rating' | 'availability' | 'match';
    }): Promise<Provider[]> => {
      if (!providers) return [];

      let filteredProviders = [...providers];

      // Filter by specialty - enhanced specialty matching
      if (criteria.specialty) {
        const { hasSpecialtyMatch } = await import('@/lib/provider-matching');
        filteredProviders = filteredProviders.filter(provider => 
          hasSpecialtyMatch(provider, criteria.specialty || '')
        );
      }

      // Filter by insurance - enhanced insurance network matching
      if (criteria.insurance) {
        const { isInNetwork } = await import('@/lib/provider-matching');
        filteredProviders = filteredProviders.filter(provider => 
          isInNetwork(provider, criteria.insurance || '')
        );
      }

      // Filter by minimum rating
      if (criteria.minRating) {
        filteredProviders = filteredProviders.filter(provider =>
          provider.rating >= criteria.minRating!
        );
      }

      // Filter by distance if location and max distance provided - geographic proximity
      if (criteria.patientLocation && criteria.maxDistance) {
        const { calculateDistance } = await import('@/lib/provider-matching');
        filteredProviders = filteredProviders.filter(provider => {
          if (!provider.latitude || !provider.longitude) return false;
          
          const distance = calculateDistance(
            criteria.patientLocation!.lat,
            criteria.patientLocation!.lng,
            provider.latitude,
            provider.longitude
          );
          
          // Add distance to provider object for sorting later
          (provider as any).distance = Math.round(distance * 10) / 10;
          
          return distance <= criteria.maxDistance!;
        });
      }

      // Filter by availability - availability filtering
      if (criteria.availability || criteria.availabilityMinScore) {
        const { calculateAvailabilityScore } = await import('@/lib/provider-matching');
        
        filteredProviders = filteredProviders.filter(provider => {
          // Skip providers with no availability information
          if (!provider.availability_next) return false;
          
          // Filter by specific availability text if provided
          if (criteria.availability && 
              !provider.availability_next.toLowerCase().includes(criteria.availability.toLowerCase())) {
            return false;
          }
          
          // Filter by minimum availability score if provided
          if (criteria.availabilityMinScore) {
            const score = calculateAvailabilityScore(provider.availability_next);
            // Store score for sorting later
            (provider as any).availabilityScore = score;
            return score >= criteria.availabilityMinScore;
          }
          
          return true;
        });
      }

      // Sort results based on sortBy parameter
      if (criteria.sortBy) {
        switch (criteria.sortBy) {
          case 'distance':
            // Sort by distance (closest first)
            if (criteria.patientLocation) {
              filteredProviders.sort((a, b) => {
                const distA = (a as any).distance || Number.MAX_VALUE;
                const distB = (b as any).distance || Number.MAX_VALUE;
                return distA - distB;
              });
            }
            break;
            
          case 'rating':
            // Sort by rating (highest first)
            filteredProviders.sort((a, b) => b.rating - a.rating);
            break;
            
          case 'availability':
            // Sort by availability (soonest first)
            const { calculateAvailabilityScore } = await import('@/lib/provider-matching');
            filteredProviders.sort((a, b) => {
              const scoreA = (a as any).availabilityScore || 
                calculateAvailabilityScore(a.availability_next);
              const scoreB = (b as any).availabilityScore || 
                calculateAvailabilityScore(b.availability_next);
              return scoreB - scoreA;
            });
            break;
            
          case 'match':
            // Sort by overall match (if we have patient data)
            if (criteria.patientLocation && criteria.insurance && criteria.specialty) {
              const mockPatient = {
                address: '',
                insurance: criteria.insurance,
                required_followup: criteria.specialty,
              } as any;
              
              const { calculateProviderMatch } = await import('@/lib/provider-matching');
              
              // Calculate match scores for sorting
              const providersWithScores = filteredProviders.map(provider => {
                const match = calculateProviderMatch(provider, mockPatient);
                return {
                  ...provider,
                  matchScore: match.matchScore
                };
              });
              
              // Sort by match score (highest first)
              return providersWithScores.sort((a, b) => 
                (b.matchScore || 0) - (a.matchScore || 0)
              );
            }
            break;
        }
      }

      return filteredProviders;
    },
    [providers]
  );

  /**
   * Get the top N providers for a specific service type
   * Uses enhanced specialty matching for better results
   * 
   * @param serviceType - The service type to filter by
   * @param limit - Maximum number of providers to return
   * @returns Array of top providers for the specified service type
   */
  const getTopProviders = useCallback(
    async (serviceType: string, limit: number = 3): Promise<Provider[]> => {
      if (!providers) return [];

      // Use the enhanced specialty matching function
      const { hasSpecialtyMatch } = await import('@/lib/provider-matching');
      
      // Filter providers using enhanced specialty matching
      const matchingProviders = providers.filter(provider => 
        hasSpecialtyMatch(provider, serviceType)
      );
      
      // Sort by rating and return top N
      return matchingProviders
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit);
    },
    [providers]
  );

  /**
   * Clear current matches
   */
  const clearMatches = useCallback(() => {
    setCurrentMatches([]);
    setMatchError(null);
  }, []);

  /**
   * Refresh provider data
   */
  const refreshProviders = useCallback(() => {
    return refetchProviders();
  }, [refetchProviders]);

  return {
    // Current matching state
    matches: currentMatches,
    isMatching,
    error: matchError || (providersError?.message ?? null),
    
    // Provider data state
    providers: providers || [],
    providersLoading,
    providersError: providersError?.message ?? null,
    
    // Matching functions
    findMatches,
    findProvidersByCriteria,
    getTopProviders,
    clearMatches,
    refreshProviders,
    
    // Utility flags
    hasProviders: (providers?.length ?? 0) > 0,
    isReady: !providersLoading && !providersError && (providers?.length ?? 0) > 0,
  };
}

/**
 * Hook return type for better TypeScript support
 */
export interface UseProviderMatchReturn {
  /** Current provider matches for the last search */
  matches: ProviderMatch[];
  /** True when actively finding matches */
  isMatching: boolean;
  /** Error message from matching process or provider loading */
  error: string | null;
  
  /** All available providers */
  providers: Provider[];
  /** True when loading providers */
  providersLoading: boolean;
  /** Error message from provider loading */
  providersError: string | null;
  
  /** Find matching providers for a patient */
  findMatches: (patient: Patient, serviceType?: string, limit?: number) => Promise<ProviderMatch[]>;
  /** Find providers by specific criteria */
  findProvidersByCriteria: (criteria: {
    specialty?: string;
    insurance?: string;
    maxDistance?: number;
    patientLocation?: { lat: number; lng: number };
    minRating?: number;
    availability?: string;
    availabilityMinScore?: number;
    sortBy?: 'distance' | 'rating' | 'availability' | 'match';
  }) => Promise<Provider[]>;
  /** Get top providers for a service type */
  getTopProviders: (serviceType: string, limit?: number) => Promise<Provider[]>;
  /** Clear current matches */
  clearMatches: () => void;
  /** Refresh provider data */
  refreshProviders: () => Promise<any>;
  
  /** True if providers are available */
  hasProviders: boolean;
  /** True if hook is ready to perform matching */
  isReady: boolean;
}
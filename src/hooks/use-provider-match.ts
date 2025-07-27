import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Provider, Patient, ProviderMatch } from '@/types';
import { findMatchingProviders } from '@/lib/provider-matching';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from './use-toast';

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
  const { toast } = useToast();

  // Fetch all providers for matching using optimized materialized view
  const {
    data: providers,
    isLoading: providersLoading,
    error: providersError,
    refetch: refetchProviders
  } = useQuery({
    queryKey: ['providers', 'for-matching'],
    queryFn: async (): Promise<Provider[]> => {
      console.log('Fetching providers from optimized cache...');
      
      try {
        // Try to use the materialized view first for better performance
        let data, error;
        
        try {
          const cacheResult = await supabase
            .from('provider_match_cache')
            .select('*')
            .order('rating_score', { ascending: false })
            .order('availability_score', { ascending: false });
            
          data = cacheResult.data;
          error = cacheResult.error;
          
          if (!error && data) {
            console.log(`Successfully fetched ${data.length} providers from cache`);
            
            // Transform cached provider data with pre-calculated scores
            return data.map((cachedProvider: any) => ({
              ...cachedProvider,
              // Ensure arrays are properly initialized
              specialties: cachedProvider.specialties || [],
              accepted_insurance: cachedProvider.accepted_insurance || [],
              in_network_plans: cachedProvider.in_network_plans || [],
              // Include pre-calculated scores for faster matching
              _cached_availability_score: cachedProvider.availability_score,
              _cached_rating_score: cachedProvider.rating_score,
            }));
          }
        } catch (cacheError) {
          console.warn('Materialized view not available, falling back to providers table');
          error = cacheError;
        }
        
        // Fallback to regular providers table if cache fails
        if (error || !data) {
          console.log('Using fallback providers table query...');
          const fallbackResult = await supabase
            .from('providers')
            .select('*')
            .order('rating', { ascending: false })
            .order('name', { ascending: true });

          if (fallbackResult.error) {
            console.error('Database error fetching providers:', fallbackResult.error);
            throw new Error(`Failed to fetch providers: ${fallbackResult.error.message}`);
          }

          if (!fallbackResult.data) {
            console.warn('No provider data returned from database');
            return [];
          }

          console.log(`Successfully fetched ${fallbackResult.data.length} providers from database`);
          
          // Transform database providers to Provider objects with proper type handling
          return fallbackResult.data.map((dbProvider: DatabaseProvider) => ({
            ...dbProvider,
            // Ensure arrays are properly initialized
            specialties: dbProvider.specialties || [],
            accepted_insurance: dbProvider.accepted_insurance || [],
            in_network_plans: dbProvider.in_network_plans || [],
          }));
        }

        return [];
      } catch (err) {
        console.error('Error in provider fetch:', err);
        throw err;
      }
    },
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes (providers change less frequently)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Providers don't change as frequently
    refetchInterval: 15 * 60 * 1000, // Background refetch every 15 minutes
    refetchIntervalInBackground: false, // Don't refetch providers in background to save resources
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
      console.log(`Finding matches for patient ${patient.id} with service type: ${serviceType || patient.required_followup}`);

      try {
        // If providers aren't loaded yet, try to fetch them directly with optimization
        if (!providers || providers.length === 0) {
          console.log('No cached providers available, fetching directly with optimization');
          
          // Try materialized view first, then fallback to regular table
          let dbProviders, error;
          
          try {
            const cacheResult = await supabase
              .from('provider_match_cache')
              .select('*')
              .order('rating_score', { ascending: false });
              
            if (!cacheResult.error && cacheResult.data) {
              dbProviders = cacheResult.data.map((cachedProvider: any) => ({
                ...cachedProvider,
                specialties: cachedProvider.specialties || [],
                accepted_insurance: cachedProvider.accepted_insurance || [],
                in_network_plans: cachedProvider.in_network_plans || [],
                _cached_availability_score: cachedProvider.availability_score,
                _cached_rating_score: cachedProvider.rating_score,
              }));
              console.log(`Successfully fetched ${dbProviders.length} providers from cache`);
            } else {
              throw new Error('Cache not available');
            }
          } catch (cacheError) {
            console.log('Cache unavailable, using regular providers table');
            const fallbackResult = await supabase
              .from('providers')
              .select('*')
              .order('rating', { ascending: false });
              
            error = fallbackResult.error;
            if (error) {
              console.error('Error fetching providers from database:', error);
              throw new Error(`Database error: ${error.message}`);
            }
            
            if (!fallbackResult.data || fallbackResult.data.length === 0) {
              console.error('No providers found in database');
              throw new Error('No providers available for matching in the database');
            }
            
            console.log(`Successfully fetched ${fallbackResult.data.length} providers directly from database`);
            
            // Use the directly fetched providers
            dbProviders = fallbackResult.data.map((dbProvider: DatabaseProvider) => ({
              ...dbProvider,
              specialties: dbProvider.specialties || [],
              accepted_insurance: dbProvider.accepted_insurance || [],
              in_network_plans: dbProvider.in_network_plans || [],
            }));
          }
          
          // Continue with the matching process using directly fetched providers
          return processProviderMatching(dbProviders, patient, serviceType, limit);
        }
        
        // If we have cached providers, use them
        console.log(`Using ${providers.length} cached providers for matching`);
        return processProviderMatching(providers, patient, serviceType, limit);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to find provider matches';
        console.error('Provider matching error:', errorMessage);
        setMatchError(errorMessage);
        setCurrentMatches([]);
        
        // Show error toast notification
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
    [providers]
  );
  
  // Helper function to process provider matching
  const processProviderMatching = async (
    providerList: Provider[],
    patient: Patient,
    serviceType?: string,
    limit: number = 5
  ): Promise<ProviderMatch[]> => {
    console.log(`Processing provider matching with ${providerList.length} providers`);
    
    try {
      // Try optimized geographic search first if patient has location data
      if (patient.address) {
        console.log('Attempting optimized geographic provider search');
        
        // Parse patient address to get coordinates (simplified - in production would use geocoding service)
        // For now, use mock coordinates based on address
        const patientCoords = getMockCoordinatesFromAddress(patient.address);
        
        if (patientCoords) {
          const { findProvidersWithinDistance } = await import('@/lib/query-utils');
          
          try {
            const geoProviders = await findProvidersWithinDistance({
              patientLat: patientCoords.lat,
              patientLng: patientCoords.lng,
              maxDistance: 25, // 25 mile radius
              minRating: 3.0,
              providerType: serviceType,
              insurance: patient.insurance,
              limit: limit * 2 // Get more candidates for better matching
            });
            
            if (geoProviders.length > 0) {
              console.log(`Found ${geoProviders.length} providers using optimized geographic search`);
              
              // Use the enhanced provider matching algorithm on the geographic results
              const { findMatchingProviders } = await import('@/lib/provider-matching');
              const matches = findMatchingProviders(geoProviders, patient, limit);
              
              console.log(`Optimized geographic matching found ${matches.length} matches`);
              
              if (matches.length > 0) {
                setCurrentMatches(matches);
                toast({
                  title: 'Provider Matches Found',
                  description: `Found ${matches.length} nearby provider${matches.length === 1 ? '' : 's'} for ${patient.name}.`,
                });
                return matches;
              }
            }
          } catch (geoError) {
            console.warn('Optimized geographic search failed, falling back to standard matching:', geoError);
          }
        }
      }
      
      // Fallback to standard provider matching process
      console.log('Using standard provider matching process');
      
      // Step 1: Filter providers by service type if specified (specialty matching)
      let filteredProviders = providerList;
      if (serviceType) {
        const { hasSpecialtyMatch } = await import('@/lib/provider-matching');
        
        console.log(`Filtering providers by service type: ${serviceType}`);
        
        // Use enhanced specialty matching
        filteredProviders = providerList.filter(provider => {
          // If serviceType is provided, use it for matching
          if (serviceType) {
            return hasSpecialtyMatch(provider, serviceType);
          }
          
          // Otherwise use patient's required followup
          return hasSpecialtyMatch(provider, patient.required_followup);
        });
        
        console.log(`Found ${filteredProviders.length} providers matching service type`);
      }

      if (filteredProviders.length === 0) {
        console.warn(`No providers found for service type: ${serviceType || patient.required_followup}`);
        throw new Error(`No providers found for service type: ${serviceType || patient.required_followup}`);
      }

      // Step 2: Filter by insurance network (insurance network matching)
      const { isInNetwork } = await import('@/lib/provider-matching');
      
      console.log(`Filtering providers by insurance: ${patient.insurance}`);
      
      // Separate in-network and out-of-network providers
      const inNetworkProviders = filteredProviders.filter(provider => 
        isInNetwork(provider, patient.insurance)
      );
      
      console.log(`Found ${inNetworkProviders.length} in-network providers`);
      
      // If we have enough in-network providers, prioritize them
      // Otherwise, include out-of-network providers to meet the limit
      let candidateProviders = inNetworkProviders;
      if (inNetworkProviders.length < limit) {
        console.log(`Not enough in-network providers, including out-of-network options`);
        
        const outOfNetworkProviders = filteredProviders.filter(provider => 
          !isInNetwork(provider, patient.insurance)
        );
        
        console.log(`Found ${outOfNetworkProviders.length} out-of-network providers`);
        
        // Add out-of-network providers to fill the gap
        candidateProviders = [
          ...inNetworkProviders,
          ...outOfNetworkProviders
        ];
      }

      // Step 3: Use the enhanced provider matching algorithm with all criteria
      console.log(`Running provider matching algorithm with ${candidateProviders.length} candidates`);
      
      // Import the matching function
      const { findMatchingProviders } = await import('@/lib/provider-matching');
      
      // Run the matching algorithm
      const matches = findMatchingProviders(candidateProviders, patient, limit);
      
      console.log(`Found ${matches.length} provider matches`);
      
      // Store the matches in state
      setCurrentMatches(matches);
      
      // Show success toast notification
      if (matches.length > 0) {
        toast({
          title: 'Provider Matches Found',
          description: `Found ${matches.length} matching provider${matches.length === 1 ? '' : 's'} for ${patient.name}.`,
        });
      } else {
        toast({
          title: 'No Provider Matches',
          description: 'No providers found matching the criteria. Try expanding your search.',
          variant: 'destructive',
        });
      }
      
      return matches;
    } catch (error) {
      console.error('Provider matching process failed:', error);
      throw error;
    }
  };
  
  // Helper function to get mock coordinates from address (in production, would use geocoding API)
  const getMockCoordinatesFromAddress = (address: string): { lat: number; lng: number } | null => {
    // Simple mock geocoding based on common city names
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'boston': { lat: 42.3601, lng: -71.0589 },
      'cambridge': { lat: 42.3736, lng: -71.1097 },
      'somerville': { lat: 42.3876, lng: -71.0995 },
      'newton': { lat: 42.3370, lng: -71.2092 },
      'brookline': { lat: 42.3317, lng: -71.1211 },
      'quincy': { lat: 42.2529, lng: -71.0023 },
      'lynn': { lat: 42.4668, lng: -70.9495 },
      'lowell': { lat: 42.6334, lng: -71.3162 },
      'worcester': { lat: 42.2626, lng: -71.8023 },
      'springfield': { lat: 42.1015, lng: -72.5898 },
    };
    
    const lowerAddress = address.toLowerCase();
    
    for (const [city, coords] of Object.entries(cityCoords)) {
      if (lowerAddress.includes(city)) {
        return coords;
      }
    }
    
    // Default to Boston area if no match found
    return { lat: 42.3601, lng: -71.0589 };
  };

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
   * Refresh provider data with improved error handling
   */
  const refreshProviders = useCallback(async () => {
    console.log('Refreshing provider data from database...');
    try {
      const result = await refetchProviders();
      
      if (result.error) {
        console.error('Error refreshing providers:', result.error);
        throw new Error(`Failed to refresh providers: ${result.error.message}`);
      }
      
      console.log(`Successfully refreshed ${result.data?.length || 0} providers`);
      return result;
    } catch (err) {
      console.error('Provider refresh error:', err);
      throw err;
    }
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
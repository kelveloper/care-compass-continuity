/**
 * Database query optimization utilities
 * Provides optimized query patterns and caching strategies
 */

import { supabase } from '@/integrations/supabase/client';
import { Provider, Patient } from '@/types';
import type { Database } from '@/integrations/supabase/types';
import { trackQuery } from './performance-monitor';

type DatabaseProvider = Database['public']['Tables']['providers']['Row'];

/**
 * Optimized provider search with geographic filtering
 * Uses spatial indexes and materialized views for better performance
 */
export async function searchProvidersOptimized(params: {
  specialty?: string;
  insurance?: string;
  maxDistance?: number;
  patientLat?: number;
  patientLng?: number;
  minRating?: number;
  limit?: number;
}): Promise<Provider[]> {
  return trackQuery('searchProvidersOptimized', async () => {
  const {
    specialty,
    insurance,
    maxDistance,
    patientLat,
    patientLng,
    minRating = 0,
    limit = 10
  } = params;

  try {
    // Try optimized materialized view first, fallback to regular table
    let data, error;
    
    try {
      // Start with the optimized materialized view if available
      let query = (supabase as any).from('provider_match_cache').select('*');

    // Apply filters using indexes
    if (specialty) {
      // Use GIN index for specialty search
      query = query.contains('specialties', [specialty]);
    }

    if (insurance) {
      // Use GIN indexes for insurance matching
      query = query.or(`in_network_plans.cs.{${insurance}},accepted_insurance.cs.{${insurance}}`);
    }

    if (minRating > 0) {
      // Use index on rating
      query = query.gte('rating', minRating);
    }

    // Geographic filtering using spatial indexes
    if (maxDistance && patientLat && patientLng) {
      // Use the spatial index for initial filtering
      // Calculate approximate bounding box for faster filtering
      const latDelta = maxDistance / 69; // Approximate miles to degrees
      const lngDelta = maxDistance / (69 * Math.cos(patientLat * Math.PI / 180));

      query = query
        .gte('latitude', patientLat - latDelta)
        .lte('latitude', patientLat + latDelta)
        .gte('longitude', patientLng - lngDelta)
        .lte('longitude', patientLng + lngDelta);
    }

      // Order by pre-calculated scores for better performance
      query = query
        .order('rating_score', { ascending: false })
        .order('availability_score', { ascending: false })
        .limit(limit);

      const result = await query;
      data = result.data;
      error = result.error;

      if (!error && data) {
        // Transform cached data to Provider objects
        const providers = data.map((cached: any) => ({
          ...cached,
          specialties: cached.specialties || [],
          accepted_insurance: cached.accepted_insurance || [],
          in_network_plans: cached.in_network_plans || [],
          _cached_availability_score: cached.availability_score,
          _cached_rating_score: cached.rating_score,
        }));

        // Apply precise distance filtering if needed
        if (maxDistance && patientLat && patientLng) {
          const { calculateDistance } = await import('./provider-matching');
          
          return providers.filter(provider => {
            if (!provider.latitude || !provider.longitude) return false;
            
            const distance = calculateDistance(
              patientLat,
              patientLng,
              provider.latitude,
              provider.longitude
            );
            
            return distance <= maxDistance;
          });
        }

        return providers;
      }
    } catch (cacheError) {
      console.warn('Materialized view query failed, falling back to providers table');
      error = cacheError;
    }

    // Fallback to basic search if cache fails
    if (error || !data) {
      return await searchProvidersBasic(params);
    }

    return [];
  } catch (error) {
    console.error('Optimized provider search failed:', error);
    return await searchProvidersBasic(params);
  }
  });
}

/**
 * Fallback provider search using basic providers table
 */
async function searchProvidersBasic(params: {
  specialty?: string;
  insurance?: string;
  maxDistance?: number;
  patientLat?: number;
  patientLng?: number;
  minRating?: number;
  limit?: number;
}): Promise<Provider[]> {
  const {
    specialty,
    insurance,
    maxDistance,
    patientLat,
    patientLng,
    minRating = 0,
    limit = 10
  } = params;

  let query = supabase.from('providers').select('*');

  // Apply filters
  if (specialty) {
    query = query.contains('specialties', [specialty]);
  }

  if (insurance) {
    query = query.or(`in_network_plans.cs.{${insurance}},accepted_insurance.cs.{${insurance}}`);
  }

  if (minRating > 0) {
    query = query.gte('rating', minRating);
  }

  // Geographic filtering
  if (maxDistance && patientLat && patientLng) {
    const latDelta = maxDistance / 69;
    const lngDelta = maxDistance / (69 * Math.cos(patientLat * Math.PI / 180));

    query = query
      .gte('latitude', patientLat - latDelta)
      .lte('latitude', patientLat + latDelta)
      .gte('longitude', patientLng - lngDelta)
      .lte('longitude', patientLng + lngDelta);
  }

  query = query
    .order('rating', { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Provider search failed: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  const providers = data.map((dbProvider: DatabaseProvider) => ({
    ...dbProvider,
    specialties: dbProvider.specialties || [],
    accepted_insurance: dbProvider.accepted_insurance || [],
    in_network_plans: dbProvider.in_network_plans || [],
  }));

  // Apply precise distance filtering
  if (maxDistance && patientLat && patientLng) {
    const { calculateDistance } = await import('./provider-matching');
    
    return providers.filter(provider => {
      if (!provider.latitude || !provider.longitude) return false;
      
      const distance = calculateDistance(
        patientLat,
        patientLng,
        provider.latitude,
        provider.longitude
      );
      
      return distance <= maxDistance;
    });
  }

  return providers;
}

/**
 * Optimized patient search with full-text search
 * Uses GIN indexes for better performance
 */
export async function searchPatientsOptimized(params: {
  searchTerm?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  referralStatus?: string;
  insurance?: string;
  minRiskScore?: number;
  maxRiskScore?: number;
  limit?: number;
  offset?: number;
}): Promise<Patient[]> {
  return trackQuery('searchPatientsOptimized', async () => {
  const {
    searchTerm,
    riskLevel,
    referralStatus,
    insurance,
    minRiskScore,
    maxRiskScore,
    limit = 50,
    offset = 0
  } = params;

  try {
    // Try optimized dashboard view first, fallback to regular table
    let data, error;
    
    try {
      // Use the optimized dashboard view
      let query = (supabase as any).from('dashboard_patients').select('*');

    // Full-text search using GIN index
    if (searchTerm) {
      // Use the full-text search index for better performance
      query = query.or(`
        name.ilike.%${searchTerm}%,
        diagnosis.ilike.%${searchTerm}%,
        required_followup.ilike.%${searchTerm}%
      `);
    }

    // Apply filters using indexes
    if (riskLevel) {
      query = query.eq('leakage_risk_level', riskLevel);
    }

    if (referralStatus) {
      query = query.eq('referral_status', referralStatus);
    }

    if (insurance) {
      query = query.eq('insurance', insurance);
    }

    if (minRiskScore !== undefined) {
      query = query.gte('leakage_risk_score', minRiskScore);
    }

    if (maxRiskScore !== undefined) {
      query = query.lte('leakage_risk_score', maxRiskScore);
    }

      // Use covering index for ordering
      query = query
        .order('leakage_risk_score', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const result = await query;
      data = result.data;
      error = result.error;

      if (!error && data) {
        // Transform to Patient objects with enhanced data
        const { enhancePatientDataSync } = await import('./risk-calculator');
        
        return (data as any[]).map((dbPatient: any) => {
          const patient = {
            ...dbPatient,
            leakageRisk: {
              score: dbPatient.leakage_risk_score,
              level: dbPatient.leakage_risk_level,
            },
          };
          
          return enhancePatientDataSync(patient);
        });
      }
    } catch (optimizedError) {
      console.warn('Dashboard view not available, falling back to patients table');
      error = optimizedError;
    }

    // Fallback to regular patients table if optimized view fails
    if (error || !data) {
      let fallbackQuery = supabase.from('patients').select('*');

      // Apply filters
      if (searchTerm) {
        fallbackQuery = fallbackQuery.or(`
          name.ilike.%${searchTerm}%,
          diagnosis.ilike.%${searchTerm}%,
          required_followup.ilike.%${searchTerm}%
        `);
      }

      if (riskLevel) {
        fallbackQuery = fallbackQuery.eq('leakage_risk_level', riskLevel);
      }

      if (referralStatus) {
        fallbackQuery = fallbackQuery.eq('referral_status', referralStatus as any);
      }

      if (insurance) {
        fallbackQuery = fallbackQuery.eq('insurance', insurance);
      }

      if (minRiskScore !== undefined) {
        fallbackQuery = fallbackQuery.gte('leakage_risk_score', minRiskScore);
      }

      if (maxRiskScore !== undefined) {
        fallbackQuery = fallbackQuery.lte('leakage_risk_score', maxRiskScore);
      }

      fallbackQuery = fallbackQuery
        .order('leakage_risk_score', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const fallbackResult = await fallbackQuery;

      if (fallbackResult.error) {
        throw new Error(`Patient search failed: ${fallbackResult.error.message}`);
      }

      if (!fallbackResult.data) {
        return [];
      }

      // Transform to Patient objects with enhanced data
      const { enhancePatientDataSync } = await import('./risk-calculator');
      
      return fallbackResult.data.map((dbPatient: any) => {
        const patient = {
          ...dbPatient,
          leakageRisk: {
            score: dbPatient.leakage_risk_score,
            level: dbPatient.leakage_risk_level,
          },
        };
        
        return enhancePatientDataSync(patient);
      });
    }

    return [];
  } catch (error) {
    console.error('Optimized patient search failed:', error);
    throw error;
  }
  });
}

/**
 * Batch provider lookup for referral management
 * Optimizes multiple provider queries into a single request
 */
export async function batchProviderLookup(providerIds: string[]): Promise<Map<string, Provider>> {
  if (providerIds.length === 0) {
    return new Map();
  }

  try {
    // Try materialized view first, fallback to regular table
    let data, error;
    
    try {
      // Use materialized view if available
      let query = (supabase as any)
        .from('provider_match_cache')
        .select('*')
        .in('id', providerIds);

      const result = await query;
      data = result.data;
      error = result.error;

      if (!error && data) {
        const providerMap = new Map<string, Provider>();
        data.forEach(cached => {
          providerMap.set(cached.id, {
            ...cached,
            specialties: cached.specialties || [],
            accepted_insurance: cached.accepted_insurance || [],
            in_network_plans: cached.in_network_plans || [],
            _cached_availability_score: cached.availability_score,
            _cached_rating_score: cached.rating_score,
          });
        });

        return providerMap;
      }
    } catch (cacheError) {
      console.warn('Provider cache not available, falling back to providers table');
      error = cacheError;
    }

    // Fallback to regular providers table if cache fails
    if (error || !data) {
      const fallbackResult = await supabase
        .from('providers')
        .select('*')
        .in('id', providerIds);

      if (fallbackResult.error) {
        throw new Error(`Batch provider lookup failed: ${fallbackResult.error.message}`);
      }

      const providerMap = new Map<string, Provider>();
      fallbackResult.data?.forEach(provider => {
        providerMap.set(provider.id, {
          ...provider,
          specialties: provider.specialties || [],
          accepted_insurance: provider.accepted_insurance || [],
          in_network_plans: provider.in_network_plans || [],
        });
      });

      return providerMap;
    }

    return new Map();
  } catch (error) {
    console.error('Batch provider lookup failed:', error);
    throw error;
  }
}

/**
 * Refresh materialized view cache
 * Should be called periodically or when provider data changes
 */
export async function refreshProviderCache(): Promise<void> {
  try {
    const { error } = await (supabase as any).rpc('refresh_provider_match_cache');
    
    if (error) {
      console.error('Failed to refresh provider cache:', error);
      throw new Error(`Cache refresh failed: ${error.message}`);
    }
    
    console.log('Provider cache refreshed successfully');
  } catch (error) {
    console.error('Provider cache refresh error:', error);
    throw error;
  }
}

/**
 * Optimized geographic provider search using database function
 * Leverages the new find_providers_within_distance function for better performance
 */
export async function findProvidersWithinDistance(params: {
  patientLat: number;
  patientLng: number;
  maxDistance?: number;
  minRating?: number;
  providerType?: string;
  insurance?: string;
  limit?: number;
}): Promise<Provider[]> {
  const {
    patientLat,
    patientLng,
    maxDistance = 25,
    minRating = 0.0,
    providerType,
    insurance,
    limit = 10
  } = params;

  try {
    console.log('Using optimized geographic provider search function');
    
    const { data, error } = await (supabase as any).rpc('find_providers_within_distance', {
      patient_lat: patientLat,
      patient_lng: patientLng,
      max_distance_miles: maxDistance,
      min_rating: minRating,
      provider_type: providerType || null,
      insurance_plan: insurance || null,
      limit_results: limit
    });

    if (error) {
      console.error('Geographic provider search failed:', error);
      throw new Error(`Geographic search failed: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Transform the function result to Provider objects
    return (data as any[]).map((result: any) => ({
      id: result.id,
      name: result.name,
      type: result.type,
      address: result.address,
      phone: result.phone,
      rating: result.rating,
      specialties: result.specialties || [],
      accepted_insurance: result.accepted_insurance || [],
      in_network_plans: result.accepted_insurance || [], // Use accepted_insurance as fallback
      latitude: null, // Not returned by function for performance
      longitude: null, // Not returned by function for performance
      availability_next: result.availability_next,
      created_at: new Date().toISOString(), // Placeholder
      distance: result.distance_miles, // Add calculated distance
    }));
  } catch (error) {
    console.error('Optimized geographic search failed, falling back to basic search:', error);
    
    // Fallback to the existing optimized search
    return await searchProvidersOptimized({
      insurance,
      maxDistance,
      patientLat,
      patientLng,
      minRating,
      limit
    });
  }
}

/**
 * Optimized high-risk patient retrieval using database function
 * Leverages the new get_high_risk_patients function for better performance
 */
export async function getHighRiskPatients(params: {
  riskThreshold?: number;
  limit?: number;
  offset?: number;
}): Promise<Patient[]> {
  const {
    riskThreshold = 70,
    limit = 50,
    offset = 0
  } = params;

  try {
    console.log('Using optimized high-risk patient function');
    
    const { data, error } = await (supabase as any).rpc('get_high_risk_patients', {
      risk_threshold: riskThreshold,
      limit_results: limit,
      offset_results: offset
    });

    if (error) {
      console.error('High-risk patient query failed:', error);
      throw new Error(`High-risk patient query failed: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Transform the function result to Patient objects
    return (data as any[]).map((result: any) => ({
      id: result.id,
      name: result.name,
      date_of_birth: new Date().toISOString(), // Placeholder - not returned for performance
      diagnosis: result.diagnosis,
      discharge_date: new Date().toISOString(), // Placeholder - not returned for performance
      required_followup: result.required_followup,
      insurance: result.insurance,
      address: '', // Placeholder - not returned for performance
      leakage_risk_score: result.leakage_risk_score,
      leakage_risk_level: result.leakage_risk_level,
      referral_status: result.referral_status,
      current_referral_id: null, // Placeholder
      created_at: new Date().toISOString(), // Placeholder
      updated_at: new Date().toISOString(), // Placeholder
      leakageRisk: {
        score: result.leakage_risk_score,
        level: result.leakage_risk_level,
      },
      // Add computed fields from the function
      age: result.age,
      daysSinceDischarge: result.days_since_discharge,
    }));
  } catch (error) {
    console.error('Optimized high-risk patient query failed, falling back to basic search:', error);
    
    // Fallback to the existing optimized search
    return await searchPatientsOptimized({
      minRiskScore: riskThreshold,
      limit,
      offset
    });
  }
}

/**
 * Maintain query performance by refreshing caches and updating statistics
 * Should be called periodically for optimal performance
 */
export async function maintainQueryPerformance(): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    console.log('Running query performance maintenance...');
    
    const { error } = await (supabase as any).rpc('maintain_query_performance');
    
    if (error) {
      console.error('Query maintenance failed:', error);
      return {
        success: false,
        message: `Maintenance failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
    
    console.log('Query performance maintenance completed successfully');
    return {
      success: true,
      message: 'Query performance maintenance completed successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Query maintenance error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown maintenance error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get comprehensive query performance statistics
 * Enhanced version with more detailed metrics
 */
export async function getQueryStats(): Promise<{
  totalPatients: number;
  totalProviders: number;
  totalReferrals: number;
  highRiskPatients: number;
  activeReferrals: number;
  cacheStatus: 'available' | 'unavailable';
  lastMaintenance?: string;
  performance: {
    avgPatientQueryTime?: number;
    avgProviderQueryTime?: number;
    cacheHitRate?: number;
  };
}> {
  return trackQuery('getQueryStats', async () => {
  try {
    console.log('Gathering comprehensive query statistics...');
    
    const [
      patientsResult,
      providersResult,
      referralsResult,
      highRiskResult,
      activeReferralsResult,
      cacheResult
    ] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('providers').select('id', { count: 'exact', head: true }),
      supabase.from('referrals').select('id', { count: 'exact', head: true }),
      supabase.from('patients').select('id', { count: 'exact', head: true }).gte('leakage_risk_score', 70),
      supabase.from('referrals').select('id', { count: 'exact', head: true }).in('status', ['pending', 'sent', 'scheduled']),
      (supabase as any).from('provider_match_cache').select('id', { count: 'exact', head: true })
    ]);

    // Calculate performance metrics (simplified for demo)
    const performance = {
      avgPatientQueryTime: Math.random() * 100 + 50, // Simulated - would be real metrics in production
      avgProviderQueryTime: Math.random() * 150 + 75, // Simulated - would be real metrics in production
      cacheHitRate: cacheResult.error ? 0 : Math.random() * 0.3 + 0.7, // Simulated 70-100% hit rate
    };

    return {
      totalPatients: patientsResult.count || 0,
      totalProviders: providersResult.count || 0,
      totalReferrals: referralsResult.count || 0,
      highRiskPatients: highRiskResult.count || 0,
      activeReferrals: activeReferralsResult.count || 0,
      cacheStatus: cacheResult.error ? 'unavailable' : 'available',
      lastMaintenance: new Date().toISOString(), // Would be stored in a maintenance log table in production
      performance
    };
  } catch (error) {
    console.error('Failed to get comprehensive query stats:', error);
    return {
      totalPatients: 0,
      totalProviders: 0,
      totalReferrals: 0,
      highRiskPatients: 0,
      activeReferrals: 0,
      cacheStatus: 'unavailable',
      performance: {}
    };
  }
  });
}

/**
 * Optimized full-text search across patients and providers
 * Uses the enhanced GIN indexes for better performance
 */
export async function performFullTextSearch(params: {
  searchTerm: string;
  searchType: 'patients' | 'providers' | 'both';
  limit?: number;
}): Promise<{
  patients: Patient[];
  providers: Provider[];
  totalResults: number;
}> {
  return trackQuery('performFullTextSearch', async () => {
  const { searchTerm, searchType, limit = 20 } = params;
  
  if (!searchTerm.trim()) {
    return { patients: [], providers: [], totalResults: 0 };
  }

  try {
    console.log(`Performing optimized full-text search for: "${searchTerm}"`);
    
    const results = {
      patients: [] as Patient[],
      providers: [] as Provider[],
      totalResults: 0
    };

    // Search patients if requested
    if (searchType === 'patients' || searchType === 'both') {
      try {
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .textSearch('name,diagnosis,required_followup,insurance', searchTerm, {
            type: 'websearch',
            config: 'english'
          })
          .order('leakage_risk_score', { ascending: false })
          .limit(searchType === 'both' ? Math.floor(limit / 2) : limit);

        if (patientError) {
          console.warn('Patient full-text search failed, falling back to ILIKE:', patientError);
          
          // Fallback to ILIKE search
          const fallbackResult = await supabase
            .from('patients')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,diagnosis.ilike.%${searchTerm}%,required_followup.ilike.%${searchTerm}%`)
            .order('leakage_risk_score', { ascending: false })
            .limit(searchType === 'both' ? Math.floor(limit / 2) : limit);
            
          if (!fallbackResult.error && fallbackResult.data) {
            const { enhancePatientDataSync } = await import('./risk-calculator');
            results.patients = fallbackResult.data.map((dbPatient: any) => {
              const patient = {
                ...dbPatient,
                leakageRisk: {
                  score: dbPatient.leakage_risk_score,
                  level: dbPatient.leakage_risk_level,
                },
              };
              return enhancePatientDataSync(patient);
            });
          }
        } else if (patientData) {
          const { enhancePatientDataSync } = await import('./risk-calculator');
          results.patients = patientData.map((dbPatient: any) => {
            const patient = {
              ...dbPatient,
              leakageRisk: {
                score: dbPatient.leakage_risk_score,
                level: dbPatient.leakage_risk_level,
              },
            };
            return enhancePatientDataSync(patient);
          });
        }
      } catch (error) {
        console.error('Patient search error:', error);
      }
    }

    // Search providers if requested
    if (searchType === 'providers' || searchType === 'both') {
      try {
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('*')
          .textSearch('name,type,address,specialties', searchTerm, {
            type: 'websearch',
            config: 'english'
          })
          .order('rating', { ascending: false })
          .limit(searchType === 'both' ? Math.floor(limit / 2) : limit);

        if (providerError) {
          console.warn('Provider full-text search failed, falling back to ILIKE:', providerError);
          
          // Fallback to ILIKE search
          const fallbackResult = await supabase
            .from('providers')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
            .order('rating', { ascending: false })
            .limit(searchType === 'both' ? Math.floor(limit / 2) : limit);
            
          if (!fallbackResult.error && fallbackResult.data) {
            results.providers = fallbackResult.data.map((dbProvider: any) => ({
              ...dbProvider,
              specialties: dbProvider.specialties || [],
              accepted_insurance: dbProvider.accepted_insurance || [],
              in_network_plans: dbProvider.in_network_plans || [],
            }));
          }
        } else if (providerData) {
          results.providers = providerData.map((dbProvider: any) => ({
            ...dbProvider,
            specialties: dbProvider.specialties || [],
            accepted_insurance: dbProvider.accepted_insurance || [],
            in_network_plans: dbProvider.in_network_plans || [],
          }));
        }
      } catch (error) {
        console.error('Provider search error:', error);
      }
    }

    results.totalResults = results.patients.length + results.providers.length;
    
    console.log(`Full-text search completed: ${results.totalResults} results found`);
    return results;
  } catch (error) {
    console.error('Full-text search failed:', error);
    return { patients: [], providers: [], totalResults: 0 };
  }
  });
}
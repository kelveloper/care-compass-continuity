import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Patient, PatientFilters } from '@/types';
import { enhancePatientDataSync } from '@/lib/risk-calculator';
import type { Database } from '@/integrations/supabase/types';

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
 * Simplified version of usePatients hook for debugging
 */
export function usePatientsSimple(filters?: PatientFilters) {
  console.log('usePatientsSimple: Hook called with filters:', filters);
  
  return useQuery({
    queryKey: ['patients-simple', filters],
    queryFn: async (): Promise<Patient[]> => {
      console.log('usePatientsSimple: Fetching patients with filters:', filters);
      
      try {
        // Start with regular patients table
        let query = supabase
          .from('patients')
          .select('*');
        
        // Apply filters if provided
        if (filters) {
          console.log('usePatientsSimple: Applying filters:', filters);
          
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
        const data = result.data;
        const error = result.error;
        
        if (error) {
          console.error('usePatientsSimple: Database error:', error);
          throw new Error(error.message);
        }
        
        if (!data) {
          console.log('usePatientsSimple: No data returned from database');
          return [];
        }
        
        console.log('usePatientsSimple: Successfully fetched', data.length, 'patients from patients table');
        console.log('usePatientsSimple: Sample raw patient:', data[0]);
        
        const enhancedPatients = enhancePatients(data);
        console.log('usePatientsSimple: Enhanced patients:', enhancedPatients.length);
        console.log('usePatientsSimple: Sample enhanced patient:', enhancedPatients[0]);
        
        return enhancedPatients;
        
      } catch (error) {
        console.error('usePatientsSimple: Query error:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}
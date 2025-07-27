import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Patient, PatientUpdate } from '@/types';
import { enhancePatientData } from '@/lib/risk-calculator';
import type { PatientUpdate as DbPatientUpdate } from '@/integrations/supabase/types';
import { useToast } from './use-toast';

/**
 * Custom hook for updating patient information
 * Provides mutation function and status indicators with toast notifications
 */
export function usePatientUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      patientId, 
      updates 
    }: { 
      patientId: string; 
      updates: PatientUpdate 
    }): Promise<Patient> => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }

      // Convert frontend PatientUpdate to database PatientUpdate
      const dbUpdates: DbPatientUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('patients')
        .update(dbUpdates)
        .eq('id', patientId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update patient: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned after update');
      }

      // Transform database patient to enhanced Patient object with risk calculations
      const patient: Patient = {
        ...data,
        leakageRisk: {
          score: data.leakage_risk_score,
          level: data.leakage_risk_level,
        },
      };

      // Enhance with computed fields (age, days since discharge, detailed risk factors)
      return enhancePatientData(patient);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch queries related to this patient
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      
      // Show success toast notification
      toast({
        title: 'Patient Updated Successfully',
        description: 'Patient information has been saved and updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating patient:', error);
      
      // Show error toast notification
      toast({
        title: 'Failed to Update Patient',
        description: error.message || 'There was an error updating the patient information. Please try again.',
        variant: 'destructive',
      });
    }
  });
}

/**
 * Hook return type for better TypeScript support
 */
export interface UsePatientUpdateReturn {
  /** Function to update patient information */
  updatePatient: (params: { patientId: string; updates: PatientUpdate }) => Promise<Patient>;
  /** True when update is in progress */
  isUpdating: boolean;
  /** Error state - contains error message if update failed */
  error: Error | null;
  /** Reset the mutation state */
  reset: () => void;
  /** True if the update was successful */
  isSuccess: boolean;
  /** The updated patient data if successful */
  data: Patient | null;
}

/**
 * Typed version of usePatientUpdate hook with explicit return type
 */
export function usePatientUpdateTyped(): UsePatientUpdateReturn {
  const mutation = usePatientUpdate();
  
  return {
    updatePatient: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    isSuccess: mutation.isSuccess,
    data: mutation.data || null,
  };
}
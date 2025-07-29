import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Patient, PatientUpdate } from '@/types';
import { enhancePatientData } from '@/lib/risk-calculator';
import type { PatientUpdate as DbPatientUpdate } from '@/integrations/supabase/types';
import { useToast } from './use-toast';
import { handleApiCallWithRetry, handleSupabaseError } from '@/lib/api-error-handler';
import { useNetworkStatus } from './use-network-status';

/**
 * Custom hook for updating patient information
 * Provides mutation function and status indicators with toast notifications
 * Enhanced with retry mechanisms for failed requests
 */
export function usePatientUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const networkStatus = useNetworkStatus();
  
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

      // Use network-aware API call with retry logic
      const result = await handleApiCallWithRetry(
        async () => {
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
            throw handleSupabaseError(error);
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
        {
          context: 'updatePatient',
          maxRetries: networkStatus.getNetworkQuality() === 'poor' ? 1 : 3,
          retryDelay: networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000,
          networkAware: true,
          onRetry: (attempt, error) => {
            console.log(`usePatientUpdate: Retry attempt ${attempt} for patient ${patientId} after error:`, error.message);
            toast({
              title: 'Retrying Update...',
              description: `Attempt ${attempt} to save patient changes.`,
            });
          }
        }
      );

      if (result.error) {
        throw result.error;
      }

      return result.data!;
    },
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
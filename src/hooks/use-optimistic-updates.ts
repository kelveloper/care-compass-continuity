import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { Patient, Provider, ReferralStatus } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Referral, ReferralInsert, ReferralUpdate } from '@/integrations/supabase/types';
import { handleApiCallWithRetry, handleSupabaseError } from '@/lib/api-error-handler';
import { useNetworkStatus } from './use-network-status';

/**
 * Comprehensive optimistic updates hook for better UX
 * Provides immediate UI feedback for all major user interactions
 * Enhanced with retry mechanisms for failed requests
 */
export function useOptimisticUpdates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const networkStatus = useNetworkStatus();

  /**
   * Optimistic patient list updates
   * Updates the patient list immediately when referral status changes
   */
  const updatePatientInList = (patientId: string, updates: Partial<Patient>) => {
    queryClient.setQueryData(['patients'], (old: Patient[] | undefined) => {
      if (!old) return old;
      return old.map(patient => 
        patient.id === patientId 
          ? { ...patient, ...updates }
          : patient
      );
    });
  };

  /**
   * Optimistic patient detail updates
   * Updates individual patient data immediately
   */
  const updatePatientDetail = (patientId: string, updates: Partial<Patient>) => {
    queryClient.setQueryData(['patient', patientId], (old: Patient | undefined) => {
      if (!old) return old;
      return { ...old, ...updates };
    });
  };

  /**
   * Optimistic referral creation with immediate UI feedback and retry mechanisms
   */
  const createReferralOptimistic = useMutation({
    mutationFn: async ({ 
      patientId, 
      providerId, 
      serviceType 
    }: { 
      patientId: string; 
      providerId: string; 
      serviceType: string; 
    }): Promise<Referral> => {
      // Use network-aware API call with retry logic
      const result = await handleApiCallWithRetry(
        async () => {
          const newReferral: ReferralInsert = {
            patient_id: patientId,
            provider_id: providerId,
            service_type: serviceType,
            status: 'sent', // Set to 'sent' immediately when created
          };

          const { data, error } = await supabase
            .from('referrals')
            .insert(newReferral)
            .select()
            .single();

          if (error) {
            throw handleSupabaseError(error);
          }

          if (!data) {
            throw new Error('No data returned after creating referral');
          }

          // Update patient status
          const { error: updateError } = await supabase
            .from('patients')
            .update({
              referral_status: 'sent',
              current_referral_id: data.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', patientId);

          if (updateError) {
            console.warn('Failed to update patient status after referral creation:', updateError);
            // Don't throw here as the referral was created successfully
          }

          return data;
        },
        {
          context: 'createReferral',
          maxRetries: networkStatus.getNetworkQuality() === 'poor' ? 1 : 3,
          retryDelay: networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000,
          networkAware: true,
          onRetry: (attempt, error) => {
            console.log(`createReferralOptimistic: Retry attempt ${attempt} for patient ${patientId} after error:`, error.message);
            toast({
              title: 'Retrying Referral Creation...',
              description: `Attempt ${attempt} to create referral.`,
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
            errorMessage.includes('forbidden') ||
            errorMessage.includes('unique violation')) {
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
    onMutate: async ({ patientId, providerId, serviceType }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      await queryClient.cancelQueries({ queryKey: ['patient', patientId] });

      // Snapshot previous values
      const previousPatients = queryClient.getQueryData(['patients']);
      const previousPatient = queryClient.getQueryData(['patient', patientId]);

      // Optimistically update patient status
      const optimisticUpdates = {
        referral_status: 'sent' as const,
        current_referral_id: 'temp-creating',
      };

      updatePatientInList(patientId, optimisticUpdates);
      updatePatientDetail(patientId, optimisticUpdates);

      // Show immediate feedback
      toast({
        title: 'Creating Referral...',
        description: 'Your referral is being processed.',
      });

      return { previousPatients, previousPatient, patientId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }
      if (context?.previousPatient) {
        queryClient.setQueryData(['patient', context.patientId], context.previousPatient);
      }

      toast({
        title: 'Failed to Create Referral',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Update with real data
      const realUpdates = {
        referral_status: 'sent' as const,
        current_referral_id: data.id,
      };

      updatePatientInList(variables.patientId, realUpdates);
      updatePatientDetail(variables.patientId, realUpdates);

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });

      toast({
        title: 'Referral Created Successfully',
        description: 'The referral has been sent to the provider.',
      });
    },
  });

  /**
   * Optimistic referral status updates with retry mechanisms
   */
  const updateReferralStatusOptimistic = useMutation({
    mutationFn: async ({ 
      referralId, 
      status, 
      notes,
      patientId 
    }: { 
      referralId: string; 
      status: Referral['status']; 
      notes?: string;
      patientId: string;
    }): Promise<Referral> => {
      // Use network-aware API call with retry logic
      const result = await handleApiCallWithRetry(
        async () => {
          const update: ReferralUpdate = {
            status,
            updated_at: new Date().toISOString(),
          };

          if (notes) {
            update.notes = notes;
          }

          if (status === 'completed') {
            update.completed_date = new Date().toISOString();
          }

          const { data, error } = await supabase
            .from('referrals')
            .update(update)
            .eq('id', referralId)
            .select()
            .single();

          if (error) {
            throw handleSupabaseError(error);
          }

          if (!data) {
            throw new Error('No data returned after updating referral');
          }

          // Update patient status
          const patientStatus = mapReferralStatusToPatientStatus(status);
          const { error: updateError } = await supabase
            .from('patients')
            .update({
              referral_status: patientStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', patientId);

          if (updateError) {
            console.warn('Failed to update patient status after referral update:', updateError);
            // Don't throw here as the referral was updated successfully
          }

          return data;
        },
        {
          context: 'updateReferralStatus',
          maxRetries: networkStatus.getNetworkQuality() === 'poor' ? 1 : 3,
          retryDelay: networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000,
          networkAware: true,
          onRetry: (attempt, error) => {
            console.log(`updateReferralStatusOptimistic: Retry attempt ${attempt} for referral ${referralId} after error:`, error.message);
            toast({
              title: 'Retrying Status Update...',
              description: `Attempt ${attempt} to update referral status.`,
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
    onMutate: async ({ referralId, status, notes, patientId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      await queryClient.cancelQueries({ queryKey: ['patient', patientId] });

      // Snapshot previous values
      const previousPatients = queryClient.getQueryData(['patients']);
      const previousPatient = queryClient.getQueryData(['patient', patientId]);

      // Map referral status to patient status
      const patientStatus = mapReferralStatusToPatientStatus(status);

      // Optimistically update patient status
      const optimisticUpdates = {
        referral_status: patientStatus,
      };

      updatePatientInList(patientId, optimisticUpdates);
      updatePatientDetail(patientId, optimisticUpdates);

      // Show immediate feedback
      const statusMessages = {
        pending: 'Processing referral...',
        sent: 'Sending referral...',
        scheduled: 'Scheduling appointment...',
        completed: 'Completing referral...',
        cancelled: 'Cancelling referral...',
      };

      toast({
        title: statusMessages[status] || 'Updating referral...',
        description: 'Your changes are being saved.',
      });

      return { previousPatients, previousPatient, patientId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }
      if (context?.previousPatient) {
        queryClient.setQueryData(['patient', context.patientId], context.previousPatient);
      }

      toast({
        title: 'Failed to Update Referral',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Update with real data
      const patientStatus = mapReferralStatusToPatientStatus(variables.status);
      const realUpdates = {
        referral_status: patientStatus,
      };

      updatePatientInList(variables.patientId, realUpdates);
      updatePatientDetail(variables.patientId, realUpdates);

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });

      const successMessages = {
        pending: 'Referral is now pending',
        sent: 'Referral sent successfully',
        scheduled: 'Appointment scheduled successfully',
        completed: 'Referral completed successfully',
        cancelled: 'Referral cancelled successfully',
      };

      toast({
        title: successMessages[variables.status] || 'Referral updated',
        description: 'Changes have been saved.',
      });
    },
  });

  /**
   * Optimistic patient information updates with retry mechanisms
   */
  const updatePatientInfoOptimistic = useMutation({
    mutationFn: async ({ 
      patientId, 
      updates 
    }: { 
      patientId: string; 
      updates: Partial<Patient>; 
    }): Promise<Patient> => {
      // Use network-aware API call with retry logic
      const result = await handleApiCallWithRetry(
        async () => {
          const { data, error } = await supabase
            .from('patients')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', patientId)
            .select()
            .single();

          if (error) {
            throw handleSupabaseError(error);
          }

          if (!data) {
            throw new Error('No data returned after updating patient');
          }

          return data as Patient;
        },
        {
          context: 'updatePatientInfo',
          maxRetries: networkStatus.getNetworkQuality() === 'poor' ? 1 : 3,
          retryDelay: networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000,
          networkAware: true,
          onRetry: (attempt, error) => {
            console.log(`updatePatientInfoOptimistic: Retry attempt ${attempt} for patient ${patientId} after error:`, error.message);
            toast({
              title: 'Retrying Patient Update...',
              description: `Attempt ${attempt} to save patient information.`,
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
    onMutate: async ({ patientId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      await queryClient.cancelQueries({ queryKey: ['patient', patientId] });

      // Snapshot previous values
      const previousPatients = queryClient.getQueryData(['patients']);
      const previousPatient = queryClient.getQueryData(['patient', patientId]);

      // Optimistically update patient data
      updatePatientInList(patientId, updates);
      updatePatientDetail(patientId, updates);

      // Show immediate feedback
      toast({
        title: 'Updating Patient Information...',
        description: 'Your changes are being saved.',
      });

      return { previousPatients, previousPatient, patientId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }
      if (context?.previousPatient) {
        queryClient.setQueryData(['patient', context.patientId], context.previousPatient);
      }

      toast({
        title: 'Failed to Update Patient',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Update with real data
      updatePatientInList(variables.patientId, data);
      updatePatientDetail(variables.patientId, data);

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });

      toast({
        title: 'Patient Updated Successfully',
        description: 'Patient information has been saved.',
      });
    },
  });

  /**
   * Optimistic provider selection with immediate UI feedback
   */
  const selectProviderOptimistic = (
    patientId: string, 
    provider: Provider,
    onSuccess?: (provider: Provider) => void
  ) => {
    // Show immediate feedback
    toast({
      title: 'Provider Selected',
      description: `${provider.name} has been selected for referral.`,
    });

    // Call success callback immediately for UI updates
    if (onSuccess) {
      onSuccess(provider);
    }

    // Update any relevant cache data
    queryClient.setQueryData(['selected-provider', patientId], provider);
  };

  /**
   * Helper function to map referral status to patient status
   */
  const mapReferralStatusToPatientStatus = (
    referralStatus: Referral['status']
  ): Patient['referral_status'] => {
    switch (referralStatus) {
      case 'pending':
        return 'sent'; // When referral is created (pending), patient shows as "sent"
      case 'sent':
        return 'sent';
      case 'scheduled':
        return 'scheduled';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'needed'; // When cancelled, patient needs a new referral
      default:
        return 'needed';
    }
  };

  return {
    // Mutation functions
    createReferral: createReferralOptimistic.mutateAsync,
    updateReferralStatus: updateReferralStatusOptimistic.mutateAsync,
    updatePatientInfo: updatePatientInfoOptimistic.mutateAsync,
    selectProvider: selectProviderOptimistic,

    // Loading states
    isCreatingReferral: createReferralOptimistic.isPending,
    isUpdatingReferral: updateReferralStatusOptimistic.isPending,
    isUpdatingPatient: updatePatientInfoOptimistic.isPending,

    // Error states
    createReferralError: createReferralOptimistic.error,
    updateReferralError: updateReferralStatusOptimistic.error,
    updatePatientError: updatePatientInfoOptimistic.error,

    // Reset functions
    resetCreateReferral: createReferralOptimistic.reset,
    resetUpdateReferral: updateReferralStatusOptimistic.reset,
    resetUpdatePatient: updatePatientInfoOptimistic.reset,
  };
}

/**
 * Hook for optimistic list operations (search, filter, sort)
 * Provides immediate feedback for list interactions
 */
export function useOptimisticListUpdates() {
  const queryClient = useQueryClient();

  /**
   * Optimistic search with immediate results
   */
  const searchOptimistic = (query: string) => {
    // Get current patients data
    const patients = queryClient.getQueryData(['patients']) as Patient[] | undefined;
    
    if (!patients || !query.trim()) {
      return patients || [];
    }

    // Perform client-side filtering for immediate feedback
    const filtered = patients.filter(patient => 
      patient.name.toLowerCase().includes(query.toLowerCase()) ||
      patient.diagnosis.toLowerCase().includes(query.toLowerCase()) ||
      patient.required_followup.toLowerCase().includes(query.toLowerCase())
    );

    return filtered;
  };

  /**
   * Optimistic sorting with immediate reorder
   */
  const sortOptimistic = (patients: Patient[], sortBy: 'risk' | 'name' | 'date') => {
    const sorted = [...patients];

    switch (sortBy) {
      case 'risk':
        return sorted.sort((a, b) => b.leakageRisk.score - a.leakageRisk.score);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
        return sorted.sort((a, b) => 
          new Date(b.discharge_date).getTime() - new Date(a.discharge_date).getTime()
        );
      default:
        return sorted;
    }
  };

  /**
   * Optimistic filtering with immediate results
   */
  const filterOptimistic = (
    patients: Patient[], 
    filters: {
      riskLevel?: 'low' | 'medium' | 'high';
      status?: 'needed' | 'sent' | 'scheduled' | 'completed';
    }
  ) => {
    let filtered = [...patients];

    if (filters.riskLevel) {
      filtered = filtered.filter(patient => 
        patient.leakageRisk.level === filters.riskLevel
      );
    }

    if (filters.status) {
      filtered = filtered.filter(patient => 
        patient.referral_status === filters.status
      );
    }

    return filtered;
  };

  return {
    searchOptimistic,
    sortOptimistic,
    filterOptimistic,
  };
}
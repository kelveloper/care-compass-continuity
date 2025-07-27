import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Referral, ReferralHistory, ReferralInsert, ReferralUpdate } from '@/integrations/supabase/types';
import { Patient, Provider } from '@/types';
import { useToast } from './use-toast';
import { useOptimisticUpdates } from './use-optimistic-updates';

export interface UseReferralsOptimisticReturn {
  /** Create a new referral with optimistic updates */
  createReferral: (patientId: string, providerId: string, serviceType: string) => Promise<Referral | null>;
  /** Update referral status with optimistic updates */
  updateReferralStatus: (referralId: string, status: Referral['status'], notes?: string) => Promise<boolean>;
  /** Schedule a referral with optimistic updates */
  scheduleReferral: (referralId: string, scheduledDate: string, notes?: string) => Promise<boolean>;
  /** Complete a referral with optimistic updates */
  completeReferral: (referralId: string, notes?: string) => Promise<boolean>;
  /** Cancel a referral with optimistic updates */
  cancelReferral: (referralId: string, notes?: string) => Promise<boolean>;
  /** Loading states for each operation */
  isCreating: boolean;
  isUpdating: boolean;
  isScheduling: boolean;
  isCompleting: boolean;
  isCancelling: boolean;
}

/**
 * Hook for managing patient referrals with optimistic updates
 * Provides immediate UI feedback while operations are in progress
 */
export function useReferralsOptimistic(): UseReferralsOptimisticReturn {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create referral mutation with optimistic updates
  const createReferralMutation = useMutation({
    mutationFn: async ({ patientId, providerId, serviceType }: { 
      patientId: string; 
      providerId: string; 
      serviceType: string; 
    }): Promise<Referral> => {
      // Create the referral
      const newReferral: ReferralInsert = {
        patient_id: patientId,
        provider_id: providerId,
        service_type: serviceType,
        status: 'sent', // Set to 'sent' immediately when created
      };

      const { data, error: insertError } = await supabase
        .from('referrals')
        .insert(newReferral)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create referral: ${insertError.message}`);
      }

      if (!data) {
        throw new Error('No data returned after creating referral');
      }

      // Update the patient's referral status and current_referral_id
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          referral_status: 'sent',
          current_referral_id: data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', patientId);

      if (updateError) {
        console.error('Failed to update patient status:', updateError);
        // Continue anyway since the referral was created
      }

      return data;
    },
    onMutate: async ({ patientId, providerId, serviceType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patient', patientId] });
      await queryClient.cancelQueries({ queryKey: ['patients'] });

      // Snapshot the previous values
      const previousPatient = queryClient.getQueryData(['patient', patientId]);
      const previousPatients = queryClient.getQueryData(['patients']);

      // Optimistically update patient data
      queryClient.setQueryData(['patient', patientId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          referral_status: 'sent',
          current_referral_id: 'temp-id', // Temporary ID
        };
      });

      // Optimistically update patients list
      queryClient.setQueryData(['patients'], (old: any) => {
        if (!old) return old;
        return old.map((patient: any) => 
          patient.id === patientId 
            ? { ...patient, referral_status: 'sent', current_referral_id: 'temp-id' }
            : patient
        );
      });

      return { previousPatient, previousPatients };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatient) {
        queryClient.setQueryData(['patient', variables.patientId], context.previousPatient);
      }
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }

      toast({
        title: 'Error Creating Referral',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Update with real data
      queryClient.setQueryData(['patient', variables.patientId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          referral_status: 'sent',
          current_referral_id: data.id,
        };
      });

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: 'Referral Created',
        description: 'The referral has been successfully created.',
      });
    },
  });

  // Update referral status mutation with optimistic updates
  const updateStatusMutation = useMutation({
    mutationFn: async ({ referralId, status, notes }: { 
      referralId: string; 
      status: Referral['status']; 
      notes?: string; 
    }): Promise<{ referral: Referral; patientId: string }> => {
      // Get the current referral to check if status is actually changing
      const { data: currentReferral, error: fetchError } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch referral: ${fetchError.message}`);
      }

      if (!currentReferral) {
        throw new Error('Referral not found');
      }

      // Only update if status is actually changing
      if (currentReferral.status !== status) {
        const update: ReferralUpdate = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (notes) {
          update.notes = notes;
        }

        const { data, error: updateError } = await supabase
          .from('referrals')
          .update(update)
          .eq('id', referralId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update referral: ${updateError.message}`);
        }

        if (!data) {
          throw new Error('No data returned after updating referral');
        }

        // Update the patient's referral status based on the referral status
        const patientStatus = mapReferralStatusToPatientStatus(status);
        
        const { error: patientUpdateError } = await supabase
          .from('patients')
          .update({
            referral_status: patientStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.patient_id);

        if (patientUpdateError) {
          console.error('Failed to update patient status:', patientUpdateError);
          // Continue anyway since the referral was updated
        }

        // Add a manual history entry with the notes
        if (notes) {
          await supabase
            .from('referral_history')
            .insert({
              referral_id: referralId,
              status,
              notes,
              created_by: 'Care Coordinator',
            });
        }

        return { referral: data, patientId: data.patient_id };
      }
      
      return { referral: currentReferral, patientId: currentReferral.patient_id };
    },
    onMutate: async ({ referralId, status, notes }) => {
      // Find the patient ID from existing queries
      const patients = queryClient.getQueryData(['patients']) as any[];
      const patientId = patients?.find(p => p.current_referral_id === referralId)?.id;

      if (!patientId) return {};

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patient', patientId] });
      await queryClient.cancelQueries({ queryKey: ['patients'] });

      // Snapshot the previous values
      const previousPatient = queryClient.getQueryData(['patient', patientId]);
      const previousPatients = queryClient.getQueryData(['patients']);

      const patientStatus = mapReferralStatusToPatientStatus(status);

      // Optimistically update patient data
      queryClient.setQueryData(['patient', patientId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          referral_status: patientStatus,
        };
      });

      // Optimistically update patients list
      queryClient.setQueryData(['patients'], (old: any) => {
        if (!old) return old;
        return old.map((patient: any) => 
          patient.id === patientId 
            ? { ...patient, referral_status: patientStatus }
            : patient
        );
      });

      return { previousPatient, previousPatients, patientId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatient && context?.patientId) {
        queryClient.setQueryData(['patient', context.patientId], context.previousPatient);
      }
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }

      toast({
        title: 'Error Updating Referral',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['patient', data.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: 'Referral Updated',
        description: `Referral status changed to ${variables.status}.`,
      });
    },
  });

  // Schedule referral mutation with optimistic updates
  const scheduleReferralMutation = useMutation({
    mutationFn: async ({ referralId, scheduledDate, notes }: { 
      referralId: string; 
      scheduledDate: string; 
      notes?: string; 
    }): Promise<{ referral: Referral; patientId: string }> => {
      const update: ReferralUpdate = {
        status: 'scheduled',
        scheduled_date: scheduledDate,
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        update.notes = notes;
      }

      const { data, error: updateError } = await supabase
        .from('referrals')
        .update(update)
        .eq('id', referralId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to schedule referral: ${updateError.message}`);
      }

      if (!data) {
        throw new Error('No data returned after scheduling referral');
      }

      // Update the patient's referral status
      const { error: patientUpdateError } = await supabase
        .from('patients')
        .update({
          referral_status: 'scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.patient_id);

      if (patientUpdateError) {
        console.error('Failed to update patient status:', patientUpdateError);
      }

      // Add a manual history entry with the scheduled date
      const historyNote = notes || `Appointment scheduled for ${new Date(scheduledDate).toLocaleDateString()}`;
      await supabase
        .from('referral_history')
        .insert({
          referral_id: referralId,
          status: 'scheduled',
          notes: historyNote,
          created_by: 'Care Coordinator',
        });

      return { referral: data, patientId: data.patient_id };
    },
    onMutate: async ({ referralId, scheduledDate, notes }) => {
      // Find the patient ID from existing queries
      const patients = queryClient.getQueryData(['patients']) as any[];
      const patientId = patients?.find(p => p.current_referral_id === referralId)?.id;

      if (!patientId) return {};

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patient', patientId] });
      await queryClient.cancelQueries({ queryKey: ['patients'] });

      // Snapshot the previous values
      const previousPatient = queryClient.getQueryData(['patient', patientId]);
      const previousPatients = queryClient.getQueryData(['patients']);

      // Optimistically update patient data
      queryClient.setQueryData(['patient', patientId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          referral_status: 'scheduled',
        };
      });

      // Optimistically update patients list
      queryClient.setQueryData(['patients'], (old: any) => {
        if (!old) return old;
        return old.map((patient: any) => 
          patient.id === patientId 
            ? { ...patient, referral_status: 'scheduled' }
            : patient
        );
      });

      return { previousPatient, previousPatients, patientId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatient && context?.patientId) {
        queryClient.setQueryData(['patient', context.patientId], context.previousPatient);
      }
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }

      toast({
        title: 'Error Scheduling Referral',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['patient', data.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: 'Appointment Scheduled',
        description: `Appointment scheduled for ${new Date(variables.scheduledDate).toLocaleDateString()}.`,
      });
    },
  });

  // Complete referral mutation with optimistic updates
  const completeReferralMutation = useMutation({
    mutationFn: async ({ referralId, notes }: { 
      referralId: string; 
      notes?: string; 
    }): Promise<{ referral: Referral; patientId: string }> => {
      const update: ReferralUpdate = {
        status: 'completed',
        completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        update.notes = notes;
      }

      const { data, error: updateError } = await supabase
        .from('referrals')
        .update(update)
        .eq('id', referralId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to complete referral: ${updateError.message}`);
      }

      if (!data) {
        throw new Error('No data returned after completing referral');
      }

      // Update the patient's referral status
      const { error: patientUpdateError } = await supabase
        .from('patients')
        .update({
          referral_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.patient_id);

      if (patientUpdateError) {
        console.error('Failed to update patient status:', patientUpdateError);
      }

      // Add a manual history entry
      const historyNote = notes || 'Care completed';
      await supabase
        .from('referral_history')
        .insert({
          referral_id: referralId,
          status: 'completed',
          notes: historyNote,
          created_by: 'Care Coordinator',
        });

      return { referral: data, patientId: data.patient_id };
    },
    onMutate: async ({ referralId, notes }) => {
      // Find the patient ID from existing queries
      const patients = queryClient.getQueryData(['patients']) as any[];
      const patientId = patients?.find(p => p.current_referral_id === referralId)?.id;

      if (!patientId) return {};

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patient', patientId] });
      await queryClient.cancelQueries({ queryKey: ['patients'] });

      // Snapshot the previous values
      const previousPatient = queryClient.getQueryData(['patient', patientId]);
      const previousPatients = queryClient.getQueryData(['patients']);

      // Optimistically update patient data
      queryClient.setQueryData(['patient', patientId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          referral_status: 'completed',
        };
      });

      // Optimistically update patients list
      queryClient.setQueryData(['patients'], (old: any) => {
        if (!old) return old;
        return old.map((patient: any) => 
          patient.id === patientId 
            ? { ...patient, referral_status: 'completed' }
            : patient
        );
      });

      return { previousPatient, previousPatients, patientId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatient && context?.patientId) {
        queryClient.setQueryData(['patient', context.patientId], context.previousPatient);
      }
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }

      toast({
        title: 'Error Completing Referral',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['patient', data.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: 'Referral Completed',
        description: 'The referral has been marked as completed.',
      });
    },
  });

  // Cancel referral mutation with optimistic updates
  const cancelReferralMutation = useMutation({
    mutationFn: async ({ referralId, notes }: { 
      referralId: string; 
      notes?: string; 
    }): Promise<{ referral: Referral; patientId: string }> => {
      const update: ReferralUpdate = {
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        update.notes = notes;
      }

      const { data, error: updateError } = await supabase
        .from('referrals')
        .update(update)
        .eq('id', referralId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to cancel referral: ${updateError.message}`);
      }

      if (!data) {
        throw new Error('No data returned after cancelling referral');
      }

      // Update the patient's referral status back to needed
      const { error: patientUpdateError } = await supabase
        .from('patients')
        .update({
          referral_status: 'needed',
          current_referral_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.patient_id);

      if (patientUpdateError) {
        console.error('Failed to update patient status:', patientUpdateError);
      }

      // Add a manual history entry
      const historyNote = notes || 'Referral cancelled';
      await supabase
        .from('referral_history')
        .insert({
          referral_id: referralId,
          status: 'cancelled',
          notes: historyNote,
          created_by: 'Care Coordinator',
        });

      return { referral: data, patientId: data.patient_id };
    },
    onMutate: async ({ referralId, notes }) => {
      // Find the patient ID from existing queries
      const patients = queryClient.getQueryData(['patients']) as any[];
      const patientId = patients?.find(p => p.current_referral_id === referralId)?.id;

      if (!patientId) return {};

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['patient', patientId] });
      await queryClient.cancelQueries({ queryKey: ['patients'] });

      // Snapshot the previous values
      const previousPatient = queryClient.getQueryData(['patient', patientId]);
      const previousPatients = queryClient.getQueryData(['patients']);

      // Optimistically update patient data
      queryClient.setQueryData(['patient', patientId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          referral_status: 'needed',
          current_referral_id: null,
        };
      });

      // Optimistically update patients list
      queryClient.setQueryData(['patients'], (old: any) => {
        if (!old) return old;
        return old.map((patient: any) => 
          patient.id === patientId 
            ? { ...patient, referral_status: 'needed', current_referral_id: null }
            : patient
        );
      });

      return { previousPatient, previousPatients, patientId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPatient && context?.patientId) {
        queryClient.setQueryData(['patient', context.patientId], context.previousPatient);
      }
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }

      toast({
        title: 'Error Cancelling Referral',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['patient', data.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: 'Referral Cancelled',
        description: 'The referral has been cancelled.',
      });
    },
  });

  /**
   * Map referral status to patient status
   */
  const mapReferralStatusToPatientStatus = (
    referralStatus: Referral['status']
  ): Patient['referral_status'] => {
    switch (referralStatus) {
      case 'pending':
      case 'sent':
        return 'sent';
      case 'scheduled':
        return 'scheduled';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'needed';
      default:
        return 'needed';
    }
  };

  return {
    createReferral: async (patientId: string, providerId: string, serviceType: string) => {
      try {
        const result = await createReferralMutation.mutateAsync({ patientId, providerId, serviceType });
        return result;
      } catch (error) {
        return null;
      }
    },
    updateReferralStatus: async (referralId: string, status: Referral['status'], notes?: string) => {
      try {
        await updateStatusMutation.mutateAsync({ referralId, status, notes });
        return true;
      } catch (error) {
        return false;
      }
    },
    scheduleReferral: async (referralId: string, scheduledDate: string, notes?: string) => {
      try {
        await scheduleReferralMutation.mutateAsync({ referralId, scheduledDate, notes });
        return true;
      } catch (error) {
        return false;
      }
    },
    completeReferral: async (referralId: string, notes?: string) => {
      try {
        await completeReferralMutation.mutateAsync({ referralId, notes });
        return true;
      } catch (error) {
        return false;
      }
    },
    cancelReferral: async (referralId: string, notes?: string) => {
      try {
        await cancelReferralMutation.mutateAsync({ referralId, notes });
        return true;
      } catch (error) {
        return false;
      }
    },
    isCreating: createReferralMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    isScheduling: scheduleReferralMutation.isPending,
    isCompleting: completeReferralMutation.isPending,
    isCancelling: cancelReferralMutation.isPending,
  };
}
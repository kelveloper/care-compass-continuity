import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Referral, ReferralHistory, ReferralInsert, ReferralUpdate } from '@/integrations/supabase/types';
import { Patient, Provider } from '@/types';
import { useToast } from './use-toast';
import { handleApiCallWithRetry, handleSupabaseError } from '@/lib/api-error-handler';
import { useNetworkStatus } from './use-network-status';

export interface UseReferralsReturn {
  /** Current referral data */
  referral: Referral | null;
  /** Referral history entries */
  history: ReferralHistory[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Create a new referral */
  createReferral: (patientId: string, providerId: string, serviceType: string) => Promise<Referral | null>;
  /** Update referral status */
  updateReferralStatus: (referralId: string, status: Referral['status'], notes?: string) => Promise<boolean>;
  /** Schedule a referral */
  scheduleReferral: (referralId: string, scheduledDate: string, notes?: string) => Promise<boolean>;
  /** Complete a referral */
  completeReferral: (referralId: string, notes?: string) => Promise<boolean>;
  /** Cancel a referral */
  cancelReferral: (referralId: string, notes?: string) => Promise<boolean>;
  /** Get referral by ID */
  getReferralById: (referralId: string) => Promise<Referral | null>;
  /** Get referrals for a patient */
  getPatientReferrals: (patientId: string) => Promise<Referral[]>;
  /** Get referral history */
  getReferralHistory: (referralId: string) => Promise<ReferralHistory[]>;
  /** Refresh current referral data */
  refreshReferral: () => Promise<void>;
}

/**
 * Hook for managing patient referrals with retry mechanisms
 */
export function useReferrals(initialReferralId?: string): UseReferralsReturn {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [history, setHistory] = useState<ReferralHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const networkStatus = useNetworkStatus();

  /**
   * Create a new referral with retry mechanisms
   */
  const createReferral = async (
    patientId: string,
    providerId: string,
    serviceType: string
  ): Promise<Referral | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use network-aware API call with retry logic
      const result = await handleApiCallWithRetry(
        async () => {
          // Create the referral
          const newReferral: ReferralInsert = {
            patient_id: patientId,
            provider_id: providerId,
            service_type: serviceType,
            status: 'pending',
          };

          const { data, error: insertError } = await supabase
            .from('referrals')
            .insert(newReferral)
            .select()
            .single();

          if (insertError) {
            throw handleSupabaseError(insertError);
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
        {
          context: 'createReferral',
          maxRetries: networkStatus.getNetworkQuality() === 'poor' ? 1 : 3,
          retryDelay: networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000,
          networkAware: true,
          onRetry: (attempt, error) => {
            console.log(`createReferral: Retry attempt ${attempt} for patient ${patientId} after error:`, error.message);
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

      const data = result.data!;
      setReferral(data);
      toast({
        title: 'Referral Created',
        description: 'The referral has been successfully created.',
      });
      
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error Creating Referral',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update referral status
   */
  const updateReferralStatus = async (
    referralId: string,
    status: Referral['status'],
    notes?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
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

        setReferral(data);
        await refreshReferralHistory(referralId);
        
        toast({
          title: 'Referral Updated',
          description: `Referral status changed to ${status}.`,
        });
        
        return true;
      }
      
      return false;
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error Updating Referral',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Schedule a referral
   */
  const scheduleReferral = async (
    referralId: string,
    scheduledDate: string,
    notes?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
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

      setReferral(data);
      await refreshReferralHistory(referralId);
      
      toast({
        title: 'Appointment Scheduled',
        description: `Appointment scheduled for ${new Date(scheduledDate).toLocaleDateString()}.`,
      });
      
      return true;
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error Scheduling Referral',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete a referral
   */
  const completeReferral = async (
    referralId: string,
    notes?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
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

      setReferral(data);
      await refreshReferralHistory(referralId);
      
      toast({
        title: 'Referral Completed',
        description: 'The referral has been marked as completed.',
      });
      
      return true;
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error Completing Referral',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel a referral
   */
  const cancelReferral = async (
    referralId: string,
    notes?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
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

      setReferral(data);
      await refreshReferralHistory(referralId);
      
      toast({
        title: 'Referral Cancelled',
        description: 'The referral has been cancelled.',
      });
      
      return true;
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error Cancelling Referral',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get referral by ID
   */
  const getReferralById = async (referralId: string): Promise<Referral | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch referral: ${fetchError.message}`);
      }

      if (!data) {
        return null;
      }

      setReferral(data);
      await refreshReferralHistory(referralId);
      
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching referral:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get referrals for a patient
   */
  const getPatientReferrals = async (patientId: string): Promise<Referral[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('referrals')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to fetch patient referrals: ${fetchError.message}`);
      }

      return data || [];
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching patient referrals:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get referral history
   */
  const getReferralHistory = async (referralId: string): Promise<ReferralHistory[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('referral_history')
        .select('*')
        .eq('referral_id', referralId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch referral history: ${fetchError.message}`);
      }

      setHistory(data || []);
      return data || [];
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching referral history:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh current referral data
   */
  const refreshReferral = async (): Promise<void> => {
    if (referral?.id) {
      await getReferralById(referral.id);
    } else if (initialReferralId) {
      await getReferralById(initialReferralId);
    }
  };

  /**
   * Refresh referral history
   */
  const refreshReferralHistory = async (referralId: string): Promise<void> => {
    try {
      const { data } = await supabase
        .from('referral_history')
        .select('*')
        .eq('referral_id', referralId)
        .order('created_at', { ascending: true });

      setHistory(data || []);
    } catch (error) {
      console.error('Error refreshing referral history:', error);
    }
  };

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

  // Initialize with the provided referral ID
  if (initialReferralId && !referral && !isLoading) {
    getReferralById(initialReferralId);
  }

  return {
    referral,
    history,
    isLoading,
    error,
    createReferral,
    updateReferralStatus,
    scheduleReferral,
    completeReferral,
    cancelReferral,
    getReferralById,
    getPatientReferrals,
    getReferralHistory,
    refreshReferral,
  };
}
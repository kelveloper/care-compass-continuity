import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

/**
 * Hook for managing background synchronization and real-time updates
 * Provides automatic cache invalidation and background refetching
 */
export function useBackgroundSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Invalidate all patient-related queries
   */
  const invalidatePatientQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['patients'] });
    queryClient.invalidateQueries({ queryKey: ['patient'] });
  }, [queryClient]);

  /**
   * Invalidate all provider-related queries
   */
  const invalidateProviderQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['providers'] });
    queryClient.invalidateQueries({ queryKey: ['provider'] });
  }, [queryClient]);

  /**
   * Invalidate all referral-related queries
   */
  const invalidateReferralQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['referrals'] });
    queryClient.invalidateQueries({ queryKey: ['referral'] });
  }, [queryClient]);

  /**
   * Force refresh all cached data
   */
  const refreshAllData = useCallback(async () => {
    try {
      await queryClient.invalidateQueries();
      toast({
        title: 'Data Refreshed',
        description: 'All data has been updated with the latest information.',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh data. Please try again.',
        variant: 'destructive',
      });
    }
  }, [queryClient, toast]);

  /**
   * Set up real-time subscriptions for automatic cache invalidation
   */
  useEffect(() => {
    console.log('Setting up real-time subscriptions for background sync');

    // Subscribe to patient changes
    const patientsSubscription = supabase
      .channel('patients-background-sync')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'patients' 
        }, 
        (payload) => {
          console.log('Background sync: Patient change detected:', payload);
          invalidatePatientQueries();
        }
      )
      .subscribe();

    // Subscribe to provider changes
    const providersSubscription = supabase
      .channel('providers-background-sync')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'providers' 
        }, 
        (payload) => {
          console.log('Background sync: Provider change detected:', payload);
          invalidateProviderQueries();
        }
      )
      .subscribe();

    // Subscribe to referral changes
    const referralsSubscription = supabase
      .channel('referrals-background-sync')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'referrals' 
        }, 
        (payload) => {
          console.log('Background sync: Referral change detected:', payload);
          invalidateReferralQueries();
          invalidatePatientQueries(); // Also invalidate patients since referral status affects them
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      console.log('Cleaning up background sync subscriptions');
      patientsSubscription.unsubscribe();
      providersSubscription.unsubscribe();
      referralsSubscription.unsubscribe();
    };
  }, [invalidatePatientQueries, invalidateProviderQueries, invalidateReferralQueries]);

  /**
   * Set up periodic background refresh for critical data
   */
  useEffect(() => {
    // Refresh patient data every 5 minutes in the background
    const patientRefreshInterval = setInterval(() => {
      console.log('Background sync: Periodic patient data refresh');
      queryClient.invalidateQueries({ 
        queryKey: ['patients'],
        refetchType: 'active' // Only refetch if there are active observers
      });
    }, 5 * 60 * 1000); // 5 minutes

    // Refresh provider data every 10 minutes in the background
    const providerRefreshInterval = setInterval(() => {
      console.log('Background sync: Periodic provider data refresh');
      queryClient.invalidateQueries({ 
        queryKey: ['providers'],
        refetchType: 'active'
      });
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup intervals
    return () => {
      clearInterval(patientRefreshInterval);
      clearInterval(providerRefreshInterval);
    };
  }, [queryClient]);

  /**
   * Handle online/offline status changes
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('Background sync: Network reconnected, refreshing data');
      queryClient.invalidateQueries();
      toast({
        title: 'Back Online',
        description: 'Connection restored. Refreshing data...',
      });
    };

    const handleOffline = () => {
      console.log('Background sync: Network disconnected');
      toast({
        title: 'Connection Lost',
        description: 'Working offline. Data may not be up to date.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, toast]);

  return {
    invalidatePatientQueries,
    invalidateProviderQueries,
    invalidateReferralQueries,
    refreshAllData,
    
    // Utility functions
    isOnline: navigator.onLine,
    queryClient,
  };
}

/**
 * Hook for prefetching data to improve user experience
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch patient data
   */
  const prefetchPatients = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['patients'],
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient]);

  /**
   * Prefetch provider data
   */
  const prefetchProviders = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['providers'],
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  }, [queryClient]);

  /**
   * Prefetch specific patient data
   */
  const prefetchPatient = useCallback((patientId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['patient', patientId],
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  return {
    prefetchPatients,
    prefetchProviders,
    prefetchPatient,
  };
}
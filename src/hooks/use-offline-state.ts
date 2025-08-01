import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

export interface OfflineState {
  /** Current offline status */
  isOffline: boolean;
  /** Timestamp when went offline */
  offlineSince?: Date;
  /** Duration offline in milliseconds */
  offlineDuration: number;
  /** Whether the app was previously online and just went offline */
  justWentOffline: boolean;
  /** Whether the app was previously offline and just came online */
  justCameOnline: boolean;
  /** Number of failed connectivity attempts */
  failedConnectivityAttempts: number;
  /** Last successful connectivity check */
  lastSuccessfulCheck?: Date;
  /** Offline data available */
  hasOfflineData: boolean;
}

export interface OfflineStateHook extends OfflineState {
  /** Manually check connectivity */
  checkConnectivity: () => Promise<boolean>;
  /** Clear offline state flags */
  clearTransitionFlags: () => void;
  /** Get offline message for user */
  getOfflineMessage: () => string;
  /** Check if feature is available offline */
  isFeatureAvailableOffline: (feature: string) => boolean;
  /** Get cached data count */
  getCachedDataCount: () => number;
}

/**
 * Enhanced offline state detection and management
 * Provides comprehensive offline state tracking and user experience
 */
export function useOfflineState(): OfflineStateHook {
  const [offlineState, setOfflineState] = useState<OfflineState>(() => {
    const isCurrentlyOffline = !navigator.onLine;
    return {
      isOffline: isCurrentlyOffline,
      offlineSince: isCurrentlyOffline ? new Date() : undefined,
      offlineDuration: 0,
      justWentOffline: false,
      justCameOnline: false,
      failedConnectivityAttempts: 0,
      hasOfflineData: false,
    };
  });

  // Optional React Query integration
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  let toast: ReturnType<typeof useToast>['toast'] | null = null;
  
  try {
    queryClient = useQueryClient();
    const toastHook = useToast();
    toast = toastHook.toast;
  } catch (error) {
    // React Query or toast not available - continue without them
    console.warn('Offline state hook: React Query or toast not available');
  }

  /**
   * Enhanced connectivity check with multiple fallbacks
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    const checks = [
      // Primary check - favicon (lightweight)
      () => fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000),
      }),
      // Secondary check - robots.txt
      () => fetch('/robots.txt', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000),
      }),
      // Tertiary check - DNS resolution
      () => fetch('https://dns.google/resolve?name=google.com&type=A', {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      }),
    ];

    for (const check of checks) {
      try {
        const response = await check();
        if (response.ok) {
          console.log('Offline state: Connectivity confirmed');
          return true;
        }
      } catch (error) {
        console.warn('Offline state: Connectivity check failed:', error);
        continue;
      }
    }

    console.warn('Offline state: All connectivity checks failed');
    return false;
  }, []);

  /**
   * Clear transition flags (justWentOffline, justCameOnline)
   */
  const clearTransitionFlags = useCallback(() => {
    setOfflineState(prev => ({
      ...prev,
      justWentOffline: false,
      justCameOnline: false,
    }));
  }, []);

  /**
   * Get user-friendly offline message
   */
  const getOfflineMessage = useCallback((): string => {
    const { offlineDuration, failedConnectivityAttempts } = offlineState;
    
    if (offlineDuration < 30000) { // Less than 30 seconds
      return 'You appear to be offline. Checking connection...';
    } else if (offlineDuration < 300000) { // Less than 5 minutes
      return 'Working offline. Some features may be limited.';
    } else if (failedConnectivityAttempts > 5) {
      return 'Extended offline period detected. Using cached data.';
    } else {
      return 'Still offline. Tap to retry connection.';
    }
  }, [offlineState]);

  /**
   * Check if a feature is available offline
   */
  const isFeatureAvailableOffline = useCallback((feature: string): boolean => {
    const offlineFeatures = [
      'view-patients', // Can view cached patient data
      'view-patient-details', // Can view cached patient details
      'search-patients', // Can search cached patients
      'view-providers', // Can view cached providers
      'view-referrals', // Can view cached referrals
    ];

    const onlineOnlyFeatures = [
      'create-referral', // Requires server communication
      'update-patient', // Requires server communication
      'send-referral', // Requires server communication
      'provider-matching', // Requires real-time data
    ];

    return offlineFeatures.includes(feature) && !onlineOnlyFeatures.includes(feature);
  }, []);

  /**
   * Get count of cached data items
   */
  const getCachedDataCount = useCallback((): number => {
    if (!queryClient) return 0;
    
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return queries.filter(query => 
      query.state.data && 
      query.state.status === 'success'
    ).length;
  }, [queryClient]);

  /**
   * Update offline duration periodically
   */
  useEffect(() => {
    if (!offlineState.isOffline || !offlineState.offlineSince) return;

    const interval = setInterval(() => {
      setOfflineState(prev => ({
        ...prev,
        offlineDuration: Date.now() - (prev.offlineSince?.getTime() || 0),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [offlineState.isOffline, offlineState.offlineSince]);

  /**
   * Handle browser online/offline events
   */
  useEffect(() => {
    const handleOnline = async () => {
      console.log('Offline state: Browser reports online');
      
      // Verify with actual connectivity check
      const isActuallyOnline = await checkConnectivity();
      
      if (isActuallyOnline) {
        setOfflineState(prev => ({
          ...prev,
          isOffline: false,
          offlineSince: undefined,
          offlineDuration: 0,
          justWentOffline: false,
          justCameOnline: prev.isOffline, // Only set if we were actually offline
          failedConnectivityAttempts: 0,
          lastSuccessfulCheck: new Date(),
        }));

        if (toast) {
          toast({
            title: 'Back Online',
            description: 'Connection restored. Syncing data...',
          });
        }

        // Invalidate queries to refresh data
        if (queryClient) {
          await queryClient.invalidateQueries();
        }
      } else {
        // Browser says online but connectivity check failed
        setOfflineState(prev => ({
          ...prev,
          failedConnectivityAttempts: prev.failedConnectivityAttempts + 1,
        }));
      }
    };

    const handleOffline = () => {
      console.log('Offline state: Browser reports offline');
      
      setOfflineState(prev => ({
        ...prev,
        isOffline: true,
        offlineSince: prev.isOffline ? prev.offlineSince : new Date(),
        justWentOffline: !prev.isOffline, // Only set if we were online
        justCameOnline: false,
        hasOfflineData: getCachedDataCount() > 0,
      }));

      if (toast) {
        toast({
          title: 'Connection Lost',
          description: 'Working offline with cached data.',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectivity, toast, queryClient, getCachedDataCount]);

  /**
   * Periodic connectivity checks when offline
   */
  useEffect(() => {
    if (!offlineState.isOffline) return;

    const interval = setInterval(async () => {
      console.log('Offline state: Performing periodic connectivity check');
      
      const isOnline = await checkConnectivity();
      
      if (isOnline) {
        // We're back online!
        setOfflineState(prev => ({
          ...prev,
          isOffline: false,
          offlineSince: undefined,
          offlineDuration: 0,
          justWentOffline: false,
          justCameOnline: true,
          failedConnectivityAttempts: 0,
          lastSuccessfulCheck: new Date(),
        }));

        if (toast) {
          toast({
            title: 'Connection Restored',
            description: 'Back online! Refreshing data...',
          });
        }

        // Refresh all queries
        if (queryClient) {
          await queryClient.invalidateQueries();
        }
      } else {
        // Still offline
        setOfflineState(prev => ({
          ...prev,
          failedConnectivityAttempts: prev.failedConnectivityAttempts + 1,
        }));
      }
    }, 15000); // Check every 15 seconds when offline

    return () => clearInterval(interval);
  }, [offlineState.isOffline, checkConnectivity, toast, queryClient]);

  /**
   * Update cached data availability
   */
  useEffect(() => {
    if (!queryClient) return;

    const updateCachedDataStatus = () => {
      const cachedCount = getCachedDataCount();
      setOfflineState(prev => {
        // Only update if the value actually changed
        if (prev.hasOfflineData !== (cachedCount > 0)) {
          return {
            ...prev,
            hasOfflineData: cachedCount > 0,
          };
        }
        return prev;
      });
    };

    // Check initially
    updateCachedDataStatus();

    // Listen for query cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe(updateCachedDataStatus);

    return unsubscribe;
  }, [queryClient]); // Remove getCachedDataCount from dependencies to prevent infinite loop

  return {
    ...offlineState,
    checkConnectivity,
    clearTransitionFlags,
    getOfflineMessage,
    isFeatureAvailableOffline,
    getCachedDataCount,
  };
}

/**
 * Hook for offline-aware operations
 */
export function useOfflineAwareOperation() {
  const offlineState = useOfflineState();
  
  // Optional toast integration
  let toast: ReturnType<typeof useToast>['toast'] | null = null;
  
  try {
    const toastHook = useToast();
    toast = toastHook.toast;
  } catch (error) {
    // Toast not available - continue without it
    console.warn('Offline aware operation: Toast not available');
  }

  const executeOfflineAware = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      feature: string;
      fallback?: () => T | Promise<T>;
      showOfflineMessage?: boolean;
      operationName?: string;
    }
  ): Promise<T | null> => {
    const { feature, fallback, showOfflineMessage = true, operationName = 'operation' } = options;

    if (offlineState.isOffline) {
      if (offlineState.isFeatureAvailableOffline(feature)) {
        // Feature is available offline, try fallback
        if (fallback) {
          try {
            return await fallback();
          } catch (error) {
            console.error(`Offline fallback failed for ${operationName}:`, error);
            return null;
          }
        }
      }

      if (showOfflineMessage && toast) {
        toast({
          title: 'Offline',
          description: `Cannot ${operationName} while offline.`,
          variant: 'destructive',
        });
      }
      
      return null;
    }

    // Online - execute normally
    try {
      return await operation();
    } catch (error) {
      console.error(`Operation failed: ${operationName}`, error);
      
      // If operation failed and we have a fallback, try it
      if (fallback) {
        try {
          return await fallback();
        } catch (fallbackError) {
          console.error(`Fallback failed for ${operationName}:`, fallbackError);
        }
      }
      
      return null;
    }
  }, [offlineState, toast]);

  return {
    offlineState,
    executeOfflineAware,
  };
}
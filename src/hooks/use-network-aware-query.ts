import { useQuery, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useNetworkStatus } from './use-network-status';
import { useToast } from './use-toast';
import { useCallback, useEffect, useRef } from 'react';

export interface NetworkAwareQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryFn'> {
  queryFn: () => Promise<TData>;
  /** Show toast notifications for network-related errors */
  showNetworkToasts?: boolean;
  /** Fallback data to use when offline and no cached data is available */
  offlineFallback?: TData;
  /** Custom error message for network failures */
  networkErrorMessage?: string;
  /** Whether to automatically retry when network comes back online */
  retryOnReconnect?: boolean;
}

export interface NetworkAwareQueryResult<TData, TError = Error> {
  // Standard React Query properties
  data: TData | undefined;
  error: TError | null;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  status: 'error' | 'success' | 'pending';
  fetchStatus: 'fetching' | 'paused' | 'idle';
  refetch: () => Promise<any>;
  
  // Network-aware extensions
  /** Whether the query is failing due to network issues */
  isNetworkError: boolean;
  /** Whether we're showing cached data while offline */
  isShowingCachedData: boolean;
  /** Manually retry the query with network awareness */
  retryWithNetworkCheck: () => Promise<void>;
  /** Get the age of cached data in milliseconds */
  getCachedDataAge: () => number | null;
}

/**
 * Enhanced useQuery hook with network awareness and graceful offline handling
 */
export function useNetworkAwareQuery<TData, TError = Error>(
  options: NetworkAwareQueryOptions<TData, TError>
): NetworkAwareQueryResult<TData, TError> {
  const {
    queryFn,
    showNetworkToasts = true,
    offlineFallback,
    networkErrorMessage,
    retryOnReconnect = true,
    ...queryOptions
  } = options;

  const networkStatus = useNetworkStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const lastOnlineRef = useRef<boolean>(networkStatus.isOnline);
  const hasShownOfflineToastRef = useRef<boolean>(false);

  // Enhanced query function with network awareness
  const networkAwareQueryFn = useCallback(async (): Promise<TData> => {
    // If offline and we have fallback data, use it
    if (!networkStatus.isOnline && offlineFallback !== undefined) {
      return offlineFallback;
    }

    // If offline and no fallback, throw error to allow React Query to handle cached data
    if (!networkStatus.isOnline) {
      throw new Error('Device is offline and no cached data is available');
    }

    try {
      const result = await queryFn();
      
      // Reset offline toast flag on successful query
      hasShownOfflineToastRef.current = false;
      
      return result;
    } catch (error) {
      // Enhance error with network context
      const enhancedError = error instanceof Error ? error : new Error(String(error));
      
      // Add network context to error message
      if (!networkStatus.isOnline) {
        enhancedError.message = `Network offline: ${enhancedError.message}`;
      } else if (networkStatus.getNetworkQuality() === 'poor') {
        enhancedError.message = `Poor connection: ${enhancedError.message}`;
      }
      
      throw enhancedError;
    }
  }, [queryFn, networkStatus.isOnline, networkStatus.getNetworkQuality, offlineFallback]);

  // Execute the query with enhanced options
  const queryResult = useQuery({
    ...queryOptions,
    queryFn: networkAwareQueryFn,
    // Enable background refetch when network comes back online
    refetchOnReconnect: retryOnReconnect,
    // Use stale data while offline
    staleTime: networkStatus.isOnline ? (queryOptions.staleTime ?? 5 * 60 * 1000) : Infinity,
    // Keep data longer when offline
    gcTime: networkStatus.isOnline ? (queryOptions.gcTime ?? 10 * 60 * 1000) : 30 * 60 * 1000,
    // Network mode based on online status
    networkMode: networkStatus.isOnline ? 'online' : 'offlineFirst',
  });

  // Determine if this is a network-related error
  const isNetworkError = !networkStatus.isOnline || 
    (queryResult?.error && 
     (String(queryResult.error).includes('fetch') || 
      String(queryResult.error).includes('network') ||
      String(queryResult.error).includes('offline') ||
      String(queryResult.error).includes('connection')));

  // Determine if we're showing cached data
  const isShowingCachedData = !networkStatus.isOnline && !!queryResult?.data && !queryResult?.isFetching;

  // Get cached data age
  const getCachedDataAge = useCallback((): number | null => {
    const queryCache = queryClient.getQueryCache();
    const query = queryCache.find({ queryKey: queryOptions.queryKey });
    
    if (query?.state.dataUpdatedAt) {
      return Date.now() - query.state.dataUpdatedAt;
    }
    
    return null;
  }, [queryClient, queryOptions.queryKey]);

  // Manual retry with network check
  const retryWithNetworkCheck = useCallback(async (): Promise<void> => {
    if (!networkStatus.isOnline) {
      // Check actual connectivity
      const isActuallyOnline = await networkStatus.checkConnectivity();
      
      if (!isActuallyOnline) {
        if (showNetworkToasts) {
          toast({
            title: 'Still Offline',
            description: 'Please check your internet connection and try again.',
            variant: 'destructive',
          });
        }
        return;
      }
    }

    // Force refetch
    await queryResult?.refetch?.();
  }, [networkStatus, queryResult?.refetch, showNetworkToasts, toast]);

  // Handle network status changes
  useEffect(() => {
    const wasOffline = !lastOnlineRef.current;
    const isNowOnline = networkStatus.isOnline;
    
    // Network came back online
    if (wasOffline && isNowOnline && retryOnReconnect) {
      console.log('NetworkAwareQuery: Network reconnected, refetching data');
      
      // Small delay to allow connection to stabilize
      setTimeout(() => {
        queryResult?.refetch?.();
      }, 1000);
      
      if (showNetworkToasts && hasShownOfflineToastRef.current) {
        toast({
          title: 'Back Online',
          description: 'Refreshing data...',
        });
      }
    }
    
    // Network went offline
    if (!wasOffline && !isNowOnline) {
      console.log('NetworkAwareQuery: Network went offline');
      
      if (showNetworkToasts && !hasShownOfflineToastRef.current) {
        const cachedAge = getCachedDataAge();
        const hasRecentCache = cachedAge !== null && cachedAge < 10 * 60 * 1000; // 10 minutes
        
        toast({
          title: 'Working Offline',
          description: hasRecentCache 
            ? 'Showing cached data. Some information may not be up to date.'
            : 'Limited functionality available offline.',
          variant: 'destructive',
        });
        
        hasShownOfflineToastRef.current = true;
      }
    }
    
    lastOnlineRef.current = isNowOnline;
  }, [networkStatus.isOnline, retryOnReconnect, queryResult?.refetch, showNetworkToasts, toast, getCachedDataAge]);

  // Show network-specific error toasts
  useEffect(() => {
    if (queryResult?.error && isNetworkError && showNetworkToasts) {
      const errorMessage = networkErrorMessage || 
        (!networkStatus.isOnline 
          ? 'Unable to load data while offline. Showing cached data if available.'
          : 'Network error occurred. Please check your connection.');
      
      // Only show toast if we haven't shown the offline toast already
      if (networkStatus.isOnline || !hasShownOfflineToastRef.current) {
        toast({
          title: 'Connection Issue',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  }, [queryResult?.error, isNetworkError, showNetworkToasts, networkErrorMessage, networkStatus.isOnline, toast, retryWithNetworkCheck]);

  return {
    // Standard React Query properties with defaults
    data: queryResult?.data,
    error: queryResult?.error || null,
    isError: queryResult?.isError || false,
    isLoading: queryResult?.isLoading || false,
    isSuccess: queryResult?.isSuccess || false,
    isFetching: queryResult?.isFetching || false,
    status: queryResult?.status || 'pending',
    fetchStatus: queryResult?.fetchStatus || 'idle',
    refetch: queryResult?.refetch || (() => Promise.resolve()),
    
    // Network-aware extensions
    isNetworkError,
    isShowingCachedData,
    retryWithNetworkCheck,
    getCachedDataAge,
  };
}

/**
 * Hook for handling network-aware mutations with automatic retry and error handling
 */
export function useNetworkAwareMutation<TData, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    showNetworkToasts?: boolean;
    networkErrorMessage?: string;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: TError, variables: TVariables) => void;
  } = {}
) {
  const {
    showNetworkToasts = true,
    networkErrorMessage,
    onSuccess,
    onError,
  } = options;

  const networkStatus = useNetworkStatus();
  const { toast } = useToast();

  const networkAwareMutationFn = useCallback(async (variables: TVariables): Promise<TData> => {
    // Check network status before attempting mutation
    if (!networkStatus.isOnline) {
      throw new Error('Cannot perform this action while offline');
    }

    // Check connection quality for important operations
    const quality = networkStatus.getNetworkQuality();
    if (quality === 'poor') {
      console.warn('NetworkAwareMutation: Attempting mutation with poor connection');
    }

    try {
      return await mutationFn(variables);
    } catch (error) {
      // Enhance error with network context
      const enhancedError = error instanceof Error ? error : new Error(String(error));
      
      if (!networkStatus.isOnline) {
        enhancedError.message = `Network offline: ${enhancedError.message}`;
      } else if (quality === 'poor') {
        enhancedError.message = `Poor connection: ${enhancedError.message}`;
      }
      
      throw enhancedError;
    }
  }, [mutationFn, networkStatus]);

  return {
    mutate: networkAwareMutationFn,
    isNetworkError: !networkStatus.isOnline,
    networkQuality: networkStatus.getNetworkQuality(),
    canAttemptMutation: networkStatus.isOnline,
  };
}
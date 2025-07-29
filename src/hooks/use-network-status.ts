import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

export interface NetworkStatus {
  /** Current online/offline status */
  isOnline: boolean;
  /** Whether the app was previously offline and just came back online */
  wasOffline: boolean;
  /** Connection type if available */
  connectionType?: string;
  /** Effective connection type (slow-2g, 2g, 3g, 4g) */
  effectiveType?: string;
  /** Downlink speed in Mbps */
  downlink?: number;
  /** Round-trip time in milliseconds */
  rtt?: number;
  /** Whether the connection is considered slow */
  isSlowConnection: boolean;
}

export interface NetworkStatusHook extends NetworkStatus {
  /** Manually check network connectivity */
  checkConnectivity: () => Promise<boolean>;
  /** Force refresh all data when back online */
  refreshOnReconnect: () => void;
  /** Get network quality assessment */
  getNetworkQuality: () => 'good' | 'fair' | 'poor' | 'offline';
}

/**
 * Hook for monitoring network status and handling connectivity changes
 * Provides comprehensive network state management and automatic recovery
 */
export function useNetworkStatus(): NetworkStatusHook {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => ({
    isOnline: navigator.onLine,
    wasOffline: false,
    isSlowConnection: false,
  }));
  
  // Optional React Query integration - only use if available
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  let toast: ReturnType<typeof useToast>['toast'] | null = null;
  
  try {
    queryClient = useQueryClient();
    const toastHook = useToast();
    toast = toastHook.toast;
  } catch (error) {
    // React Query or toast not available - continue without them
    console.warn('Network status hook: React Query or toast not available, continuing with basic functionality');
  }

  /**
   * Update network connection info from Network Information API
   */
  const updateConnectionInfo = useCallback(() => {
    // @ts-ignore - Network Information API is not fully standardized
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      const rtt = connection.rtt;
      
      // Determine if connection is slow
      const isSlowConnection = 
        effectiveType === 'slow-2g' || 
        effectiveType === '2g' || 
        (downlink && downlink < 1.5) || 
        (rtt && rtt > 300);

      setNetworkStatus(prev => ({
        ...prev,
        connectionType: connection.type,
        effectiveType,
        downlink,
        rtt,
        isSlowConnection,
      }));
    }
  }, []);

  /**
   * Manually check network connectivity by attempting a lightweight request
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Use a lightweight request to check actual connectivity
      // We'll ping a small endpoint or use the Supabase health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Connectivity check failed:', error);
      return false;
    }
  }, []);

  /**
   * Get network quality assessment
   */
  const getNetworkQuality = useCallback((): 'good' | 'fair' | 'poor' | 'offline' => {
    if (!networkStatus.isOnline) return 'offline';
    
    if (networkStatus.effectiveType) {
      switch (networkStatus.effectiveType) {
        case '4g':
          return 'good';
        case '3g':
          return 'fair';
        case '2g':
        case 'slow-2g':
          return 'poor';
        default:
          return 'fair';
      }
    }
    
    // Fallback based on downlink and RTT
    if (networkStatus.downlink && networkStatus.rtt) {
      if (networkStatus.downlink >= 5 && networkStatus.rtt <= 100) return 'good';
      if (networkStatus.downlink >= 1.5 && networkStatus.rtt <= 300) return 'fair';
      return 'poor';
    }
    
    return networkStatus.isSlowConnection ? 'poor' : 'fair';
  }, [networkStatus]);

  /**
   * Force refresh all data when back online
   */
  const refreshOnReconnect = useCallback(async () => {
    try {
      console.log('Network: Refreshing all data after reconnection');
      
      if (queryClient) {
        await queryClient.invalidateQueries();
      }
      
      if (toast) {
        toast({
          title: 'Data Refreshed',
          description: 'All data has been updated after reconnection.',
        });
      }
    } catch (error) {
      console.error('Failed to refresh data after reconnection:', error);
      if (toast) {
        toast({
          title: 'Refresh Failed',
          description: 'Some data may not be up to date. Please refresh manually.',
          variant: 'destructive',
        });
      }
    }
  }, [queryClient, toast]);

  /**
   * Handle online status changes
   */
  useEffect(() => {
    const handleOnline = async () => {
      console.log('Network: Browser reports online status');
      
      // Double-check with actual connectivity test
      const isActuallyOnline = await checkConnectivity();
      
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: isActuallyOnline,
        wasOffline: !prev.isOnline && isActuallyOnline, // Mark that we were offline and are now online
      }));

      if (isActuallyOnline) {
        updateConnectionInfo();
        
        // Show success toast if available
        if (toast) {
          toast({
            title: 'Back Online',
            description: 'Connection restored. Refreshing data...',
          });
        }
        
        // Refresh data after a short delay to allow connection to stabilize
        setTimeout(() => {
          refreshOnReconnect();
        }, 1000);
      }
    };

    const handleOffline = () => {
      console.log('Network: Browser reports offline status');
      
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: prev.isOnline, // Set to true if we were previously online
      }));

      if (toast) {
        toast({
          title: 'Connection Lost',
          description: 'Working offline. Data may not be up to date.',
          variant: 'destructive',
        });
      }
    };

    // Listen for browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if supported
    // @ts-ignore - Network Information API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', updateConnectionInfo);
    }

    // Initial connection info update
    updateConnectionInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection && typeof connection.removeEventListener === 'function') {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, [checkConnectivity, updateConnectionInfo, refreshOnReconnect, toast]);

  /**
   * Periodic connectivity checks when online
   */
  useEffect(() => {
    if (!networkStatus.isOnline) return;

    const interval = setInterval(async () => {
      const isStillOnline = await checkConnectivity();
      
      if (!isStillOnline && networkStatus.isOnline) {
        // We thought we were online but connectivity check failed
        setNetworkStatus(prev => ({
          ...prev,
          isOnline: false,
        }));
        
        if (toast) {
          toast({
            title: 'Connection Issues',
            description: 'Network connectivity problems detected.',
            variant: 'destructive',
          });
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [networkStatus.isOnline, checkConnectivity, toast]);

  return {
    ...networkStatus,
    checkConnectivity,
    refreshOnReconnect,
    getNetworkQuality,
  };
}

/**
 * Hook for handling network-aware operations
 * Provides utilities for graceful degradation and retry logic
 */
export function useNetworkAwareOperation() {
  const networkStatus = useNetworkStatus();
  const { toast } = useToast();

  /**
   * Execute an operation with network awareness and retry logic
   */
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      exponentialBackoff?: boolean;
      showToasts?: boolean;
      operationName?: string;
    } = {}
  ): Promise<T | null> => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
      showToasts = true,
      operationName = 'operation'
    } = options;

    // Don't attempt if offline
    if (!networkStatus.isOnline) {
      if (showToasts) {
        toast({
          title: 'Offline',
          description: `Cannot perform ${operationName} while offline.`,
          variant: 'destructive',
        });
      }
      return null;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add delay before retry (except first attempt)
        if (attempt > 0) {
          const delay = exponentialBackoff 
            ? retryDelay * Math.pow(2, attempt - 1)
            : retryDelay;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Check if we're still online before retrying
          if (!networkStatus.isOnline) {
            throw new Error('Network connection lost during retry');
          }
        }

        const result = await operation();
        
        // Success - show recovery toast if this was a retry
        if (attempt > 0 && showToasts) {
          toast({
            title: 'Success',
            description: `${operationName} completed after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}.`,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Network operation attempt ${attempt + 1} failed:`, lastError);
        
        // Don't retry for certain error types
        if (lastError.message.includes('unauthorized') || 
            lastError.message.includes('forbidden') ||
            lastError.message.includes('not found')) {
          break;
        }
        
        // Don't retry if we've lost connection
        if (!networkStatus.isOnline) {
          break;
        }
      }
    }

    // All retries failed
    if (showToasts && lastError) {
      toast({
        title: `${operationName} Failed`,
        description: `Failed after ${maxRetries + 1} attempts. ${lastError.message}`,
        variant: 'destructive',
      });
    }

    return null;
  }, [networkStatus.isOnline, toast]);

  /**
   * Check if an operation should be attempted based on network conditions
   */
  const shouldAttemptOperation = useCallback((requiresGoodConnection = false): boolean => {
    if (!networkStatus.isOnline) return false;
    
    if (requiresGoodConnection) {
      const quality = networkStatus.getNetworkQuality();
      return quality === 'good' || quality === 'fair';
    }
    
    return true;
  }, [networkStatus]);

  return {
    networkStatus,
    executeWithRetry,
    shouldAttemptOperation,
  };
}
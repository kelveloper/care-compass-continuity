import { useState, useCallback } from 'react';
import { useNetworkStatus } from './use-network-status';
import { useToast } from './use-toast';
import { handleApiCallWithRetry, ApiCallOptions } from '@/lib/api-error-handler';

export interface RetryOptions extends ApiCallOptions {
  /** Custom retry condition function */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Custom success callback */
  onSuccess?: (data: any, attempts: number) => void;
  /** Custom error callback */
  onError?: (error: Error, attempts: number) => void;
  /** Show progress toasts during retries */
  showProgressToasts?: boolean;
  /** Custom operation name for user feedback */
  operationName?: string;
}

export interface RetryState {
  /** Current retry attempt (0 = first attempt) */
  currentAttempt: number;
  /** Total number of attempts made */
  totalAttempts: number;
  /** Whether a retry operation is in progress */
  isRetrying: boolean;
  /** Last error encountered */
  lastError: Error | null;
  /** Whether the operation was successful */
  isSuccess: boolean;
  /** Whether the operation has completed (success or final failure) */
  isComplete: boolean;
}

/**
 * Comprehensive retry mechanism hook for any async operation
 * Provides network-aware retry logic with user feedback
 */
export function useRetryMechanism() {
  const networkStatus = useNetworkStatus();
  const { toast } = useToast();
  
  const [retryState, setRetryState] = useState<RetryState>({
    currentAttempt: 0,
    totalAttempts: 0,
    isRetrying: false,
    lastError: null,
    isSuccess: false,
    isComplete: false,
  });

  /**
   * Execute an operation with comprehensive retry logic
   */
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T | null> => {
    const {
      maxRetries = networkStatus.getNetworkQuality() === 'poor' ? 1 : 3,
      retryDelay = networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000,
      exponentialBackoff = true,
      networkAware = true,
      shouldRetry,
      onSuccess,
      onError,
      showProgressToasts = true,
      operationName = 'operation',
      context = 'useRetryMechanism'
    } = options;

    // Reset state
    setRetryState({
      currentAttempt: 0,
      totalAttempts: 0,
      isRetrying: true,
      lastError: null,
      isSuccess: false,
      isComplete: false,
    });

    try {
      const result = await handleApiCallWithRetry(
        operation,
        {
          maxRetries,
          retryDelay,
          exponentialBackoff,
          networkAware,
          context,
          onRetry: (attempt, error) => {
            setRetryState(prev => ({
              ...prev,
              currentAttempt: attempt,
              totalAttempts: attempt,
              lastError: error,
            }));

            if (showProgressToasts) {
              toast({
                title: `Retrying ${operationName}...`,
                description: `Attempt ${attempt} of ${maxRetries + 1}`,
              });
            }
          },
          shouldRetry: shouldRetry || ((error, attempt) => {
            // Default retry logic
            if (!networkStatus.isOnline) return false;
            
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('not found') || 
                errorMessage.includes('unauthorized') || 
                errorMessage.includes('forbidden')) {
              return false;
            }
            
            return attempt < maxRetries;
          })
        }
      );

      if (result.error) {
        // Final failure
        setRetryState(prev => ({
          ...prev,
          isRetrying: false,
          isComplete: true,
          lastError: result.error,
          totalAttempts: result.attempts,
        }));

        if (onError) {
          onError(result.error, result.attempts);
        }

        if (showProgressToasts) {
          toast({
            title: `${operationName} Failed`,
            description: `Failed after ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}.`,
            variant: 'destructive',
          });
        }

        return null;
      }

      // Success
      setRetryState(prev => ({
        ...prev,
        isRetrying: false,
        isComplete: true,
        isSuccess: true,
        totalAttempts: result.attempts,
      }));

      if (onSuccess) {
        onSuccess(result.data, result.attempts);
      }

      if (showProgressToasts && result.attempts > 1) {
        toast({
          title: `${operationName} Successful`,
          description: `Completed after ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}.`,
        });
      }

      return result.data;
    } catch (error) {
      // Unexpected error
      const err = error instanceof Error ? error : new Error(String(error));
      
      setRetryState(prev => ({
        ...prev,
        isRetrying: false,
        isComplete: true,
        lastError: err,
        totalAttempts: prev.totalAttempts + 1,
      }));

      if (onError) {
        onError(err, 1);
      }

      return null;
    }
  }, [networkStatus, toast]);

  /**
   * Execute multiple operations with retry logic in sequence
   */
  const executeSequenceWithRetry = useCallback(async <T>(
    operations: Array<{
      operation: () => Promise<T>;
      name: string;
      options?: RetryOptions;
    }>
  ): Promise<T[]> => {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      const { operation, name, options = {} } = operations[i];
      
      const result = await executeWithRetry(operation, {
        ...options,
        operationName: name,
        showProgressToasts: options.showProgressToasts ?? true,
      });
      
      if (result === null) {
        // Operation failed, stop sequence
        throw new Error(`Sequence failed at step ${i + 1}: ${name}`);
      }
      
      results.push(result);
    }
    
    return results;
  }, [executeWithRetry]);

  /**
   * Execute multiple operations with retry logic in parallel
   */
  const executeParallelWithRetry = useCallback(async <T>(
    operations: Array<{
      operation: () => Promise<T>;
      name: string;
      options?: RetryOptions;
    }>
  ): Promise<T[]> => {
    const promises = operations.map(({ operation, name, options = {} }) =>
      executeWithRetry(operation, {
        ...options,
        operationName: name,
        showProgressToasts: options.showProgressToasts ?? false, // Reduce toast spam
      })
    );
    
    const results = await Promise.allSettled(promises);
    
    const successfulResults: T[] = [];
    const errors: Error[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value !== null) {
        successfulResults.push(result.value);
      } else {
        const error = result.status === 'rejected' 
          ? result.reason 
          : new Error(`Operation ${operations[index].name} returned null`);
        errors.push(error);
      }
    });
    
    if (errors.length > 0) {
      toast({
        title: 'Some Operations Failed',
        description: `${errors.length} of ${operations.length} operations failed.`,
        variant: 'destructive',
      });
    }
    
    return successfulResults;
  }, [executeWithRetry, toast]);

  /**
   * Reset the retry state
   */
  const resetRetryState = useCallback(() => {
    setRetryState({
      currentAttempt: 0,
      totalAttempts: 0,
      isRetrying: false,
      lastError: null,
      isSuccess: false,
      isComplete: false,
    });
  }, []);

  /**
   * Check if an operation should be retried based on current network conditions
   */
  const shouldRetryOperation = useCallback((error: Error, attempt: number): boolean => {
    // Don't retry if offline
    if (!networkStatus.isOnline) return false;
    
    // Don't retry certain error types
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('not found') || 
        errorMessage.includes('unauthorized') || 
        errorMessage.includes('forbidden') ||
        errorMessage.includes('unique violation')) {
      return false;
    }
    
    // Adjust max retries based on network quality
    const maxRetries = networkStatus.getNetworkQuality() === 'poor' ? 1 : 3;
    return attempt < maxRetries;
  }, [networkStatus]);

  /**
   * Get recommended retry delay based on network conditions
   */
  const getRetryDelay = useCallback((attempt: number): number => {
    const baseDelay = networkStatus.getNetworkQuality() === 'poor' ? 2000 : 1000;
    return Math.min(baseDelay * Math.pow(2, attempt), 30000);
  }, [networkStatus]);

  return {
    // State
    retryState,
    
    // Core functions
    executeWithRetry,
    executeSequenceWithRetry,
    executeParallelWithRetry,
    resetRetryState,
    
    // Utility functions
    shouldRetryOperation,
    getRetryDelay,
    
    // Network status for external use
    networkStatus,
  };
}

/**
 * Simplified retry hook for common use cases
 */
export function useSimpleRetry() {
  const { executeWithRetry, retryState } = useRetryMechanism();
  
  return {
    /** Execute operation with default retry settings */
    retry: executeWithRetry,
    /** Whether a retry is in progress */
    isRetrying: retryState.isRetrying,
    /** Last error encountered */
    error: retryState.lastError,
    /** Whether the operation was successful */
    isSuccess: retryState.isSuccess,
    /** Total attempts made */
    attempts: retryState.totalAttempts,
  };
}

/**
 * Hook for database operations with optimized retry settings
 */
export function useDatabaseRetry() {
  const { executeWithRetry } = useRetryMechanism();
  
  const executeDatabaseOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string = 'database operation'
  ): Promise<T | null> => {
    return executeWithRetry(operation, {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      networkAware: true,
      operationName,
      context: 'database',
      showProgressToasts: true,
    });
  }, [executeWithRetry]);
  
  return {
    executeDatabaseOperation,
  };
}

/**
 * Hook for API operations with optimized retry settings
 */
export function useApiRetry() {
  const { executeWithRetry } = useRetryMechanism();
  
  const executeApiOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string = 'API operation'
  ): Promise<T | null> => {
    return executeWithRetry(operation, {
      maxRetries: 2,
      retryDelay: 500,
      exponentialBackoff: true,
      networkAware: true,
      operationName,
      context: 'api',
      showProgressToasts: false, // API operations are usually fast
    });
  }, [executeWithRetry]);
  
  return {
    executeApiOperation,
  };
}
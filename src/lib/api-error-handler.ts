import { AppError, createErrorState } from '@/types/error';
import { errorLogger } from './error-logger';
import { toast } from '@/hooks/use-toast';

export interface ApiCallOptions {
  showToast?: boolean;
  retryAction?: () => void;
  context?: string;
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  networkAware?: boolean;
}

// Service-level error handling for API calls with enhanced retry logic
export async function handleApiCall<T>(
  apiCall: () => Promise<T>,
  options: ApiCallOptions = {}
): Promise<T | null> {
  const { 
    showToast = true, 
    retryAction, 
    context,
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    networkAware = true
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add delay before retry (except first attempt)
      if (attempt > 0) {
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt - 1)
          : retryDelay;
        
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 30000))); // Cap at 30 seconds
        
        // Check network status if network-aware
        if (networkAware && !navigator.onLine) {
          throw new Error('Network connection lost during retry');
        }
      }

      const result = await apiCall();
      
      // Success - log recovery if this was a retry
      if (attempt > 0) {
        console.log(`API call succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      // Don't retry for certain error types
      if (isNonRetryableError(lastError)) {
        break;
      }
      
      // Don't retry if network is down and we're network-aware
      if (networkAware && !navigator.onLine) {
        lastError = createNetworkError('Network connection lost', retryAction);
        break;
      }
      
      console.warn(`API call attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  // All retries failed - handle the error
  if (lastError) {
    const errorState = createErrorState(lastError, undefined, retryAction);
    
    // Log the error with context
    errorLogger.logError(errorState, {
      context,
      apiCall: apiCall.name || 'anonymous',
      attempts: maxRetries + 1,
    });

    // Show user-friendly toast notification
    if (showToast) {
      showUserFriendlyError(errorState, maxRetries + 1);
    }
  }

  return null;
}

/**
 * Enhanced API call handler with automatic retry and network awareness
 */
export async function handleApiCallWithRetry<T>(
  apiCall: () => Promise<T>,
  options: ApiCallOptions & {
    onRetry?: (attempt: number, error: Error) => void;
    shouldRetry?: (error: Error, attempt: number) => boolean;
  } = {}
): Promise<{ data: T | null; error: Error | null; attempts: number }> {
  const { 
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    networkAware = true,
    onRetry,
    shouldRetry,
    context
  } = options;

  let lastError: Error | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts = attempt + 1;
    
    try {
      // Add delay before retry (except first attempt)
      if (attempt > 0) {
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt - 1)
          : retryDelay;
        
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 30000)));
        
        // Check network status if network-aware
        if (networkAware && !navigator.onLine) {
          throw createNetworkError('Network connection lost during retry');
        }
      }

      const result = await apiCall();
      return { data: result, error: null, attempts };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      // Call retry callback if provided
      if (onRetry && attempt < maxRetries) {
        onRetry(attempt + 1, lastError);
      }
      
      // Check custom retry logic
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        break;
      }
      
      // Don't retry for certain error types
      if (isNonRetryableError(lastError)) {
        break;
      }
      
      // Don't retry if network is down and we're network-aware
      if (networkAware && !navigator.onLine) {
        lastError = createNetworkError('Network connection lost', options.retryAction);
        break;
      }
    }
  }

  // Log the final error
  if (lastError) {
    const errorState = createErrorState(lastError, undefined, options.retryAction);
    errorLogger.logError(errorState, {
      context,
      apiCall: apiCall.name || 'anonymous',
      attempts,
    });
  }

  return { data: null, error: lastError, attempts };
}

/**
 * Check if an error should not be retried
 */
function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not found') ||
    message.includes('bad request') ||
    message.includes('unprocessable entity') ||
    message.includes('conflict')
  );
}

// Show user-friendly error messages with retry information
export function showUserFriendlyError(
  error: { type: string; message: string; recoverable?: boolean; retryAction?: () => void }, 
  attempts: number = 1
) {
  let title = 'Error';
  let description = error.message;

  switch (error.type) {
    case 'network':
      title = 'Connection Error';
      description = attempts > 1 
        ? `Unable to connect after ${attempts} attempts. Please check your internet connection.`
        : 'Unable to connect to the server. Please check your internet connection.';
      break;
    case 'auth':
      title = 'Authentication Error';
      description = 'Please log in to continue.';
      break;
    case 'validation':
      title = 'Invalid Data';
      description = 'Please check your input and try again.';
      break;
    case 'business':
      title = 'Processing Error';
      description = attempts > 1
        ? `Unable to process your request after ${attempts} attempts. Please try again later.`
        : 'Unable to process your request. Please try again.';
      break;
  }

  const toastOptions: any = {
    title,
    description,
    variant: 'destructive',
  };

  // Skip action for now to avoid TypeScript issues
  // if (error.retryAction) {
  //   toastOptions.action = {
  //     altText: 'Retry',
  //     onClick: error.retryAction,
  //     children: 'Retry'
  //   };
  // }

  toast(toastOptions);
}

// Utility to create typed errors for different scenarios
export const createNetworkError = (message: string, retryAction?: () => void) =>
  new AppError(message, 'network', true, retryAction);

export const createValidationError = (message: string) =>
  new AppError(message, 'validation', true);

export const createAuthError = (message: string) =>
  new AppError(message, 'auth', false);

export const createBusinessError = (message: string, retryAction?: () => void) =>
  new AppError(message, 'business', true, retryAction);

// Utility to handle Supabase errors specifically
export function handleSupabaseError(error: any): AppError {
  if (!error) {
    return new AppError('Unknown database error', 'business');
  }

  const message = error.message || 'Database operation failed';
  
  // Check for specific Supabase error codes
  if (error.code) {
    switch (error.code) {
      case 'PGRST116': // No rows returned
        return new AppError('No data found', 'business', true);
      case 'PGRST301': // JWT expired
        return createAuthError('Session expired. Please log in again.');
      case '42P01': // Table doesn't exist
        return new AppError('Database configuration error', 'business', false);
      case '23505': // Unique violation
        return createValidationError('This record already exists');
      case '23503': // Foreign key violation
        return createValidationError('Invalid reference data');
      default:
        return createBusinessError(message);
    }
  }

  // Check for network-related errors
  if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
    return createNetworkError(message);
  }

  return createBusinessError(message);
}

// Global unhandled promise rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    const errorState = createErrorState(error);
    
    errorLogger.logError(errorState, {
      type: 'unhandledPromiseRejection',
      url: window.location.href,
    });

    // Prevent the default browser behavior
    event.preventDefault();
  });
}
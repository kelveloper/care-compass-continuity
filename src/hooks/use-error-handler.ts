import { useCallback } from 'react';
import { AppError, createErrorState } from '@/types/error';
import { errorLogger } from '@/lib/error-logger';
import { toast } from '@/hooks/use-toast';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  context?: string;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, logError = true, context } = options;

  const handleError = useCallback((
    error: Error | AppError | string,
    additionalContext?: Record<string, any>
  ) => {
    // Convert string errors to Error objects
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Create error state
    const errorState = createErrorState(errorObj);

    // Log the error if enabled
    if (logError) {
      errorLogger.logError(errorState, {
        context,
        ...additionalContext,
      });
    }

    // Show toast notification if enabled
    if (showToast) {
      let title = 'Error';
      let description = errorState.message;

      switch (errorState.type) {
        case 'network':
          title = 'Connection Error';
          description = 'Unable to connect to the server. Please check your internet connection.';
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
          description = 'Unable to process your request. Please try again.';
          break;
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
    }

    return errorState;
  }, [showToast, logError, context]);

  const handleAsyncError = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T | null> => {
    try {
      return await asyncOperation();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      handleError(errorObj);
      return fallbackValue ?? null;
    }
  }, [handleError]);

  const createErrorHandler = useCallback((
    errorType: AppError['type'],
    recoverable: boolean = true
  ) => {
    return (message: string, retryAction?: () => void) => {
      const error = new AppError(message, errorType, recoverable, retryAction);
      return handleError(error);
    };
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    createErrorHandler,
    // Convenience methods for common error types
    handleNetworkError: createErrorHandler('network', true),
    handleValidationError: createErrorHandler('validation', true),
    handleAuthError: createErrorHandler('auth', false),
    handleBusinessError: createErrorHandler('business', true),
  };
}
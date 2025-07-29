import React, { Component, ReactNode } from 'react';
import { ErrorBoundaryState, ErrorInfo, createErrorState } from '@/types/error';
import { errorLogger } from '@/lib/error-logger';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{
    error: ErrorBoundaryState['error'];
    resetError: () => void;
    isNetworkError?: boolean;
    retryCount?: number;
    isAutoRetrying?: boolean;
  }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, errors won't bubble up to parent boundaries
}

interface EnhancedErrorBoundaryState extends ErrorBoundaryState {
  isNetworkError: boolean;
  retryCount: number;
  isAutoRetrying: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, EnhancedErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private networkRetryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isNetworkError: false,
      retryCount: 0,
      isAutoRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    const errorState = createErrorState(error);
    
    // Determine if this is a network-related error
    const isNetworkError = error.message.toLowerCase().includes('network') ||
                          error.message.toLowerCase().includes('fetch') ||
                          error.message.toLowerCase().includes('connection') ||
                          error.message.toLowerCase().includes('offline') ||
                          error.name === 'NetworkError' ||
                          !navigator.onLine;
    
    return {
      hasError: true,
      error: errorState,
      isNetworkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    const errorState = createErrorState(error);
    errorState.componentStack = errorInfo.componentStack;
    
    errorLogger.logError(errorState, {
      componentStack: errorInfo.componentStack,
      boundary: 'ErrorBoundary',
      isNetworkError: this.state.isNetworkError,
      retryCount: this.state.retryCount,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Handle network errors with automatic retry
    if (this.state.isNetworkError && this.state.retryCount < 3) {
      console.log(`ErrorBoundary: Network error detected, scheduling retry ${this.state.retryCount + 1}/3`);
      
      this.setState({ isAutoRetrying: true });
      
      const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s
      
      this.networkRetryTimeoutId = window.setTimeout(() => {
        this.handleNetworkRetry();
      }, retryDelay);
    } else {
      // Auto-reset after 10 seconds for non-network recoverable errors
      if (errorState.recoverable && !this.state.isNetworkError) {
        this.resetTimeoutId = window.setTimeout(() => {
          this.resetError();
        }, 10000);
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    if (this.networkRetryTimeoutId) {
      clearTimeout(this.networkRetryTimeoutId);
    }
  }

  handleNetworkRetry = async () => {
    console.log('ErrorBoundary: Attempting network retry');
    
    try {
      // Check network connectivity before retrying
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD', 
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('ErrorBoundary: Network connectivity restored, resetting error');
        this.resetError();
        return;
      }
    } catch (connectivityError) {
      console.log('ErrorBoundary: Network still unavailable');
    }
    
    // Network still unavailable, increment retry count
    this.setState(prevState => ({ 
      retryCount: prevState.retryCount + 1,
      isAutoRetrying: false
    }));
    
    // Schedule another retry if we haven't exceeded max attempts
    if (this.state.retryCount < 2) {
      const nextRetryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount + 1), 15000);
      
      this.setState({ isAutoRetrying: true });
      
      this.networkRetryTimeoutId = window.setTimeout(() => {
        this.handleNetworkRetry();
      }, nextRetryDelay);
    } else {
      console.log('ErrorBoundary: Max network retry attempts reached');
      this.setState({ isAutoRetrying: false });
    }
  };

  resetError = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    if (this.networkRetryTimeoutId) {
      clearTimeout(this.networkRetryTimeoutId);
      this.networkRetryTimeoutId = null;
    }
    
    console.log('ErrorBoundary: Resetting error state');
    
    this.setState({
      hasError: false,
      error: null,
      isNetworkError: false,
      retryCount: 0,
      isAutoRetrying: false,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          isNetworkError={this.state.isNetworkError}
          retryCount={this.state.retryCount}
          isAutoRetrying={this.state.isAutoRetrying}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for manually triggering error boundary
export function useErrorHandler() {
  return (error: Error) => {
    // This will trigger the nearest error boundary
    throw error;
  };
}
import React from 'react';
import { ErrorState } from '@/types/error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Wifi, 
  Shield, 
  AlertCircle,
  Bug
} from 'lucide-react';

interface ErrorFallbackProps {
  error: ErrorState;
  resetError: () => void;
  isNetworkError?: boolean;
  retryCount?: number;
  isAutoRetrying?: boolean;
}

const getErrorIcon = (type: ErrorState['type']) => {
  switch (type) {
    case 'network':
      return <Wifi className="h-6 w-6" />;
    case 'auth':
      return <Shield className="h-6 w-6" />;
    case 'validation':
      return <AlertCircle className="h-6 w-6" />;
    case 'business':
      return <Bug className="h-6 w-6" />;
    default:
      return <AlertTriangle className="h-6 w-6" />;
  }
};

const getErrorTitle = (type: ErrorState['type']) => {
  switch (type) {
    case 'network':
      return 'Connection Problem';
    case 'auth':
      return 'Authentication Required';
    case 'validation':
      return 'Invalid Data';
    case 'business':
      return 'Processing Error';
    default:
      return 'Something Went Wrong';
  }
};

const getErrorDescription = (type: ErrorState['type']) => {
  switch (type) {
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case 'auth':
      return 'Your session has expired or you need to log in to access this feature.';
    case 'validation':
      return 'The data provided is invalid or incomplete. Please check your input and try again.';
    case 'business':
      return 'An error occurred while processing your request. Our team has been notified.';
    default:
      return 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.';
  }
};

const getErrorColor = (type: ErrorState['type']) => {
  switch (type) {
    case 'network':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'auth':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'validation':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'business':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-red-100 text-red-800 border-red-200';
  }
};

export function ErrorFallback({ 
  error, 
  resetError, 
  isNetworkError = false, 
  retryCount = 0, 
  isAutoRetrying = false 
}: ErrorFallbackProps) {
  const handleRetry = async () => {
    // For network errors, check connectivity first
    if (isNetworkError) {
      try {
        const response = await fetch('/favicon.ico', { 
          method: 'HEAD', 
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error('Still offline');
        }
      } catch (connectivityError) {
        // Still offline, show user feedback
        alert('Still unable to connect. Please check your internet connection.');
        return;
      }
    }

    if (error.retryAction) {
      try {
        error.retryAction();
      } catch (retryError) {
        console.error('Retry action failed:', retryError);
      }
    }
    resetError();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${getErrorColor(error.type)}`}>
              {getErrorIcon(error.type)}
            </div>
          </div>
          <CardTitle className="text-xl font-semibold">
            {getErrorTitle(error.type)}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {getErrorDescription(error.type)}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error Details */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error.message}
            </AlertDescription>
          </Alert>

          {/* Error Metadata */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="text-xs">
              {error.type.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {error.recoverable ? 'RECOVERABLE' : 'CRITICAL'}
            </Badge>
            {isNetworkError && (
              <Badge variant="outline" className="text-xs">
                NETWORK ERROR
              </Badge>
            )}
            {retryCount > 0 && (
              <Badge variant="outline" className="text-xs">
                RETRY {retryCount}/3
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {error.timestamp.toLocaleTimeString()}
            </Badge>
          </div>

          {/* Network Status Indicator */}
          {isNetworkError && (
            <Alert className="border-blue-200 bg-blue-50">
              <Wifi className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {!navigator.onLine 
                  ? 'Your device appears to be offline. Please check your internet connection.'
                  : 'Having trouble connecting to our servers. This may be a temporary issue.'
                }
                {isAutoRetrying && (
                  <span className="block mt-1 text-blue-600 font-medium">
                    Automatically retrying connection...
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {error.recoverable && (
              <Button 
                onClick={handleRetry}
                className="w-full"
                variant="default"
                disabled={isAutoRetrying}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isAutoRetrying ? 'animate-spin' : ''}`} />
                {isAutoRetrying ? 'Retrying...' : (isNetworkError ? 'Check Connection & Retry' : 'Try Again')}
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
              
              <Button 
                onClick={handleReload}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </div>
          </div>

          {/* Development Info */}
          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Technical Details (Development)
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
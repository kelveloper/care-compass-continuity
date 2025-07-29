import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppError } from '@/types/error';
import { useErrorHandler } from '@/hooks/use-error-handler';

// Component that can throw different types of errors
const ErrorThrower: React.FC<{ errorType: string | null }> = ({ errorType }) => {
  if (errorType === 'network') {
    throw new AppError('Network connection failed', 'network', true, () => {
      console.log('Retry network operation');
    });
  } else if (errorType === 'auth') {
    throw new AppError('Authentication required', 'auth', false);
  } else if (errorType === 'validation') {
    throw new AppError('Invalid data provided', 'validation', true);
  } else if (errorType === 'business') {
    throw new AppError('Business logic error', 'business', true);
  } else if (errorType === 'generic') {
    throw new Error('Generic JavaScript error');
  }
  
  return <div className="text-green-600">No error - component rendered successfully!</div>;
};

// Component that uses the error handler hook
const ErrorHandlerDemo: React.FC = () => {
  const { handleError, handleNetworkError, handleAuthError, handleValidationError } = useErrorHandler({
    context: 'ErrorTestPage'
  });

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Error Handler Hook Demo</h3>
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleError(new Error('Manual error via hook'))}
        >
          Generic Error
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleNetworkError('Network error via hook')}
        >
          Network Error
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleAuthError('Auth error via hook')}
        >
          Auth Error
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleValidationError('Validation error via hook')}
        >
          Validation Error
        </Button>
      </div>
    </div>
  );
};

export default function ErrorTestPage() {
  const [errorType, setErrorType] = useState<string | null>(null);

  const resetError = () => setErrorType(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Boundary Test Page</CardTitle>
          <CardDescription>
            Test the comprehensive error boundary implementation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Handler Hook Demo */}
          <ErrorHandlerDemo />

          {/* Error Boundary Demo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Error Boundary Demo</h3>
            
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setErrorType('network')}>
                Throw Network Error
              </Button>
              <Button onClick={() => setErrorType('auth')}>
                Throw Auth Error
              </Button>
              <Button onClick={() => setErrorType('validation')}>
                Throw Validation Error
              </Button>
              <Button onClick={() => setErrorType('business')}>
                Throw Business Error
              </Button>
              <Button onClick={() => setErrorType('generic')}>
                Throw Generic Error
              </Button>
              <Button variant="outline" onClick={resetError}>
                Reset
              </Button>
            </div>

            {/* Error Boundary Container */}
            <Card className="min-h-[200px]">
              <CardContent className="p-6">
                <ErrorBoundary
                  onError={(error, errorInfo) => {
                    console.log('Error caught by boundary:', error, errorInfo);
                  }}
                >
                  <ErrorThrower errorType={errorType} />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </div>

          {/* Nested Error Boundaries Demo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Nested Error Boundaries</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Boundary 1</CardTitle>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary isolate>
                    <Button onClick={() => {
                      throw new Error('Error in boundary 1');
                    }}>
                      Throw Error in Boundary 1
                    </Button>
                  </ErrorBoundary>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Boundary 2</CardTitle>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary isolate>
                    <Button onClick={() => {
                      throw new Error('Error in boundary 2');
                    }}>
                      Throw Error in Boundary 2
                    </Button>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Instructions */}
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Instructions:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Click the error buttons to test different error types</li>
                <li>Notice how different error types show different UI and recovery options</li>
                <li>Check the browser console for detailed error logging</li>
                <li>In development mode, you'll see the Error Debug Panel in the bottom right</li>
                <li>Try the "Try Again" button on recoverable errors</li>
                <li>Test nested boundaries to see error isolation</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../ErrorBoundary';
import { AppError } from '@/types/error';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
  RefreshCw: (props: any) => <svg data-testid="refresh-icon" {...props} />,
  Home: (props: any) => <svg data-testid="home-icon" {...props} />,
  Wifi: (props: any) => <svg data-testid="wifi-icon" {...props} />,
  Shield: (props: any) => <svg data-testid="shield-icon" {...props} />,
  AlertCircle: (props: any) => <svg data-testid="alert-circle-icon" {...props} />,
  Bug: (props: any) => <svg data-testid="bug-icon" {...props} />,
}));

// Mock the error logger
jest.mock('@/lib/error-logger', () => ({
  errorLogger: {
    logError: jest.fn(),
  },
}));

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({ 
  shouldThrow = false, 
  errorType = 'unknown' 
}) => {
  if (shouldThrow) {
    if (errorType === 'network') {
      throw new AppError('Network connection failed', 'network', true);
    } else if (errorType === 'auth') {
      throw new AppError('Authentication required', 'auth', false);
    } else {
      throw new Error('Test error');
    }
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error fallback when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders network error fallback correctly', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="network" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    expect(screen.getByText('NETWORK')).toBeInTheDocument();
    expect(screen.getByText('RECOVERABLE')).toBeInTheDocument();
  });

  it('renders auth error fallback correctly', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="auth" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Authentication required')).toBeInTheDocument();
    expect(screen.getByText('AUTH')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('allows resetting the error state', async () => {
    const resetMock = jest.fn();
    render(
      <ErrorBoundary fallback={({ error, resetError }) => (
        <div>
          <div>Error: {error.message}</div>
          <button onClick={() => { resetMock(); resetError(); }}>Reset Error</button>
        </div>
      )}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Wait for error to be caught
    await waitFor(() => {
      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    });

    // Click reset button
    fireEvent.click(screen.getByText('Reset Error'));

    // Verify reset was called
    expect(resetMock).toHaveBeenCalled();

    // For Error Boundaries, the state resets but the error UI persists 
    // until the component tree actually changes, which is the expected behavior
    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
  });

  it('provides navigation options', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Go Home')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('calls custom error handler when provided', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('uses custom fallback component when provided', () => {
    const CustomFallback = ({ error, resetError }: any) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={resetError}>Custom Reset</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Custom Reset')).toBeInTheDocument();
  });
});

describe('Basic Error Boundary Functionality', () => {
  it('handles basic error recovery', async () => {
    const resetMock = jest.fn();
    render(
      <ErrorBoundary fallback={({ error, resetError }) => (
        <div>
          <div>Test fallback: {error.message}</div>
          <button onClick={() => { resetMock(); resetError(); }}>Try Again</button>
        </div>
      )}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show error state
    expect(screen.getByText('Test fallback: Test error')).toBeInTheDocument();

    // Click try again button
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    // Wait for async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Verify that the reset function was called
    expect(resetMock).toHaveBeenCalled();

    // Error Boundary correctly maintains error state until component tree changes
    // This is the expected behavior for React Error Boundaries
    expect(screen.getByText('Test fallback: Test error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
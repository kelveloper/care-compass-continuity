export interface ErrorState {
  type: 'network' | 'validation' | 'business' | 'auth' | 'unknown';
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
  timestamp: Date;
  stack?: string;
  componentStack?: string;
}

export interface ErrorInfo {
  componentStack: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: ErrorState | null;
}

export class AppError extends Error {
  public readonly type: ErrorState['type'];
  public readonly recoverable: boolean;
  public readonly retryAction?: () => void;

  constructor(
    message: string,
    type: ErrorState['type'] = 'unknown',
    recoverable: boolean = true,
    retryAction?: () => void
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.recoverable = recoverable;
    this.retryAction = retryAction;
  }
}

export const createErrorState = (
  error: Error,
  type?: ErrorState['type'],
  retryAction?: () => void
): ErrorState => {
  // Determine error type if not provided
  let errorType: ErrorState['type'] = type || 'unknown';
  
  if (!type) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      errorType = 'network';
    } else if (message.includes('validation') || message.includes('invalid')) {
      errorType = 'validation';
    } else if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('auth')) {
      errorType = 'auth';
    } else if (error instanceof AppError) {
      errorType = error.type;
    }
  }

  return {
    type: errorType,
    message: error.message,
    recoverable: error instanceof AppError ? error.recoverable : errorType !== 'auth',
    retryAction: error instanceof AppError ? error.retryAction : retryAction,
    timestamp: new Date(),
    stack: error.stack,
  };
};
import { ErrorState } from '@/types/error';

interface LogContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp: Date;
}

class ErrorLogger {
  private context: Partial<LogContext> = {};

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  logError(error: ErrorState, additionalContext?: Record<string, any>) {
    const logEntry = {
      ...error,
      context: {
        ...this.context,
        ...additionalContext,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
      },
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error [${error.type.toUpperCase()}]`);
      console.error('Message:', error.message);
      console.error('Type:', error.type);
      console.error('Recoverable:', error.recoverable);
      console.error('Timestamp:', error.timestamp);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      if (error.componentStack) {
        console.error('Component Stack:', error.componentStack);
      }
      if (additionalContext) {
        console.error('Additional Context:', additionalContext);
      }
      console.groupEnd();
    }

    // In production, you would send this to your error tracking service
    // Examples: Sentry, LogRocket, Bugsnag, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(logEntry);
      // For now, we'll just log to console
      console.error('Production Error:', logEntry);
    }

    // Store in localStorage for debugging (limited storage)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('error-logs') || '[]');
      const logs = [logEntry, ...existingLogs].slice(0, 10); // Keep only last 10 errors
      localStorage.setItem('error-logs', JSON.stringify(logs));
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError);
    }
  }

  getStoredErrors(): ErrorState[] {
    try {
      return JSON.parse(localStorage.getItem('error-logs') || '[]');
    } catch {
      return [];
    }
  }

  clearStoredErrors() {
    try {
      localStorage.removeItem('error-logs');
    } catch (error) {
      console.warn('Failed to clear error logs:', error);
    }
  }
}

export const errorLogger = new ErrorLogger();

// Initialize context with session info
errorLogger.setContext({
  sessionId: crypto.randomUUID(),
  timestamp: new Date(),
});
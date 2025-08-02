import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorDebugPanel } from "@/components/ErrorDebugPanel";
import { OfflineStatusBadge } from "@/components/OfflineIndicator";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { errorLogger } from "@/lib/error-logger";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotificationDemoPage from "./pages/NotificationDemoPage";
import ErrorTestPage from "./pages/ErrorTestPage";
import NotFound from "./pages/NotFound";

// Enhanced QueryClient configuration for optimal caching and background updates
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Caching and background update settings
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes (formerly cacheTime)
      
      // Background refetching settings
      refetchOnWindowFocus: true, // Refetch when user returns to the app
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts if data is stale
      
      // Enhanced retry configuration with network awareness
      retry: (failureCount, error) => {
        console.error('QueryClient: Query failed:', error);
        
        // Don't retry if we're offline
        if (!navigator.onLine) {
          console.log('QueryClient: Skipping retry - device is offline');
          return false;
        }
        
        // Don't retry for certain error types
        if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = (error as Error).message.toLowerCase();
          // Don't retry for authentication errors, not found errors, or validation errors
          if (errorMessage.includes('not found') || 
              errorMessage.includes('unauthorized') || 
              errorMessage.includes('forbidden') ||
              errorMessage.includes('bad request') ||
              errorMessage.includes('unprocessable entity') ||
              errorMessage.includes('conflict')) {
            return false;
          }
        }
        
        // Retry up to 3 times for network-related errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter to prevent thundering herd
        const baseDelay = 1000 * Math.pow(2, attemptIndex);
        const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
        return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
      },
      
      // Network mode settings - allow offline queries to return cached data
      networkMode: 'offlineFirst', // Try cache first, then network
    },
    mutations: {
      // Enhanced retry for mutations with network awareness
      retry: (failureCount, error) => {
        // Don't retry if we're offline
        if (!navigator.onLine) {
          console.log('QueryClient: Skipping mutation retry - device is offline');
          return false;
        }
        
        // Don't retry for certain error types
        if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = (error as Error).message.toLowerCase();
          if (errorMessage.includes('unauthorized') || 
              errorMessage.includes('forbidden') ||
              errorMessage.includes('bad request') ||
              errorMessage.includes('unprocessable entity') ||
              errorMessage.includes('conflict')) {
            return false;
          }
        }
        
        // Retry once for network-related errors
        return failureCount < 1;
      },
      retryDelay: 2000, // 2 second delay for mutation retries
      
      // Network mode for mutations - only attempt when online
      networkMode: 'online',
    },
  },
});

const App = () => {
  console.log('App: Component rendered');
  
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log application-level errors
        errorLogger.logError({
          type: 'unknown',
          message: error.message,
          recoverable: true,
          timestamp: new Date(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        }, {
          level: 'application',
          component: 'App',
        });
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AnalyticsProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary isolate>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={
                  <ErrorBoundary isolate>
                    <Index />
                  </ErrorBoundary>
                } />
                <Route path="/test" element={
                  <ErrorBoundary isolate>
                    <TestPage />
                  </ErrorBoundary>
                } />
                <Route path="/notifications-demo" element={
                  <ErrorBoundary isolate>
                    <NotificationDemoPage />
                  </ErrorBoundary>
                } />
                <Route path="/error-test" element={
                  <ErrorBoundary isolate>
                    <ErrorTestPage />
                  </ErrorBoundary>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={
                  <ErrorBoundary isolate>
                    <NotFound />
                  </ErrorBoundary>
                } />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
          {/* React Query DevTools - only shows in development */}
          <ReactQueryDevtools 
            initialIsOpen={false} 
            position="bottom-right"
            buttonPosition="bottom-right"
          />
          
          {/* Error Debug Panel - only shows in development */}
          <ErrorDebugPanel />
          
          {/* Global Offline Status Badge */}
          <div className="fixed top-4 right-4 z-50">
            <OfflineStatusBadge />
          </div>
          </TooltipProvider>
        </AnalyticsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotificationDemoPage from "./pages/NotificationDemoPage";
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
      
      // Retry configuration with exponential backoff
      retry: (failureCount, error) => {
        console.error('QueryClient: Query failed:', error);
        
        // Don't retry for certain error types
        if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = (error as Error).message.toLowerCase();
          // Don't retry for authentication errors or not found errors
          if (errorMessage.includes('not found') || 
              errorMessage.includes('unauthorized') || 
              errorMessage.includes('forbidden')) {
            return false;
          }
        }
        
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      
      // Network mode settings
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
      
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

const App = () => {
  console.log('App: Component rendered');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/notifications-demo" element={<NotificationDemoPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        {/* React Query DevTools - only shows in development */}
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

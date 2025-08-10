/**
 * Lazy-loaded components for better performance and code splitting
 * Reduces initial bundle size and improves load times
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Loading fallback components
const DashboardSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="border-b bg-card">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <Skeleton className="h-32 w-full rounded-lg mb-6" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        
        <div className="flex flex-col gap-3 mb-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const PatientDetailSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="border-b bg-card">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    </div>
    
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-28" />
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                <Skeleton className="h-8 w-20 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
);

const ProviderMatchSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-8 w-20" />
    </div>
    
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between mt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const GenericLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="ml-2 text-muted-foreground">Loading...</span>
  </div>
);

// Lazy load components with proper error boundaries
const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: ComponentType = GenericLoadingSpinner
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: Parameters<T>[0]) => (
    <Suspense fallback={<fallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Lazy-loaded components
export const LazyDashboard = createLazyComponent(
  () => import('@/components/Dashboard'),
  DashboardSkeleton
);

export const LazyPatientDetailContainer = createLazyComponent(
  () => import('@/components/PatientDetailContainer'),
  PatientDetailSkeleton
);

export const LazyProviderMatchCards = createLazyComponent(
  () => import('@/components/ProviderMatchCards'),
  ProviderMatchSkeleton
);

export const LazyNotificationCenter = createLazyComponent(
  () => import('@/components/NotificationCenter')
);

export const LazyErrorTestPage = createLazyComponent(
  () => import('@/pages/ErrorTestPage')
);

export const LazyNotificationDemoPage = createLazyComponent(
  () => import('@/pages/NotificationDemoPage')
);

export const LazyTestPage = createLazyComponent(
  () => import('@/pages/TestPage')
);

export const LazyDemoPage = createLazyComponent(
  () => import('@/pages/DemoPage')
);

// Export skeleton components for reuse
export {
  DashboardSkeleton,
  PatientDetailSkeleton,
  ProviderMatchSkeleton,
  GenericLoadingSpinner,
};
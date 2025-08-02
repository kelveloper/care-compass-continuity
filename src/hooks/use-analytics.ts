import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackPageView,
  trackEvent,
  trackPatientInteraction,
  trackProviderInteraction,
  trackReferralInteraction,
  trackRiskCalculation,
  trackUserFlow,
  trackPerformance,
  trackError,
  trackEngagement,
  trackFeatureUsage,
} from '../lib/analytics';

// Hook for automatic page view tracking
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname);
  }, [location]);
};

// Hook for performance monitoring
export const usePerformanceTracking = () => {
  const trackLoadTime = useCallback((startTime: number, label: string) => {
    const loadTime = performance.now() - startTime;
    trackPerformance(`${label}_load_time`, loadTime, 'milliseconds');
  }, []);

  const trackApiCall = useCallback((startTime: number, endpoint: string, success: boolean) => {
    const duration = performance.now() - startTime;
    trackPerformance(`api_${endpoint}_duration`, duration, 'milliseconds');
    trackEvent(success ? 'api_success' : 'api_error', 'api_calls', endpoint, duration);
  }, []);

  return { trackLoadTime, trackApiCall };
};

// Hook for user interaction tracking
export const useInteractionTracking = () => {
  const trackPatientAction = useCallback((action: 'view' | 'search' | 'filter') => {
    trackPatientInteraction(action);
  }, []);

  const trackProviderAction = useCallback((action: 'search' | 'match' | 'select') => {
    trackProviderInteraction(action);
  }, []);

  const trackReferralAction = useCallback((action: 'create' | 'update' | 'complete') => {
    trackReferralInteraction(action);
  }, []);

  const trackRisk = useCallback((riskLevel: 'low' | 'medium' | 'high') => {
    trackRiskCalculation(riskLevel);
  }, []);

  const trackFlow = useCallback((step: string, flowName: string) => {
    trackUserFlow(step, flowName);
  }, []);

  return {
    trackPatientAction,
    trackProviderAction,
    trackReferralAction,
    trackRisk,
    trackFlow,
  };
};

// Hook for error tracking
export const useErrorTracking = () => {
  const trackAppError = useCallback((error: Error, context?: string) => {
    const errorMessage = `${error.name}: ${error.message}`;
    const category = context || 'application_error';
    trackError(errorMessage, category);
  }, []);

  const trackApiError = useCallback((error: any, endpoint: string) => {
    const errorMessage = `API Error - ${endpoint}: ${error.message || 'Unknown error'}`;
    trackError(errorMessage, 'api_error');
  }, []);

  return { trackAppError, trackApiError };
};

// Hook for engagement tracking
export const useEngagementTracking = () => {
  const trackTimeOnPage = useCallback(() => {
    const startTime = Date.now();
    
    return () => {
      const timeSpent = Date.now() - startTime;
      trackEngagement('time_on_page', timeSpent);
    };
  }, []);

  const trackFeatureUse = useCallback((feature: string) => {
    trackFeatureUsage(feature);
  }, []);

  const trackUserAction = useCallback((action: string, category: string, label?: string) => {
    trackEvent(action, category, label);
  }, []);

  return {
    trackTimeOnPage,
    trackFeatureUse,
    trackUserAction,
  };
};
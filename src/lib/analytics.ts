import ReactGA from 'react-ga4';

// Analytics configuration
const ANALYTICS_CONFIG = {
  GA_MEASUREMENT_ID: import.meta.env.VITE_GA_MEASUREMENT_ID,
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  DEBUG_MODE: import.meta.env.VITE_ANALYTICS_DEBUG === 'true',
};

// Initialize Google Analytics
export const initializeAnalytics = () => {
  if (!ANALYTICS_CONFIG.ENABLE_ANALYTICS || !ANALYTICS_CONFIG.GA_MEASUREMENT_ID) {
    console.log('Analytics disabled or GA_MEASUREMENT_ID not configured');
    return;
  }

  ReactGA.initialize(ANALYTICS_CONFIG.GA_MEASUREMENT_ID, {
    debug: ANALYTICS_CONFIG.DEBUG_MODE,
    gtagOptions: {
      // Privacy-focused configuration for healthcare app
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    },
  });

  console.log('Analytics initialized');
};

// Track page views
export const trackPageView = (path: string, title?: string) => {
  if (!ANALYTICS_CONFIG.ENABLE_ANALYTICS) return;

  ReactGA.send({
    hitType: 'pageview',
    page: path,
    title: title || document.title,
  });
};

// Track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (!ANALYTICS_CONFIG.ENABLE_ANALYTICS) return;

  ReactGA.event({
    action,
    category,
    label,
    value,
  });
};

// Healthcare-specific event tracking (anonymized)
export const trackPatientInteraction = (action: 'view' | 'search' | 'filter') => {
  trackEvent(action, 'patient_management', undefined, 1);
};

export const trackProviderInteraction = (action: 'search' | 'match' | 'select') => {
  trackEvent(action, 'provider_matching', undefined, 1);
};

export const trackReferralInteraction = (action: 'create' | 'update' | 'complete') => {
  trackEvent(action, 'referral_management', undefined, 1);
};

export const trackRiskCalculation = (riskLevel: 'low' | 'medium' | 'high') => {
  trackEvent('risk_calculated', 'risk_assessment', riskLevel, 1);
};

export const trackUserFlow = (step: string, flowName: string) => {
  trackEvent(`flow_${step}`, 'user_flow', flowName, 1);
};

// Performance tracking
export const trackPerformance = (metric: string, value: number, unit: string) => {
  if (!ANALYTICS_CONFIG.ENABLE_ANALYTICS) return;

  ReactGA.gtag('event', 'timing_complete', {
    name: metric,
    value: Math.round(value),
    event_category: 'performance',
    custom_map: { metric_unit: unit },
  });
};

// Error tracking (anonymized)
export const trackError = (error: string, category: string = 'javascript_error') => {
  if (!ANALYTICS_CONFIG.ENABLE_ANALYTICS) return;

  ReactGA.gtag('event', 'exception', {
    description: error,
    fatal: false,
    custom_map: { error_category: category },
  });
};

// User engagement tracking
export const trackEngagement = (action: string, duration?: number) => {
  trackEvent(action, 'user_engagement', undefined, duration);
};

// Feature usage tracking
export const trackFeatureUsage = (feature: string, action: string = 'used') => {
  trackEvent(action, 'feature_usage', feature, 1);
};
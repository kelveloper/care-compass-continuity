import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { initializeAnalytics } from '../lib/analytics';
import { usePageTracking } from '../hooks/use-analytics';

interface AnalyticsContextType {
  isEnabled: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  isEnabled: false,
});

export const useAnalytics = () => useContext(AnalyticsContext);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const isEnabled = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

  useEffect(() => {
    // Initialize Google Analytics
    initializeAnalytics();
  }, []);

  // Use page tracking hook
  usePageTracking();

  const contextValue: AnalyticsContextType = {
    isEnabled,
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
      {/* Vercel Analytics - automatically tracks page views and performance */}
      <Analytics />
    </AnalyticsContext.Provider>
  );
};
import { Dashboard } from "@/components/Dashboard";
import { startTiming, endTiming } from "@/lib/performance-monitor";
import { useEffect } from "react";
// import { useBackgroundSync } from "@/hooks/use-background-sync";

const Index = () => {
  console.log('Index: Page rendered');
  
  // Performance monitoring for dashboard load
  useEffect(() => {
    startTiming('dashboard-page-load');
    
    // End timing when component is mounted and ready
    const timer = setTimeout(() => {
      endTiming('dashboard-page-load', {
        route: '/',
        component: 'Index'
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Initialize background sync for real-time updates and caching
  // Temporarily disabled to debug patient loading issues
  // useBackgroundSync();
  
  return <Dashboard />;
};

export default Index;

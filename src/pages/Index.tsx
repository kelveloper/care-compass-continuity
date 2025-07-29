import { Dashboard } from "@/components/Dashboard";
// import { useBackgroundSync } from "@/hooks/use-background-sync";

const Index = () => {
  console.log('Index: Page rendered');
  
  // Initialize background sync for real-time updates and caching
  // Temporarily disabled to debug patient loading issues
  // useBackgroundSync();
  
  return <Dashboard />;
};

export default Index;

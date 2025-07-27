import { Dashboard } from "@/components/Dashboard";
import { useBackgroundSync } from "@/hooks/use-background-sync";

const Index = () => {
  console.log('Index: Page rendered');
  
  // Initialize background sync for real-time updates and caching
  useBackgroundSync();
  
  return <Dashboard />;
};

export default Index;

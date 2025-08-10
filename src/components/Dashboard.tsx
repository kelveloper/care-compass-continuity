import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCircle, Clock, AlertCircle, CheckCircle2, Loader2, RefreshCw, Search, Filter, Wifi, X, History } from "lucide-react";
import { PatientDetailContainer } from "./PatientDetailContainer";
import { NotificationCenter } from "./NotificationCenter";
import { NetworkStatusIndicator } from "./NetworkStatusIndicator";
import { OfflineStatusPanel } from "./OfflineIndicator";
import { usePatients } from "@/hooks/use-patients";
import { useInteractionTracking, useEngagementTracking, usePerformanceTracking } from "@/hooks/use-analytics";
// import { useOptimisticListUpdates } from "@/hooks/use-optimistic-updates";
// import { useDebouncedSearch } from "@/hooks/use-debounced-search";
// import { useBackgroundSync } from "@/hooks/use-background-sync";
import { Patient, PatientFilters } from "@/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useListKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const getRiskBadgeVariant = (level: string) => {
  switch (level) {
    case "high": return "destructive";
    case "medium": return "secondary";
    case "low": return "default";
    default: return "default";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "needed": return <AlertCircle className="h-4 w-4 text-warning" />;
    case "sent": return <Clock className="h-4 w-4 text-primary" />;
    case "scheduled": return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "completed": return <CheckCircle2 className="h-4 w-4 text-success" />;
    default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "needed": return "Referral Needed";
    case "sent": return "Referral Sent";
    case "scheduled": return "Scheduled";
    case "completed": return "Completed";
    default: return "Unknown";
  }
};

export const Dashboard = () => {
  console.log('Dashboard: Component rendered');
  
  // Analytics hooks
  const { trackPatientAction, trackFlow } = useInteractionTracking();
  const { trackFeatureUse, trackTimeOnPage } = useEngagementTracking();
  const { trackLoadTime } = usePerformanceTracking();
  
  // Mobile responsiveness hooks
  const isMobile = useIsMobile();
  const { width: screenWidth, isMobile: isMobileScreen, isTablet } = useScreenSize();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [realtimeActive, setRealtimeActive] = useState<boolean>(true);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [patientsPerPage] = useState<number>(10); // Fixed page size
  const prevPatientsRef = useRef<Patient[] | undefined>();
  const { toast } = useToast();
  
  // Simplified search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Debounce search term
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  };
  
  // Create filters object for server-side filtering using debounced search
  const filters: PatientFilters = useMemo(() => {
    const result: PatientFilters = {};
    
    // Only add filters that are active - use debounced search term
    if (debouncedSearchTerm.trim()) {
      result.search = debouncedSearchTerm.trim();
    }
    
    if (riskFilter !== "all") {
      result.riskLevel = riskFilter as "low" | "medium" | "high";
    }
    
    if (statusFilter !== "all") {
      result.referralStatus = statusFilter as "needed" | "sent" | "scheduled" | "completed";
    }
    
    return result;
  }, [debouncedSearchTerm, riskFilter, statusFilter]);
  
  const { 
    data: patients, 
    isLoading, 
    error, 
    refetch, 
    isFetching,
    isError,
    isRefetching,
    failureCount
  } = usePatients(filters, realtimeActive);
  
  // Initialize background sync for real-time updates and network handling
  // const backgroundSync = useBackgroundSync();
  
  // Moved console.log after variable declarations to avoid temporal dead zone error
  
  // Show success toast when data loads successfully for the first time
  useEffect(() => {
    if (Array.isArray(patients) && patients.length > 0 && !isLoading && !error && !prevPatientsRef.current) {
      toast({
        title: 'Dashboard Loaded',
        description: `Successfully loaded ${patients.length} patient${patients.length === 1 ? '' : 's'}.`,
      });
    }
  }, [patients, isLoading, error, toast]);
  
  // Detect changes in patient data to highlight recently updated patients
  useEffect(() => {
    // Ensure both current and previous patients are arrays
    if (!Array.isArray(patients) || !Array.isArray(prevPatientsRef.current)) {
      prevPatientsRef.current = patients;
      return;
    }
    
    // Find patients whose risk scores have changed
    const updatedPatientIds = new Set<string>();
    
    patients.forEach(currentPatient => {
      const prevPatient = prevPatientsRef.current?.find(p => p.id === currentPatient.id);
      
      if (prevPatient && prevPatient.leakageRisk.score !== currentPatient.leakageRisk.score) {
        updatedPatientIds.add(currentPatient.id);
      }
    });
    
    if (updatedPatientIds.size > 0) {
      setRecentlyUpdated(updatedPatientIds);
      
      // Show toast notification for updated patients
      toast({
        title: 'Patient Data Updated',
        description: `${updatedPatientIds.size} patient${updatedPatientIds.size === 1 ? '' : 's'} updated with new risk scores.`,
      });
      
      // Clear the highlight after 2 seconds (reduced from 3 seconds)
      const timer = setTimeout(() => {
        setRecentlyUpdated(new Set());
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    
    prevPatientsRef.current = patients;
  }, [patients, toast]);

  // Use optimistic updates for immediate feedback while server-side filtering is in progress
  const sortedPatients = useMemo(() => {
    // Ensure patients is always an array - this is critical to prevent forEach errors
    const patientsArray = Array.isArray(patients) ? patients : [];
    
    // If we have a search query and are still loading, show current results
    // Removed optimistic updates for debugging
    // if (searchTerm && (isFetching || isSearching) && patientsArray.length > 0) {
    //   const optimisticResults = searchOptimistic(searchTerm);
    //   return Array.isArray(optimisticResults) ? optimisticResults : [];
    // }
    
    // Otherwise use the server-filtered results
    return patientsArray;
  }, [patients, searchTerm, isFetching, isSearching]);


  // Pagination logic
  const totalPatients = sortedPatients.length;
  const totalPages = Math.ceil(totalPatients / patientsPerPage);
  const startIndex = (currentPage - 1) * patientsPerPage;
  const endIndex = startIndex + patientsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, endIndex);

  // Debug logging after all variables are properly declared
  console.log('Dashboard: Patient data state:', {
    patients: Array.isArray(patients) ? patients.length : `Not array: ${typeof patients}`,
    isLoading,
    error: error?.message,
    isFetching,
    isError,
    failureCount,
    totalPatients,
    sortedPatients: Array.isArray(sortedPatients) ? sortedPatients.length : `Not array: ${typeof sortedPatients}`,
    paginatedPatients: Array.isArray(paginatedPatients) ? paginatedPatients.length : `Not array: ${typeof paginatedPatients}`
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, riskFilter, statusFilter]);

  // Reset to first page if current page is beyond total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Keyboard navigation for patient list
  const {
    selectedIndex,
    setSelectedIndex,
    focusItem,
    setItemRef,
  } = useListKeyboardNavigation(
    paginatedPatients,
    (patient, index) => {
      console.log('Dashboard: Keyboard selection for patient:', patient.id, patient.name);
      setSelectedPatient(patient);
    }
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/' key
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA' || 
                              activeElement?.contentEditable === 'true';
        
        if (!isInputFocused) {
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder*="Search patients"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }
      }
      
      // Clear filters on Escape (when not in input)
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA';
        
        if (!isInputFocused && (searchTerm || riskFilter !== "all" || statusFilter !== "all")) {
          clearSearch();
          setRiskFilter("all");
          setStatusFilter("all");
          toast({
            title: 'Filters Cleared',
            description: 'All filters have been reset using keyboard shortcut.',
          });
        }
      }
      
      // Pagination keyboard shortcuts
      if (e.key === 'PageUp' || (e.key === 'ArrowLeft' && e.ctrlKey)) {
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA';
        
        if (!isInputFocused && currentPage > 1) {
          e.preventDefault();
          setCurrentPage(currentPage - 1);
          setSelectedIndex(-1);
          toast({
            title: 'Previous Page',
            description: `Navigated to page ${currentPage - 1} of ${totalPages}`,
          });
        }
      }
      
      if (e.key === 'PageDown' || (e.key === 'ArrowRight' && e.ctrlKey)) {
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA';
        
        if (!isInputFocused && currentPage < totalPages) {
          e.preventDefault();
          setCurrentPage(currentPage + 1);
          setSelectedIndex(-1);
          toast({
            title: 'Next Page',
            description: `Navigated to page ${currentPage + 1} of ${totalPages}`,
          });
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [searchTerm, riskFilter, statusFilter, currentPage, totalPages, toast, clearSearch]);

  if (selectedPatient) {
    console.log('Dashboard: Navigating to patient detail for:', selectedPatient.id, selectedPatient.name);
    return (
      <PatientDetailContainer 
        patientId={selectedPatient.id} 
        onBack={() => {
          console.log('Dashboard: Returning from patient detail');
          setSelectedPatient(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Healthcare Continuity AI</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                <span className="font-semibold text-primary">Preventing Patient Leakage</span> • Smart Risk Assessment • Intelligent Provider Matching
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open('/demo', '_blank')}
                className="text-xs sm:text-sm border-primary/30 hover:border-primary"
              >
                📺 Demo Mode
              </Button>
              <NotificationCenter />
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="font-bold text-foreground">Brenda Chen, RN</p>
                  <p className="text-sm text-muted-foreground">
                    Care Coordinator • <span className="font-medium text-primary">Boston Medical Center</span>
                  </p>
                  <p className="text-xs text-green-600 font-medium">● Online • Ready to save patients</p>
                </div>
                <div className="text-right sm:hidden">
                  <p className="font-bold text-foreground text-sm">Brenda</p>
                  <p className="text-xs text-green-600">● Online</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Network Status Indicator */}
          <NetworkStatusIndicator className="mt-2" />
          
          {/* Offline Status Indicator */}
          <OfflineStatusPanel className="mt-2" />
          
          {/* Additional error indicator for query-specific errors */}
          {error && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load patient data. Please try again.</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/20"
                onClick={() => refetch()}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          {/* Story-driven header with impact metrics */}
          <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg p-4 sm:p-6 mb-6 border border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                  Good morning, Brenda! 👋
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-3">
                  Your AI assistant has analyzed <span className="font-semibold text-foreground">{totalPatients} discharged patients</span> and identified those at highest risk of leaving your network. 
                  <span className="text-primary font-medium"> Every minute counts</span> - patients are making care decisions right now.
                </p>
                <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                    <span className="text-muted-foreground">
                      <span className="font-bold text-destructive text-base">
                        {sortedPatients.filter(p => p.leakageRisk.level === 'high').length}
                      </span> critical patients need <span className="font-semibold text-destructive">immediate action</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">
                      Each patient saved = <span className="font-bold text-green-600">$18,500</span> annual value
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-amber-600">30%</span> typically leak without intervention
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-destructive">
                  ${((sortedPatients.filter(p => p.leakageRisk.level === 'high').length) * 18.5).toFixed(0)}K
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Revenue at risk <span className="font-semibold text-destructive">today</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  💡 Quick action can save it all
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">Priority Patient Queue</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={realtimeActive ? "outline" : "secondary"}
                      size="sm" 
                      onClick={() => {
                        const newState = !realtimeActive;
                        setRealtimeActive(newState);
                        toast({
                          title: `Real-time Updates ${newState ? 'Enabled' : 'Disabled'}`,
                          description: newState 
                            ? 'Patient data will automatically update when changes occur.'
                            : 'Real-time updates have been disabled. Use the refresh button to update data.',
                        });
                      }}
                      className={`${realtimeActive ? "border-primary text-primary" : ""} text-xs sm:text-sm`}
                    >
                      <Wifi className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${realtimeActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="hidden sm:inline">{realtimeActive ? "Real-time On" : "Real-time Off"}</span>
                      <span className="sm:hidden">{realtimeActive ? "Live" : "Off"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{realtimeActive ? "Real-time updates are enabled. Patient list will automatically sort by risk score when data changes." : "Real-time updates are disabled. Click to enable."}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  const result = await refetch();
                  if (result.data && !result.error) {
                    toast({
                      title: 'Data Refreshed',
                      description: `Successfully refreshed ${result.data.length} patient records.`,
                    });
                  }
                }}
                disabled={isFetching}
                className="text-xs sm:text-sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </Button>
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="relative">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">
                  🧠 AI-Powered Risk Intelligence Active
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                  <span className="font-semibold">Smart prioritization in action:</span> Patients automatically ranked by leakage probability using 15+ clinical and demographic factors. 
                  <span className="font-medium text-red-700 dark:text-red-400"> Red badges = immediate intervention needed</span> - these patients are actively considering other options.
                  {realtimeActive && (
                    <span className="ml-1 font-bold text-green-700 dark:text-green-400">• Live updates enabled</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-red-600">🚨 High Risk:</span>
                    <span className="text-amber-700 dark:text-amber-300">Act within 24 hours</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-amber-600">⚠️ Medium Risk:</span>
                    <span className="text-amber-700 dark:text-amber-300">Schedule within 3 days</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-green-600">✅ Low Risk:</span>
                    <span className="text-amber-700 dark:text-amber-300">Standard follow-up</span>
                  </div>
                </div>
                <div className="mt-2 text-xs bg-amber-100 dark:bg-amber-900/30 rounded px-2 py-1 inline-block">
                  💰 <strong>Impact:</strong> Each high-risk patient you save = $18,500+ annual revenue + lifetime relationship value
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground/80 mb-4">
            <span className="font-medium">Quick actions:</span> Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">/ </kbd> to search, 
            <kbd className="px-1 py-0.5 text-xs bg-muted rounded mx-1">↑↓</kbd> to navigate, 
            <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Enter</kbd> to select
            {totalPages > 1 && (
              <span>
                , <kbd className="px-1 py-0.5 text-xs bg-muted rounded mx-1">PgUp/PgDn</kbd> for pages
              </span>
            )}
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients by name, diagnosis, or service... (Press / to focus)"
                className="pl-8 pr-20 text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.trim()) {
                    trackPatientAction('search');
                    trackFeatureUse('patient_search');
                  }
                }}
                disabled={isLoading || isError}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && searchTerm) {
                    clearSearch();
                  } else if (e.key === 'ArrowDown' && sortedPatients.length > 0) {
                    e.preventDefault();
                    focusItem(0);
                  }
                }}
              />
              
              {/* Search status indicator */}
              {isSearching && (
                <div className="absolute right-12 top-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {/* Clear search button */}
              <div className="absolute right-1 top-1 flex items-center gap-1">
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={clearSearch}
                  >
                    <span className="sr-only">Clear search</span>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select 
                value={riskFilter} 
                onValueChange={(value) => {
                  setRiskFilter(value);
                  trackPatientAction('filter');
                  trackFeatureUse('risk_filter');
                }}
                disabled={isLoading || isError}
              >
                <SelectTrigger className="w-full sm:w-[140px] text-sm">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value);
                  trackPatientAction('filter');
                  trackFeatureUse('status_filter');
                }}
                disabled={isLoading || isError}
              >
                <SelectTrigger className="w-full sm:w-[140px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="needed">Referral Needed</SelectItem>
                  <SelectItem value="sent">Referral Sent</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Filter Status Indicator */}
          {!isLoading && !error && (searchTerm || riskFilter !== "all" || statusFilter !== "all") && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 p-3 sm:p-2 bg-muted/30 rounded-md">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Showing {totalPatients} {totalPatients === 1 ? 'patient' : 'patients'} matching your filters
                  {isSearching && (
                    <span className="ml-1 text-primary">
                      • Searching...
                    </span>
                  )}
                  {totalPages > 1 && (
                    <span className="ml-1">
                      (Page {currentPage} of {totalPages})
                    </span>
                  )}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 sm:h-7 px-2 text-xs sm:text-sm self-start sm:self-center"
                onClick={() => {
                  clearSearch();
                  setRiskFilter("all");
                  setStatusFilter("all");
                  toast({
                    title: 'Filters Cleared',
                    description: 'All filters have been reset. Showing all patients.',
                  });
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Patient Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Active Discharge Plans ({totalPatients})
              {totalPages > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  • Page {currentPage} of {totalPages}
                </span>
              )}
              {isFetching && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {error && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="ml-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                {/* Skeleton for patient list */}
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border animate-pulse">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Patient Info Column */}
                      <div className="flex-1">
                        <div className="h-5 w-32 bg-muted rounded mb-2"></div>
                        <div className="h-4 w-48 bg-muted rounded mb-1"></div>
                        <div className="h-3 w-24 bg-muted rounded"></div>
                      </div>
                      
                      {/* Service Type Column */}
                      <div className="flex-1">
                        <div className="h-5 w-40 bg-muted rounded mb-2"></div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-4 w-4 bg-muted rounded-full"></div>
                          <div className="h-4 w-28 bg-muted rounded"></div>
                        </div>
                      </div>
                      
                      {/* Risk Score Column */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-20 bg-muted rounded-full"></div>
                          <div className="h-4 w-12 bg-muted rounded"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="h-9 w-20 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Background Refresh Indicator */}
            {!isLoading && isRefetching && (
              <div className="mb-4 p-2 bg-muted/20 rounded-md flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                <span className="text-sm text-muted-foreground">Refreshing patient data...</span>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                  <span className="font-medium">Failed to load patients</span>
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  {error.message || "There was an error loading patient data. Please check your connection and try again."}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={() => refetch()} 
                    variant="default"
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? 'Retrying...' : 'Try Again'}
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      // Disable realtime updates and try again
                      setRealtimeActive(false);
                      toast({
                        title: 'Real-time Updates Disabled',
                        description: 'Attempting to reconnect with real-time updates disabled.',
                      });
                      setTimeout(async () => {
                        const result = await refetch();
                        if (result.data && !result.error) {
                          toast({
                            title: 'Connection Restored',
                            description: `Successfully loaded ${result.data.length} patient records.`,
                          });
                        }
                      }, 500);
                    }} 
                    variant="outline"
                    disabled={isFetching || !realtimeActive}
                  >
                    <Wifi className="h-4 w-4 mr-2 text-muted-foreground" />
                    Disable Real-time & Retry
                  </Button>
                </div>
                {failureCount > 2 && (
                  <div className="mt-2 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 rounded-md max-w-md">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      <span className="font-medium">Persistent connection issues detected.</span> The server might be temporarily unavailable. Please try again in a few minutes or contact support if the problem persists.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && totalPatients === 0 && (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-3 sm:space-y-4 px-4">
                <UserCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                <div className="text-center">
                  <h3 className="font-medium text-foreground text-sm sm:text-base">No patients found</h3>
                  {(searchTerm || riskFilter !== "all" || statusFilter !== "all") ? (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      No patients match your current filters. Try adjusting your search criteria.
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      There are currently no patients requiring follow-up care.
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {(searchTerm || riskFilter !== "all" || statusFilter !== "all") && (
                    <Button 
                      onClick={() => {
                        clearSearch();
                        setRiskFilter("all");
                        setStatusFilter("all");
                        toast({
                          title: 'Filters Cleared',
                          description: 'All filters have been reset. Showing all patients.',
                        });
                      }} 
                      variant="outline" 
                      size="sm"
                      className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                    >
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                  <Button onClick={async () => {
                    const result = await refetch();
                    if (result.data && !result.error) {
                      toast({
                        title: 'Data Refreshed',
                        description: `Successfully refreshed ${result.data.length} patient records.`,
                      });
                    }
                  }} variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9">
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            )}

            {/* Patient List */}
            {!isLoading && !error && totalPatients > 0 && (
              <>
                <div className="space-y-3 sm:space-y-4">
                  {paginatedPatients.map((patient, index) => {
                    // Calculate risk factors for storytelling
                    const daysSinceDischarge = patient.daysSinceDischarge || Math.floor((new Date().getTime() - new Date(patient.discharge_date).getTime()) / (1000 * 60 * 60 * 24));
                    const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
                    const isHighRisk = patient.leakageRisk.level === 'high';
                    const potentialRevenueLoss = isHighRisk ? 18.5 : patient.leakageRisk.level === 'medium' ? 12.0 : 6.0;
                    
                    // Generate AI insight based on patient data
                    const getAIInsight = (patient: Patient) => {
                      if (patient.leakageRisk.score >= 80) {
                        return `🚨 Critical: ${age}yr old, ${daysSinceDischarge}d post-discharge. Immediate intervention needed.`;
                      } else if (patient.leakageRisk.score >= 60) {
                        return `⚠️ Moderate risk: Complex case requiring specialized follow-up within 48hrs.`;
                      } else {
                        return `✅ Low risk: Standard follow-up protocol. Monitor for changes.`;
                      }
                    };

                    return (
                <div
                  key={patient.id}
                  ref={setItemRef(index)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${patient.name}, ${patient.diagnosis}, Risk: ${patient.leakageRisk.score}%`}
                  className={`group relative rounded-lg border transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:shadow-md ${
                    isHighRisk 
                      ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10' 
                      : patient.leakageRisk.level === 'medium'
                      ? 'border-amber-300/30 bg-amber-50/50 hover:bg-amber-50/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
                      : 'border-border bg-card hover:bg-accent/50'
                  } ${
                    recentlyUpdated.has(patient.id) ? 'ring-2 ring-primary/20 shadow-sm' : ''
                  } ${
                    selectedIndex === index ? 'ring-2 ring-primary/50 shadow-md' : ''
                  }`}
                  onClick={() => {
                    setSelectedPatient(patient);
                    trackPatientAction('view');
                    trackFlow('patient_selected', 'patient_management');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPatient(patient);
                      trackPatientAction('view');
                      trackFlow('patient_selected', 'patient_management');
                    }
                  }}
                  onFocus={() => setSelectedIndex(index)}
                >
                  {/* Priority indicator for high-risk patients */}
                  {isHighRisk && (
                    <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full shadow-sm z-10">
                      PRIORITY
                    </div>
                  )}

                  <div className="p-3 sm:p-4 space-y-3">
                    {/* Header with patient info and risk badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                            {patient.name}
                          </h3>
                          {recentlyUpdated.has(patient.id) && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                              Updated
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mb-1">
                          {patient.diagnosis}
                        </p>
                        
                        {/* Mobile-optimized info layout */}
                        {isMobileScreen ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Age: {age}</span>
                              <span className="font-medium text-primary">
                                ${potentialRevenueLoss}K at risk
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Discharged: {daysSinceDischarge}d ago</span>
                              <span>•</span>
                              <span className="font-medium">{patient.insurance}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Age: {age}</span>
                            <span>•</span>
                            <span>Discharged: {daysSinceDischarge}d ago</span>
                            <span>•</span>
                            <span className="font-medium">{patient.insurance}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant={getRiskBadgeVariant(patient.leakageRisk.level)}
                          className={`text-xs font-bold transition-all duration-300 ${
                            patient.leakageRisk.level === 'high' ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse' : ''
                          } ${
                            patient.leakageRisk.level === 'medium' ? 'bg-amber-500 text-amber-50 border-amber-500' : ''
                          } ${
                            patient.leakageRisk.level === 'low' ? 'bg-green-500 text-green-50 border-green-500' : ''
                          }`}
                        >
                          {isMobileScreen ? `${patient.leakageRisk.score}%` : `${patient.leakageRisk.score}% RISK`}
                        </Badge>
                        {!isMobileScreen && (
                          <div className="text-xs text-right text-muted-foreground">
                            <div className="font-medium text-primary">
                              ${potentialRevenueLoss}K at risk
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Insight Panel */}
                    <div className={`rounded-md p-3 text-xs ${
                      isHighRisk 
                        ? 'bg-destructive/10 border border-destructive/20' 
                        : patient.leakageRisk.level === 'medium'
                        ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
                        : 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900'
                    }`}>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground mb-1">AI Analysis:</p>
                          <p className={`leading-relaxed ${
                            isHighRisk ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            {getAIInsight(patient)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Service needed and current status */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate mb-1">
                          Needs: {patient.required_followup}
                        </p>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(patient.referral_status)}
                          <span className="text-xs text-muted-foreground">
                            {getStatusText(patient.referral_status)}
                          </span>
                          {patient.referral_status === 'needed' && isHighRisk && (
                            <span className="text-xs text-destructive font-medium animate-pulse">
                              • Action Required
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        variant={isHighRisk ? "default" : "outline"}
                        size="sm"
                        className={`text-xs px-3 py-1 h-7 flex-shrink-0 transition-all touch-target ${
                          isHighRisk ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''
                        } ${isMobileScreen ? 'min-w-[80px]' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatient(patient);
                        }}
                      >
                        {isMobileScreen ? (isHighRisk ? 'Urgent' : 'View') : (isHighRisk ? 'Urgent Action' : 'View Plan')}
                      </Button>
                    </div>

                    {/* Time-sensitive indicator for high-risk patients */}
                    {isHighRisk && daysSinceDischarge >= 3 && (
                      <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-md p-2 border border-destructive/20">
                        <Clock className="h-3 w-3 animate-pulse" />
                        <span className="font-medium">
                          Time-sensitive: {daysSinceDischarge} days without follow-up care
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                    );
                  })}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalPatients)} of {totalPatients} patients
                    </div>
                    
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => {
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                                // Reset keyboard navigation selection
                                setSelectedIndex(-1);
                              }
                            }}
                            className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {/* Page Numbers */}
                        {(() => {
                          const pages = [];
                          const showEllipsis = totalPages > 7;
                          
                          if (!showEllipsis) {
                            // Show all pages if 7 or fewer
                            for (let i = 1; i <= totalPages; i++) {
                              pages.push(
                                <PaginationItem key={i}>
                                  <PaginationLink
                                    onClick={() => {
                                      setCurrentPage(i);
                                      setSelectedIndex(-1);
                                    }}
                                    isActive={currentPage === i}
                                    className="cursor-pointer"
                                  >
                                    {i}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                          } else {
                            // Show ellipsis for many pages
                            // Always show first page
                            pages.push(
                              <PaginationItem key={1}>
                                <PaginationLink
                                  onClick={() => {
                                    setCurrentPage(1);
                                    setSelectedIndex(-1);
                                  }}
                                  isActive={currentPage === 1}
                                  className="cursor-pointer"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                            );
                            
                            // Show ellipsis if current page is far from start
                            if (currentPage > 3) {
                              pages.push(
                                <PaginationItem key="ellipsis-start">
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            
                            // Show pages around current page
                            const start = Math.max(2, currentPage - 1);
                            const end = Math.min(totalPages - 1, currentPage + 1);
                            
                            for (let i = start; i <= end; i++) {
                              pages.push(
                                <PaginationItem key={i}>
                                  <PaginationLink
                                    onClick={() => {
                                      setCurrentPage(i);
                                      setSelectedIndex(-1);
                                    }}
                                    isActive={currentPage === i}
                                    className="cursor-pointer"
                                  >
                                    {i}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                            
                            // Show ellipsis if current page is far from end
                            if (currentPage < totalPages - 2) {
                              pages.push(
                                <PaginationItem key="ellipsis-end">
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            
                            // Always show last page
                            if (totalPages > 1) {
                              pages.push(
                                <PaginationItem key={totalPages}>
                                  <PaginationLink
                                    onClick={() => {
                                      setCurrentPage(totalPages);
                                      setSelectedIndex(-1);
                                    }}
                                    isActive={currentPage === totalPages}
                                    className="cursor-pointer"
                                  >
                                    {totalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                          }
                          
                          return pages;
                        })()}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => {
                              if (currentPage < totalPages) {
                                setCurrentPage(currentPage + 1);
                                // Reset keyboard navigation selection
                                setSelectedIndex(-1);
                              }
                            }}
                            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Impact Story Footer */}
        <div className="mt-8 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 rounded-lg p-4 sm:p-6 border border-slate-200 dark:border-slate-800">
          <div className="text-center">
            <h3 className="font-bold text-lg text-foreground mb-2">
              🚀 Brenda's AI-Powered Impact Today
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-primary">
                  {sortedPatients.filter(p => p.leakageRisk.level === 'high').length}
                </div>
                <div className="text-muted-foreground">High-risk patients identified</div>
              </div>
              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-green-600">
                  20x
                </div>
                <div className="text-muted-foreground">Faster than manual process</div>
              </div>
              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-blue-600">
                  ${((sortedPatients.filter(p => p.leakageRisk.level === 'high').length) * 18.5).toFixed(0)}K
                </div>
                <div className="text-muted-foreground">Revenue protected</div>
              </div>
              <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-purple-600">
                  85%
                </div>
                <div className="text-muted-foreground">Patient retention rate</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              💡 <strong>The Brenda Effect:</strong> What used to take 8 hours of manual work now happens in 15 minutes with AI assistance
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
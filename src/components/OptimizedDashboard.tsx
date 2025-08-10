/**
 * Optimized Dashboard component with performance enhancements
 * Implements sub-3-second load times through various optimization techniques
 */

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCircle, Clock, AlertCircle, CheckCircle2, Loader2, RefreshCw, Search, Filter, Wifi, X } from "lucide-react";
import { PatientDetailContainer } from "./PatientDetailContainer";
import { NotificationCenter } from "./NotificationCenter";
import { NetworkStatusIndicator } from "./NetworkStatusIndicator";
import { OfflineStatusPanel } from "./OfflineIndicator";
import { usePatients } from "@/hooks/use-patients";
import { Patient, PatientFilters } from "@/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useListKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { startTiming, endTiming, measureAsync } from "@/lib/performance-monitor";

// Memoized components for better performance
const PatientCard = memo(({ 
  patient, 
  isSelected, 
  isRecentlyUpdated, 
  onClick, 
  onKeyDown,
  itemRef 
}: {
  patient: Patient;
  isSelected: boolean;
  isRecentlyUpdated: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  itemRef: (el: HTMLDivElement | null) => void;
}) => {
  const getRiskBadgeVariant = useCallback((level: string) => {
    switch (level) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "default";
      default: return "default";
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case "needed": return <AlertCircle className="h-4 w-4 text-warning" />;
      case "sent": return <Clock className="h-4 w-4 text-primary" />;
      case "scheduled": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "completed": return <CheckCircle2 className="h-4 w-4 text-success" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case "needed": return "Referral Needed";
      case "sent": return "Referral Sent";
      case "scheduled": return "Scheduled";
      case "completed": return "Completed";
      default: return "Unknown";
    }
  }, []);

  return (
    <Card 
      ref={itemRef}
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${
        isRecentlyUpdated ? 'ring-2 ring-amber-400 ring-offset-2 animate-pulse' : ''
      }`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for patient ${patient.name}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <UserCircle className="h-10 w-10 text-muted-foreground" />
              {isRecentlyUpdated && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>
              )}
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {patient.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {patient.diagnosis} • Age {patient.age}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={getRiskBadgeVariant(patient.leakageRisk.level)}
              className="font-medium"
            >
              {patient.leakageRisk.level.toUpperCase()} RISK
            </Badge>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {patient.leakageRisk.score}
              </div>
              <div className="text-xs text-muted-foreground">
                Risk Score
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {getStatusIcon(patient.referral_status)}
              <span>{getStatusText(patient.referral_status)}</span>
            </div>
            <div>
              <span className="font-medium">Service:</span> {patient.required_followup}
            </div>
            <div>
              <span className="font-medium">Insurance:</span> {patient.insurance}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

PatientCard.displayName = 'PatientCard';

// Memoized search and filter controls
const SearchAndFilters = memo(({ 
  searchTerm,
  setSearchTerm,
  riskFilter,
  setRiskFilter,
  statusFilter,
  setStatusFilter,
  isLoading,
  isError,
  isSearching,
  clearSearch,
  onSearchKeyDown,
  onFilterChange
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  riskFilter: string;
  setRiskFilter: (filter: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  isLoading: boolean;
  isError: boolean;
  isSearching: boolean;
  clearSearch: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
  onFilterChange: (type: 'risk' | 'status', value: string) => void;
}) => (
  <div className="flex flex-col gap-3 mb-4">
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search patients by name, diagnosis, or service... (Press / to focus)"
        className="pl-8 pr-20 text-sm sm:text-base"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={isLoading || isError}
        onKeyDown={onSearchKeyDown}
      />
      
      {isSearching && (
        <div className="absolute right-12 top-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      
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
        onValueChange={(value) => onFilterChange('risk', value)}
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
        onValueChange={(value) => onFilterChange('status', value)}
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
));

SearchAndFilters.displayName = 'SearchAndFilters';

export const OptimizedDashboard = memo(() => {
  console.log('OptimizedDashboard: Component rendered');
  
  // Performance monitoring
  useEffect(() => {
    startTiming('optimized-dashboard-render');
    return () => {
      endTiming('optimized-dashboard-render');
    };
  }, []);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [realtimeActive, setRealtimeActive] = useState<boolean>(true);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [patientsPerPage] = useState<number>(10);
  const prevPatientsRef = useRef<Patient[] | undefined>();
  const { toast } = useToast();
  
  // Optimized search state with debouncing
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Debounce search term with performance monitoring
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      measureAsync('search-debounce', async () => {
        setDebouncedSearchTerm(searchTerm);
        setIsSearching(false);
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);
  
  // Optimized filters object
  const filters: PatientFilters = useMemo(() => {
    const result: PatientFilters = {};
    
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
  
  // Optimized patient list processing
  const sortedPatients = useMemo(() => {
    return Array.isArray(patients) ? patients : [];
  }, [patients]);

  // Pagination logic
  const totalPatients = sortedPatients.length;
  const totalPages = Math.ceil(totalPatients / patientsPerPage);
  const startIndex = (currentPage - 1) * patientsPerPage;
  const endIndex = startIndex + patientsPerPage;
  const paginatedPatients = useMemo(() => 
    sortedPatients.slice(startIndex, endIndex),
    [sortedPatients, startIndex, endIndex]
  );

  // Optimized event handlers
  const handleFilterChange = useCallback((type: 'risk' | 'status', value: string) => {
    if (type === 'risk') {
      setRiskFilter(value);
    } else {
      setStatusFilter(value);
    }
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && searchTerm) {
      clearSearch();
    } else if (e.key === 'ArrowDown' && sortedPatients.length > 0) {
      e.preventDefault();
      // Focus first patient card
    }
  }, [searchTerm, clearSearch, sortedPatients.length]);

  // Keyboard navigation for patient list
  const {
    selectedIndex,
    setSelectedIndex,
    focusItem,
    setItemRef,
  } = useListKeyboardNavigation(
    paginatedPatients,
    useCallback((patient: Patient) => {
      setSelectedPatient(patient);
    }, [])
  );

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

  // Show patient detail if selected
  if (selectedPatient) {
    return (
      <PatientDetailContainer 
        patientId={selectedPatient.id} 
        onBack={() => setSelectedPatient(null)}
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
          
          <NetworkStatusIndicator className="mt-2" />
          <OfflineStatusPanel className="mt-2" />
          
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
          {/* Story-driven header */}
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
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-destructive">
                  ${((sortedPatients.filter(p => p.leakageRisk.level === 'high').length) * 18.5).toFixed(0)}K
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Revenue at risk <span className="font-semibold text-destructive">today</span>
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
          
          <SearchAndFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            riskFilter={riskFilter}
            setRiskFilter={setRiskFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            isLoading={isLoading}
            isError={isError}
            isSearching={isSearching}
            clearSearch={clearSearch}
            onSearchKeyDown={handleSearchKeyDown}
            onFilterChange={handleFilterChange}
          />
          
          {/* Patient List */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-full"></div>
                        <div>
                          <div className="h-4 w-32 bg-muted rounded mb-1"></div>
                          <div className="h-3 w-48 bg-muted rounded"></div>
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-muted rounded"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-24 bg-muted rounded"></div>
                        <div className="h-4 w-32 bg-muted rounded"></div>
                      </div>
                      <div className="h-8 w-24 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedPatients.map((patient, index) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    isSelected={selectedIndex === index}
                    isRecentlyUpdated={recentlyUpdated.has(patient.id)}
                    onClick={() => setSelectedPatient(patient)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPatient(patient);
                      }
                    }}
                    itemRef={(el) => setItemRef(index, el)}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      {totalPages > 5 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

OptimizedDashboard.displayName = 'OptimizedDashboard';
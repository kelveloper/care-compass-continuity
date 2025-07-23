import { Patient as DBPatient, Provider as DBProvider } from "@/integrations/supabase/types";

// Enhanced Patient interface with computed fields for frontend
export interface Patient extends DBPatient {
  // Computed fields
  age?: number;
  daysSinceDischarge?: number;
  leakageRisk: {
    score: number;
    level: "low" | "medium" | "high";
    factors?: RiskFactors;
  };
}

// Enhanced Provider interface with computed fields for frontend
export interface Provider extends DBProvider {
  // Computed fields for matching
  distance?: string;
  matchScore?: number;
  inNetwork?: boolean;
  specialtyMatch?: boolean;
  availabilityScore?: number;
  availability?: string; // Next available appointment time
  address?: string;     // Formatted address string
}

// Provider matching result with explanation
export interface ProviderMatch {
  provider: Provider;
  matchScore: number;
  distance: number;
  inNetwork: boolean;
  explanation: {
    distanceScore: number;
    insuranceScore: number;
    availabilityScore: number;
    specialtyScore: number;
    ratingScore: number;
    reasons: string[];
  };
}

// Risk calculation factors
export interface RiskFactors {
  age: number;
  diagnosisComplexity: number;
  timeSinceDischarge: number;
  insuranceType: number;
  geographicFactors: number;
  previousReferralHistory?: number;
}

// Referral tracking
export interface ReferralStatus {
  id: string;
  patientId: string;
  providerId: string;
  status: "needed" | "sent" | "scheduled" | "completed";
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
}

// API response types
export interface PatientsResponse {
  data: Patient[];
  count: number;
  error?: string;
}

export interface ProvidersResponse {
  data: Provider[];
  count: number;
  error?: string;
}
// Searc
h and filter types
export interface PatientFilters {
  riskLevel?: "low" | "medium" | "high";
  referralStatus?: "needed" | "sent" | "scheduled" | "completed";
  insurance?: string;
  diagnosis?: string;
  search?: string;
}

export interface ProviderFilters {
  type?: string;
  insurance?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in miles
  };
  rating?: number;
  availability?: boolean;
}

// Component prop types
export interface DashboardProps {
  patients?: Patient[];
  loading?: boolean;
  error?: string;
}

export interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export interface ProviderMatchProps {
  patientInsurance: string;
  patientAddress: string;
  requiredSpecialty: string;
  onProviderSelected: (provider: Provider) => void;
  onCancel: () => void;
}

// Hook return types
export interface UsePatientReturn {
  /** Patient data or null if not found/not loaded */
  data: Patient | null | undefined;
  /** Loading state - true when fetching data */
  isLoading: boolean;
  /** Error state - contains error message if request failed */
  error: Error | null;
  /** Function to manually refetch the data */
  refetch: () => void;
  /** True if this is the initial load */
  isInitialLoading: boolean;
  /** True if data is being refetched in the background */
  isFetching: boolean;
  /** True if the patient was not found */
  isNotFound: boolean;
}

export interface UsePatientsReturn {
  /** Array of patients sorted by leakage risk score (highest first) */
  data: Patient[] | undefined;
  /** Loading state - true when fetching data */
  isLoading: boolean;
  /** Error state - contains error message if request failed */
  error: Error | null;
  /** Function to manually refetch the data */
  refetch: () => void;
  /** True if this is the initial load */
  isInitialLoading: boolean;
  /** True if data is being refetched in the background */
  isFetching: boolean;
}

export interface UseProviderMatchReturn {
  /** Current provider matches for the last search */
  matches: ProviderMatch[];
  /** True when actively finding matches */
  isMatching: boolean;
  /** Error message from matching process or provider loading */
  error: string | null;
  
  /** All available providers */
  providers: Provider[];
  /** True when loading providers */
  providersLoading: boolean;
  /** Error message from provider loading */
  providersError: string | null;
  
  /** Find matching providers for a patient */
  findMatches: (patient: Patient, serviceType?: string, limit?: number) => Promise<ProviderMatch[]>;
  /** Find providers by specific criteria */
  findProvidersByCriteria: (criteria: {
    specialty?: string;
    insurance?: string;
    maxDistance?: number;
    patientLocation?: { lat: number; lng: number };
    minRating?: number;
  }) => Promise<Provider[]>;
  /** Get top providers for a service type */
  getTopProviders: (serviceType: string, limit?: number) => Provider[];
  /** Clear current matches */
  clearMatches: () => void;
  /** Refresh provider data */
  refreshProviders: () => Promise<any>;
  
  /** True if providers are available */
  hasProviders: boolean;
  /** True if hook is ready to perform matching */
  isReady: boolean;
}
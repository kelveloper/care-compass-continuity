import { usePatient } from "@/hooks/use-patients";
import { PatientDetailView } from "./PatientDetailView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PatientDetailContainerProps {
  patientId: string;
  onBack: () => void;
}

/**
 * Container component that demonstrates the usePatient hook usage
 * Handles loading states, error states, and missing data gracefully
 */
export const PatientDetailContainer = ({ patientId, onBack }: PatientDetailContainerProps) => {
  console.log('PatientDetailContainer: Rendered with patientId:', patientId);
  
  const { data: patient, isLoading, error, refetch } = usePatient(patientId);
  
  console.log('PatientDetailContainer: Patient data state:', {
    patient: patient ? { id: patient.id, name: patient.name } : null,
    isLoading,
    error: error?.message
  });
  
  // Check if patient was not found based on error message
  const isNotFound = error?.message.includes('not found') ?? false;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 self-start">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="flex-1 min-w-0">
                <div className="h-6 sm:h-7 w-48 sm:w-64 bg-muted rounded mb-2 animate-pulse"></div>
                <div className="h-4 sm:h-5 w-36 sm:w-48 bg-muted rounded animate-pulse"></div>
              </div>
              <div className="h-6 sm:h-8 w-24 sm:w-32 bg-muted rounded-full animate-pulse self-start sm:self-center"></div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Patient Summary Panel Skeleton */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="lg:sticky lg:top-8">
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="p-4 sm:p-6">
                    <div className="h-5 sm:h-6 w-32 sm:w-40 bg-muted rounded mb-4 sm:mb-6 animate-pulse"></div>
                    <div className="space-y-4 sm:space-y-6">
                      {[...Array(8)].map((_, i) => (
                        <div key={i}>
                          <div className="h-3 sm:h-4 w-24 sm:w-32 bg-muted rounded mb-2 animate-pulse"></div>
                          <div className="h-4 sm:h-5 w-36 sm:w-48 bg-muted rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area Skeleton */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-1 lg:order-2">
              {/* Referral Management Skeleton */}
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div className="h-5 sm:h-6 w-36 sm:w-48 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 sm:h-9 w-28 sm:w-36 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="h-16 sm:h-20 bg-muted rounded animate-pulse"></div>
                </div>
              </div>
              
              {/* Risk Analysis Skeleton */}
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-4 sm:p-6">
                  <div className="h-5 sm:h-6 w-28 sm:w-32 bg-muted rounded mb-4 sm:mb-6 animate-pulse"></div>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 sm:h-4 w-12 sm:w-16 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 sm:h-4 w-24 sm:w-32 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 sm:h-4 w-10 sm:w-12 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 sm:h-4 w-22 sm:w-28 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 sm:h-4 w-11 sm:w-14 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Timeline Skeleton */}
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div className="h-5 sm:h-6 w-32 sm:w-40 bg-muted rounded animate-pulse"></div>
                    <div className="h-7 sm:h-8 w-16 sm:w-20 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3 sm:gap-4">
                        <div className="h-6 w-6 sm:h-8 sm:w-8 bg-muted rounded-full animate-pulse flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="h-3 sm:h-4 w-24 sm:w-32 bg-muted rounded mb-2 animate-pulse"></div>
                          <div className="h-3 w-32 sm:w-48 bg-muted rounded animate-pulse"></div>
                        </div>
                        <div className="h-3 w-12 sm:w-16 bg-muted rounded animate-pulse flex-shrink-0"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Patient not found state
  if (isNotFound) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Patient Not Found</h1>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The patient with ID "{patientId}" could not be found. They may have been removed or the ID may be incorrect.
            </AlertDescription>
          </Alert>
          
          <div className="mt-6">
            <Button onClick={onBack}>Return to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // General error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Error Loading Patient</h1>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message || "An unexpected error occurred while loading the patient information."}
            </AlertDescription>
          </Alert>
          
          <div className="mt-6 flex gap-3">
            <Button onClick={() => refetch()}>Try Again</Button>
            <Button variant="outline" onClick={onBack}>Return to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // No patient data (shouldn't happen if not loading and no error, but handle gracefully)
  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">No Patient Data</h1>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No patient data is available at this time. Please try refreshing or return to the dashboard.
            </AlertDescription>
          </Alert>
          
          <div className="mt-6 flex gap-3">
            <Button onClick={() => refetch()}>Refresh</Button>
            <Button variant="outline" onClick={onBack}>Return to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - render the patient detail view with the enhanced patient data
  // The patient data from usePatient is already enhanced with computed fields
  return <PatientDetailView patient={patient} onBack={onBack} />;
};
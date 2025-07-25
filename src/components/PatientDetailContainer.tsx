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
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Loading Patient...</h1>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading patient information...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Patient not found state
  if (isNotFound) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Patient Not Found</h1>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-8">
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
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Error Loading Patient</h1>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-8">
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
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-foreground">No Patient Data</h1>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-8">
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
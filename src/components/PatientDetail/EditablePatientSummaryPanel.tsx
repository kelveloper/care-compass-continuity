import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CreditCard, MapPin, Save, Edit, X } from "lucide-react";
import { Patient, PatientUpdate } from "@/types";
import { usePatientUpdateTyped } from "@/hooks/use-patient-update";
import { useOptimisticUpdates } from "@/hooks/use-optimistic-updates";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EditablePatientSummaryPanelProps {
  patient: Patient;
  onPatientUpdated?: (updatedPatient: Patient) => void;
}

export const EditablePatientSummaryPanel = ({ 
  patient,
  onPatientUpdated
}: EditablePatientSummaryPanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState<PatientUpdate>({});
  const { updatePatient, isUpdating, error } = usePatientUpdateTyped();
  const { toast } = useToast();
  
  // Use optimistic updates for better UX
  const { 
    updatePatientInfo: updatePatientInfoOptimistic,
    isUpdatingPatient: isUpdatingPatientOptimistic 
  } = useOptimisticUpdates();

  // Show skeleton if patient data is not fully loaded
  if (!patient || !patient.id) {
    return <EditablePatientSummaryPanelSkeleton />;
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form
      setEditedPatient({});
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field: keyof PatientUpdate, value: string) => {
    setEditedPatient(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (Object.keys(editedPatient).length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      // Use optimistic updates for immediate feedback
      const updatedPatient = await updatePatientInfoOptimistic({
        patientId: patient.id,
        updates: editedPatient
      });

      setIsEditing(false);
      setEditedPatient({});
      
      // Show success toast notification
      toast({
        title: "Patient Information Updated",
        description: "Changes have been saved successfully.",
      });
      
      if (onPatientUpdated) {
        onPatientUpdated(updatedPatient);
      }
    } catch (err) {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update patient information.",
        variant: "destructive",
      });
    }
  };

  // Helper to get the current value (edited or original)
  const getValue = (field: keyof PatientUpdate) => {
    return editedPatient[field] !== undefined 
      ? editedPatient[field] 
      : patient[field as keyof Patient];
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM/dd/yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="lg:sticky lg:top-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Patient Summary
          </CardTitle>
          <Button
            variant={isEditing ? "destructive" : "outline"}
            size="sm"
            onClick={handleEditToggle}
            className="gap-1 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
          >
            {isEditing ? (
              <>
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">✕</span>
              </>
            ) : (
              <>
                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Edit</span>
                <span className="sm:hidden">✎</span>
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-6">
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Full Name
            </p>
            {isEditing ? (
              <Input
                value={getValue("name") as string}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="mt-1 text-sm sm:text-base h-8 sm:h-9"
              />
            ) : (
              <p className="text-sm sm:text-base text-foreground font-semibold">{patient.name}</p>
            )}
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Date of Birth
            </p>
            {isEditing ? (
              <Input
                type="date"
                value={getValue("date_of_birth") as string}
                onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                className="mt-1 text-sm sm:text-base h-8 sm:h-9"
              />
            ) : (
              <p className="text-sm sm:text-base text-foreground">
                {formatDate(patient.date_of_birth)}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Age</p>
            <p className="text-sm sm:text-base text-foreground">{patient.age} years</p>
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Diagnosis
            </p>
            {isEditing ? (
              <Input
                value={getValue("diagnosis") as string}
                onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                className="mt-1 text-sm sm:text-base h-8 sm:h-9"
              />
            ) : (
              <p className="text-sm sm:text-base text-foreground">{patient.diagnosis}</p>
            )}
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Discharge Date
            </p>
            {isEditing ? (
              <Input
                type="date"
                value={getValue("discharge_date") as string}
                onChange={(e) => handleInputChange("discharge_date", e.target.value)}
                className="mt-1 text-sm sm:text-base h-8 sm:h-9"
              />
            ) : (
              <p className="text-sm sm:text-base text-foreground">
                {formatDate(patient.discharge_date)}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Days Since Discharge
            </p>
            <p className="text-sm sm:text-base text-foreground">{patient.daysSinceDischarge} days</p>
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Required Follow-up
            </p>
            {isEditing ? (
              <Input
                value={getValue("required_followup") as string}
                onChange={(e) => handleInputChange("required_followup", e.target.value)}
                className="mt-1 text-sm sm:text-base h-8 sm:h-9"
              />
            ) : (
              <p className="text-sm sm:text-base text-foreground">{patient.required_followup}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Insurance
              </p>
              {isEditing ? (
                <Input
                  value={getValue("insurance") as string}
                  onChange={(e) => handleInputChange("insurance", e.target.value)}
                  className="mt-1 text-sm sm:text-base h-8 sm:h-9"
                />
              ) : (
                <p className="text-sm sm:text-base text-foreground">{patient.insurance}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Home Address
              </p>
              {isEditing ? (
                <Input
                  value={getValue("address") as string}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="mt-1 text-sm sm:text-base h-8 sm:h-9"
                />
              ) : (
                <p className="text-xs sm:text-sm text-foreground break-words">{patient.address}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="pt-2">
              <Button 
                onClick={handleSave} 
                disabled={isUpdating || isUpdatingPatientOptimistic || Object.keys(editedPatient).length === 0}
                className="w-full gap-2 text-sm sm:text-base h-8 sm:h-9"
              >
                <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const EditablePatientSummaryPanelSkeleton = () => (
  <div className="sticky top-8">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Patient Summary
        </CardTitle>
        <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
      </CardHeader>
      <CardContent className="space-y-4 animate-pulse">
        {/* Patient fields skeleton */}
        {[...Array(8)].map((_, index) => (
          <div key={index}>
            <div className="h-4 w-24 bg-muted rounded mb-2"></div>
            <div className="h-5 w-full bg-muted rounded"></div>
          </div>
        ))}
        
        {/* Insurance field with icon */}
        <div className="flex items-start gap-2">
          <div className="h-4 w-4 bg-muted rounded mt-1"></div>
          <div className="flex-1">
            <div className="h-4 w-20 bg-muted rounded mb-2"></div>
            <div className="h-5 w-full bg-muted rounded"></div>
          </div>
        </div>
        
        {/* Address field with icon */}
        <div className="flex items-start gap-2">
          <div className="h-4 w-4 bg-muted rounded mt-1"></div>
          <div className="flex-1">
            <div className="h-4 w-28 bg-muted rounded mb-2"></div>
            <div className="h-5 w-full bg-muted rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
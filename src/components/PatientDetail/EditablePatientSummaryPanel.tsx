import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CreditCard, MapPin, Save, Edit, X } from "lucide-react";
import { Patient, PatientUpdate } from "@/types";
import { usePatientUpdateTyped } from "@/hooks/use-patient-update";
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
      const updatedPatient = await updatePatient({
        patientId: patient.id,
        updates: editedPatient
      });

      toast({
        title: "Patient Updated",
        description: "Patient information has been successfully updated.",
      });

      setIsEditing(false);
      setEditedPatient({});
      
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
    <div className="sticky top-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Patient Summary
          </CardTitle>
          <Button
            variant={isEditing ? "destructive" : "outline"}
            size="sm"
            onClick={handleEditToggle}
            className="gap-1"
          >
            {isEditing ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Edit
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Full Name
            </p>
            {isEditing ? (
              <Input
                value={getValue("name") as string}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-foreground font-semibold">{patient.name}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Date of Birth
            </p>
            {isEditing ? (
              <Input
                type="date"
                value={getValue("date_of_birth") as string}
                onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-foreground">
                {formatDate(patient.date_of_birth)}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Age</p>
            <p className="text-foreground">{patient.age} years</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Diagnosis
            </p>
            {isEditing ? (
              <Input
                value={getValue("diagnosis") as string}
                onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-foreground">{patient.diagnosis}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Discharge Date
            </p>
            {isEditing ? (
              <Input
                type="date"
                value={getValue("discharge_date") as string}
                onChange={(e) => handleInputChange("discharge_date", e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-foreground">
                {formatDate(patient.discharge_date)}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Days Since Discharge
            </p>
            <p className="text-foreground">{patient.daysSinceDischarge} days</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Required Follow-up
            </p>
            {isEditing ? (
              <Input
                value={getValue("required_followup") as string}
                onChange={(e) => handleInputChange("required_followup", e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-foreground">{patient.required_followup}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Insurance
              </p>
              {isEditing ? (
                <Input
                  value={getValue("insurance") as string}
                  onChange={(e) => handleInputChange("insurance", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground">{patient.insurance}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Home Address
              </p>
              {isEditing ? (
                <Input
                  value={getValue("address") as string}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground text-sm">{patient.address}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="pt-2">
              <Button 
                onClick={handleSave} 
                disabled={isUpdating || Object.keys(editedPatient).length === 0}
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
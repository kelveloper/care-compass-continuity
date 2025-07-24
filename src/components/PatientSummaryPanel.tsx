
import React from "react";
import { Patient } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreditCard, MapPin, Calendar } from "lucide-react";


const PatientSummaryPanel = ({ patient }: { patient: Patient }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Patient Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Full Name</p>
          <p className="text-foreground font-semibold">{patient.name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
          <p className="text-foreground">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Age</p>
          <p className="text-foreground">{patient.age} years</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
          <p className="text-foreground">{patient.diagnosis}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Discharge Date</p>
          <p className="text-foreground">{new Date(patient.discharge_date).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Days Since Discharge</p>
          <p className="text-foreground">{patient.daysSinceDischarge} days</p>
        </div>
        <div className="flex items-start gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Insurance</p>
            <p className="text-foreground">{patient.insurance}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Home Address</p>
            <p className="text-foreground text-sm">{patient.address}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientSummaryPanel;

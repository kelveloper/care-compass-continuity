import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCircle, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { PatientDetailView } from "./PatientDetailView";

interface Patient {
  id: string;
  name: string;
  diagnosis: string;
  dischargeDate: string;
  requiredFollowup: string;
  leakageRisk: {
    score: number;
    level: "low" | "medium" | "high";
  };
  referralStatus: "needed" | "sent" | "scheduled" | "completed";
  insurance: string;
  address: string;
  dob: string;
}

const mockPatients: Patient[] = [
  {
    id: "1",
    name: "Jane Doe",
    diagnosis: "Total Knee Replacement",
    dischargeDate: "2024-01-15",
    requiredFollowup: "Physical Therapy",
    leakageRisk: { score: 92, level: "high" },
    referralStatus: "needed",
    insurance: "Blue Cross Blue Shield",
    address: "123 Main St, Boston, MA 02101",
    dob: "1965-03-22"
  },
  {
    id: "2",
    name: "Robert Smith",
    diagnosis: "Cardiac Catheterization",
    dischargeDate: "2024-01-14",
    requiredFollowup: "Cardiology",
    leakageRisk: { score: 78, level: "medium" },
    referralStatus: "sent",
    insurance: "Medicare",
    address: "456 Oak Ave, Cambridge, MA 02139",
    dob: "1958-07-11"
  },
  {
    id: "3",
    name: "Maria Garcia",
    diagnosis: "Appendectomy",
    dischargeDate: "2024-01-13",
    requiredFollowup: "General Surgery",
    leakageRisk: { score: 25, level: "low" },
    referralStatus: "scheduled",
    insurance: "Aetna",
    address: "789 Pine St, Somerville, MA 02144",
    dob: "1982-11-30"
  },
  {
    id: "4",
    name: "William Johnson",
    diagnosis: "Hip Fracture Repair",
    dischargeDate: "2024-01-12",
    requiredFollowup: "Orthopedics + PT",
    leakageRisk: { score: 87, level: "high" },
    referralStatus: "needed",
    insurance: "United Healthcare",
    address: "321 Elm St, Brookline, MA 02446",
    dob: "1945-09-05"
  }
];

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
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  if (selectedPatient) {
    return (
      <PatientDetailView 
        patient={selectedPatient} 
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  // Sort patients by risk score (highest first)
  const sortedPatients = [...mockPatients].sort((a, b) => b.leakageRisk.score - a.leakageRisk.score);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Continuity</h1>
              <p className="text-muted-foreground">Care Coordination Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-muted-foreground" />
              <div className="text-right">
                <p className="font-medium text-foreground">Brenda Chen, RN</p>
                <p className="text-sm text-muted-foreground">Care Coordinator</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Your Patients</h2>
          <p className="text-muted-foreground">Prioritized by leakage risk - highest risk patients shown first</p>
        </div>

        {/* Patient Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Active Discharge Plans ({sortedPatients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{patient.name}</h3>
                      <p className="text-sm text-muted-foreground">{patient.diagnosis}</p>
                      <p className="text-xs text-muted-foreground">Discharged: {new Date(patient.dischargeDate).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{patient.requiredFollowup}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(patient.referralStatus)}
                        <span className="text-sm text-muted-foreground">{getStatusText(patient.referralStatus)}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={getRiskBadgeVariant(patient.leakageRisk.level)}
                          className={`
                            ${patient.leakageRisk.level === 'high' ? 'bg-risk-high-bg text-risk-high border-risk-high' : ''}
                            ${patient.leakageRisk.level === 'medium' ? 'bg-risk-medium-bg text-risk-medium border-risk-medium' : ''}
                            ${patient.leakageRisk.level === 'low' ? 'bg-risk-low-bg text-risk-low border-risk-low' : ''}
                          `}
                        >
                          {patient.leakageRisk.score}% Risk
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          {patient.leakageRisk.level}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    View Plan
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
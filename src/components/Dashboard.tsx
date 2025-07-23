import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCircle, Clock, AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { PatientDetailView } from "./PatientDetailView";
import { usePatients } from "@/hooks/use-patients";
import { Patient } from "@/types";

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
  const { data: patients, isLoading, error, refetch, isFetching } = usePatients();

  if (selectedPatient) {
    return (
      <PatientDetailView 
        patient={selectedPatient} 
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  // Patients are already sorted by leakage risk score in the hook
  const sortedPatients = patients || [];

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
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Loading patients...</span>
                </div>
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
                <Button onClick={() => refetch()} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && sortedPatients.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <UserCircle className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <h3 className="font-medium text-foreground">No patients found</h3>
                  <p className="text-sm text-muted-foreground">
                    There are currently no patients requiring follow-up care.
                  </p>
                </div>
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            )}

            {/* Patient List */}
            {!isLoading && !error && sortedPatients.length > 0 && (
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
                      <p className="text-xs text-muted-foreground">Discharged: {new Date(patient.discharge_date).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{patient.required_followup}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(patient.referral_status)}
                        <span className="text-sm text-muted-foreground">{getStatusText(patient.referral_status)}</span>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
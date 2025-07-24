import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProviderMatchCards } from "./ProviderMatchCards";
import {
  PatientSummaryPanel,
  ReferralManagement,
  RiskAnalysisCard,
  ReferralStatusTimeline,
  LoadingSkeleton,
  ErrorState,
} from "./PatientDetail";
import { useReferrals } from "@/hooks/use-referrals";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Patient, Provider, ReferralStatus } from "@/types";

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetailView = ({
  patient,
  onBack,
}: PatientDetailViewProps) => {
  const [showProviderMatch, setShowProviderMatch] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null
  );
  const [isCreatingReferral, setIsCreatingReferral] = useState(false);
  const [activeReferral, setActiveReferral] = useState<ReferralStatus | null>(
    null
  );
  const [history, setHistory] = useState<any[]>([]);
  const { toast } = useToast();

  const {
    isLoading,
    error,
    createReferral,
    scheduleReferral,
    completeReferral,
    cancelReferral,
    getPatientReferrals,
    getReferralById,
  } = useReferrals(patient.current_referral_id || undefined);

  useEffect(() => {
    const fetchPatientReferrals = async () => {
      if (!patient.id) return;

      try {
        const referrals = await getPatientReferrals(patient.id);
        const activeRef = referrals.find((ref) => ref.status !== "cancelled");

        if (activeRef) {
          setActiveReferral({
            id: activeRef.id,
            patientId: activeRef.patient_id,
            providerId: activeRef.provider_id,
            status: activeRef.status as any,
            createdAt: activeRef.created_at,
            updatedAt: activeRef.updated_at,
            scheduledDate: activeRef.scheduled_date,
            completedDate: activeRef.completed_date,
            notes: activeRef.notes || undefined,
          });

          setSelectedProvider({
            id: activeRef.provider_id,
            name: "Selected Provider",
            address: "Provider Address",
            availability: activeRef.scheduled_date
              ? format(
                  new Date(activeRef.scheduled_date),
                  "MMM d, yyyy 'at' h:mm a"
                )
              : "Pending",
            distance: "Pending",
          } as any);
        }
      } catch (err) {
        console.error("Error fetching patient referrals:", err);
        toast({
          title: "Error Loading Referrals",
          description: "Failed to load patient referrals. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchPatientReferrals();
  }, [patient.id, getPatientReferrals, toast]);

  const handleAddFollowupCare = () => setShowProviderMatch(true);

  const handleProviderSelected = (provider: Provider) => {
    setSelectedProvider(provider);
    setShowProviderMatch(false);
  };

  const handleSendReferral = async () => {
    if (!selectedProvider || !patient.id) return;

    setIsCreatingReferral(true);
    try {
      const newReferral = await createReferral(
        patient.id,
        selectedProvider.id,
        patient.required_followup.split("+")[0].trim()
      );

      if (newReferral) {
        setActiveReferral({
          id: newReferral.id,
          patientId: newReferral.patient_id,
          providerId: newReferral.provider_id,
          status: newReferral.status as any,
          createdAt: newReferral.created_at,
          updatedAt: newReferral.updated_at,
          notes: newReferral.notes || undefined,
        });

        toast({
          title: "Referral Sent",
          description: `Referral sent to ${selectedProvider.name}`,
        });
      }
    } catch (err) {
      toast({
        title: "Error Sending Referral",
        description: "Failed to send referral. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingReferral(false);
    }
  };

  const handleScheduleReferral = async () => {
    if (!activeReferral?.id) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDateStr = tomorrow.toISOString();

    const success = await scheduleReferral(
      activeReferral.id,
      scheduledDateStr,
      "Appointment scheduled by care coordinator"
    );

    if (success) {
      setActiveReferral({
        ...activeReferral,
        status: "scheduled",
        scheduledDate: scheduledDateStr,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleCompleteReferral = async () => {
    if (!activeReferral?.id) return;

    const success = await completeReferral(
      activeReferral.id,
      "Care completed by provider"
    );

    if (success) {
      setActiveReferral({
        ...activeReferral,
        status: "completed",
        completedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleCancelReferral = async () => {
    if (!activeReferral?.id) return;

    const success = await cancelReferral(
      activeReferral.id,
      "Referral cancelled by care coordinator"
    );

    if (success) {
      setActiveReferral(null);
      setSelectedProvider(null);
    }
  };

  const handleRetryLoad = () => {
    if (patient.current_referral_id) {
      getReferralById(patient.current_referral_id);
    }
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case "high":
        return "bg-risk-high-bg text-risk-high border-risk-high";
      case "medium":
        return "bg-risk-medium-bg text-risk-medium border-risk-medium";
      case "low":
        return "bg-risk-low-bg text-risk-low border-risk-low";
      default:
        return "";
    }
  };

  if (isLoading) {
    return <LoadingSkeleton onBack={onBack} />;
  }

  if (error) {
    return <ErrorState errorMessage={error.message} onBack={onBack} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                Discharge Plan: {patient.name}
              </h1>
              <p className="text-muted-foreground">{patient.diagnosis}</p>
            </div>
            <Badge
              className={`text-sm px-3 py-1 ${getRiskBadgeClass(
                patient.leakageRisk.level
              )}`}
            >
              {patient.leakageRisk.score}% Leakage Risk -{" "}
              {patient.leakageRisk.level.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PatientSummaryPanel patient={patient} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <ReferralManagement
              patient={patient}
              selectedProvider={selectedProvider}
              activeReferral={activeReferral}
              isLoading={isLoading}
              error={error}
              isCreatingReferral={isCreatingReferral}
              onAddFollowupCare={handleAddFollowupCare}
              onSendReferral={handleSendReferral}
              onScheduleReferral={handleScheduleReferral}
              onCompleteReferral={handleCompleteReferral}
              onCancelReferral={handleCancelReferral}
              onRetryLoad={handleRetryLoad}
            />

            {showProviderMatch && (
              <ProviderMatchCards
                patient={patient}
                onProviderSelected={handleProviderSelected}
                onCancel={() => setShowProviderMatch(false)}
              />
            )}

            <RiskAnalysisCard patient={patient} />

            <ReferralStatusTimeline
              selectedProvider={selectedProvider}
              activeReferral={activeReferral}
              isLoading={isLoading}
              error={error}
              history={history}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

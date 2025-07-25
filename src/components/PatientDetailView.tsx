import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProviderMatchCards } from "./ProviderMatchCards";
import {
  EditablePatientSummaryPanel,
  ReferralManagement,
  RiskAnalysisCard,
  ReferralStatusTimeline,
  LoadingSkeleton,
  ErrorState,
} from "./PatientDetail";
import { useReferrals } from "@/hooks/use-referrals-safe";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Patient, Provider, ReferralStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export interface PatientDetailViewProps {
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
    getReferralHistory,
  } = useReferrals(patient.current_referral_id || undefined);

  useEffect(() => {
    const fetchPatientReferrals = async () => {
      if (!patient.id) return;

      try {
        // Add error handling for getPatientReferrals
        let referrals = [];
        try {
          referrals = await getPatientReferrals(patient.id);
        } catch (err) {
          console.error("Error fetching patient referrals:", err);
          referrals = [];
        }
        
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

          // Fetch the provider details
          try {
            const { data: providerData } = await supabase
              .from('providers')
              .select('*')
              .eq('id', activeRef.provider_id)
              .single();
              
            if (providerData) {
              // Create a formatted availability string but don't add it directly to the provider object
              const formattedAvailability = activeRef.scheduled_date
                ? format(new Date(activeRef.scheduled_date), "MMM d, yyyy 'at' h:mm a")
                : "Pending";
                
              // Store the provider data with proper typing
              setSelectedProvider({
                ...providerData,
                // Only include properties that are part of the Provider interface
                distance: 0, // Set a default numeric value
                distanceText: "Pending", // We would calculate this in a real app
                // Store availability in availability_next which is part of the Provider interface
                availability_next: formattedAvailability
              });
            } else {
              // Fallback if provider not found - create a properly typed Provider object
              setSelectedProvider({
                id: activeRef.provider_id,
                name: "Selected Provider",
                type: "Unknown",
                address: "Provider Address",
                phone: "Unknown",
                specialties: [],
                accepted_insurance: [],
                rating: 0,
                in_network_plans: [],
                created_at: new Date().toISOString(),
                distance: 0,
                distanceText: "Pending",
                // Store availability in availability_next which is part of the Provider interface
                availability_next: activeRef.scheduled_date
                  ? format(new Date(activeRef.scheduled_date), "MMM d, yyyy 'at' h:mm a")
                  : "Pending"
              });
            }
          } catch (providerErr) {
            console.error("Error fetching provider details:", providerErr);
            // Fallback if provider fetch fails - create a properly typed Provider object
            setSelectedProvider({
              id: activeRef.provider_id,
              name: "Selected Provider",
              type: "Unknown",
              address: "Provider Address",
              phone: "Unknown",
              specialties: [],
              accepted_insurance: [],
              rating: 0,
              in_network_plans: [],
              created_at: new Date().toISOString(),
              distance: 0,
              distanceText: "Pending",
              // Store availability in availability_next which is part of the Provider interface
              availability_next: activeRef.scheduled_date
                ? format(new Date(activeRef.scheduled_date), "MMM d, yyyy 'at' h:mm a")
                : "Pending"
            });
          }
          
          // Fetch referral history
          const historyData = await getReferralHistory(activeRef.id);
          setHistory(historyData);
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
  }, [patient.id]); // Only depend on patient.id to prevent infinite loops

  const handleAddFollowupCare = () => setShowProviderMatch(true);

  const handleProviderSelected = (provider: any) => {
    try {
      // Ensure the provider object has the correct types for all properties
      const safeProvider: Provider = {
        ...provider,
        // Ensure required properties exist
        id: provider.id || 'unknown',
        name: provider.name || 'Unknown Provider',
        type: provider.type || 'Unknown',
        address: provider.address || 'Unknown Address',
        phone: provider.phone || 'Unknown',
        // Ensure distance is a number
        distance: typeof provider.distance === 'number' ? provider.distance : 0,
        // Add distanceText if it doesn't exist
        distanceText: provider.distanceText || (typeof provider.distance === 'number' ? `${provider.distance} miles` : 'Unknown'),
        // Ensure other properties have default values if missing
        rating: provider.rating || 0,
        specialties: provider.specialties || [],
        accepted_insurance: provider.accepted_insurance || [],
        in_network_plans: provider.in_network_plans || [],
        // Add any other required properties
        created_at: provider.created_at || new Date().toISOString(),
        // If provider has an availability property, move it to availability_next
        availability_next: provider.availability || provider.availability_next || null,
        latitude: provider.latitude || null,
        longitude: provider.longitude || null
      };
      
      // Store the complete provider object from the database
      setSelectedProvider(safeProvider);
      setShowProviderMatch(false);
      
      // Show confirmation toast
      toast({
        title: "Provider Selected",
        description: `${safeProvider.name} has been selected for referral.`,
      });
    } catch (error) {
      console.error("Error selecting provider:", error);
      toast({
        title: "Error Selecting Provider",
        description: "There was a problem selecting this provider. Please try again.",
        variant: "destructive",
      });
    }
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

        // Fetch the updated history
        const historyData = await getReferralHistory(newReferral.id);
        setHistory(historyData);

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
      
      // Fetch the updated history
      const historyData = await getReferralHistory(activeReferral.id);
      setHistory(historyData);
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
      
      // Fetch the updated history
      const historyData = await getReferralHistory(activeReferral.id);
      setHistory(historyData);
    }
  };

  const handleCancelReferral = async () => {
    if (!activeReferral?.id) return;

    const success = await cancelReferral(
      activeReferral.id,
      "Referral cancelled by care coordinator"
    );

    if (success) {
      // We still want to keep the history for the cancelled referral
      const historyData = await getReferralHistory(activeReferral.id);
      setHistory(historyData);
      
      // Reset the active referral and selected provider
      setActiveReferral(null);
      setSelectedProvider(null);
    }
  };

  const handleRetryLoad = async () => {
    if (patient.current_referral_id) {
      const referral = await getReferralById(patient.current_referral_id);
      
      if (referral) {
        // Fetch the updated history
        const historyData = await getReferralHistory(referral.id);
        setHistory(historyData);
      }
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
            <EditablePatientSummaryPanel 
            patient={patient}
            onPatientUpdated={(updatedPatient) => {
              // Update local state if needed
              toast({
                title: "Patient Updated",
                description: "Patient information has been successfully updated.",
              });
            }}
          />
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

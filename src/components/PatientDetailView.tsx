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
  ReferralNotifications,
  ReferralConfirmationTracker,
  LoadingSkeleton,
  ErrorState,
} from "./PatientDetail";
import { useReferrals } from "@/hooks/use-referrals-safe";
import { useOptimisticUpdates } from "@/hooks/use-optimistic-updates";
import { useReferralNotifications } from "./PatientDetail/ReferralNotifications";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Patient, Provider, ReferralStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";

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
    notifications, 
    addNotification, 
    markAsRead, 
    dismissAll 
  } = useReferralNotifications();

  // Keyboard navigation for patient detail view
  useKeyboardNavigation({
    onEscape: () => {
      if (showProviderMatch) {
        setShowProviderMatch(false);
      } else {
        onBack();
      }
    },
    enableEscapeClose: true,
  });

  const {
    isLoading,
    error,
    getPatientReferrals,
    getReferralById,
    getReferralHistory,
  } = useReferrals(patient.current_referral_id || undefined);

  // Use optimistic updates for better UX
  const {
    createReferral: createReferralOptimistic,
    updateReferralStatus: updateReferralStatusOptimistic,
    isCreatingReferral: isCreatingReferralOptimistic,
    isUpdatingReferral: isUpdatingReferralOptimistic,
  } = useOptimisticUpdates();

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
      const newReferral = await createReferralOptimistic({
        patientId: patient.id,
        providerId: selectedProvider.id,
        serviceType: patient.required_followup.split("+")[0].trim()
      });

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

        // Add notification
        addNotification({
          type: "confirmation",
          title: "Referral Sent Successfully",
          message: `Referral has been sent to ${selectedProvider.name}. The provider will be notified.`,
          priority: "high",
          referralId: newReferral.id,
          actionRequired: false,
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

    try {
      await updateReferralStatusOptimistic({
        referralId: activeReferral.id,
        status: 'scheduled',
        notes: "Appointment scheduled by care coordinator",
        patientId: patient.id
      });
      setActiveReferral({
        ...activeReferral,
        status: "scheduled",
        scheduledDate: scheduledDateStr,
        updatedAt: new Date().toISOString(),
      });
      
      // Fetch the updated history
      const historyData = await getReferralHistory(activeReferral.id);
      setHistory(historyData);

      // Add notification
      addNotification({
        type: "status_change",
        title: "Appointment Scheduled",
        message: `Appointment has been scheduled for ${tomorrow.toLocaleDateString()}.`,
        priority: "high",
        referralId: activeReferral.id,
        actionRequired: false,
      });
    } catch (error) {
      console.error("Error scheduling referral:", error);
      toast({
        title: "Error Scheduling Appointment",
        description: "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteReferral = async () => {
    if (!activeReferral?.id) return;

    try {
      await updateReferralStatusOptimistic({
        referralId: activeReferral.id,
        status: 'completed',
        notes: "Care completed by provider",
        patientId: patient.id
      });
      setActiveReferral({
        ...activeReferral,
        status: "completed",
        completedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      // Fetch the updated history
      const historyData = await getReferralHistory(activeReferral.id);
      setHistory(historyData);

      // Add notification
      addNotification({
        type: "status_change",
        title: "Care Completed",
        message: "Patient care has been completed successfully. Referral workflow is finished.",
        priority: "high",
        referralId: activeReferral.id,
        actionRequired: false,
      });
    } catch (error) {
      console.error("Error completing referral:", error);
      toast({
        title: "Error Completing Referral",
        description: "Failed to complete referral. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelReferral = async () => {
    if (!activeReferral?.id) return;

    try {
      await updateReferralStatusOptimistic({
        referralId: activeReferral.id,
        status: 'cancelled',
        notes: "Referral cancelled by care coordinator",
        patientId: patient.id
      });
      // We still want to keep the history for the cancelled referral
      const historyData = await getReferralHistory(activeReferral.id);
      setHistory(historyData);
      
      // Add notification
      addNotification({
        type: "status_change",
        title: "Referral Cancelled",
        message: "The referral has been cancelled. You can select a new provider if needed.",
        priority: "medium",
        referralId: activeReferral.id,
        actionRequired: false,
      });
      
      // Reset the active referral and selected provider
      setActiveReferral(null);
      setSelectedProvider(null);
    } catch (error) {
      console.error("Error cancelling referral:", error);
      toast({
        title: "Error Cancelling Referral",
        description: "Failed to cancel referral. Please try again.",
        variant: "destructive",
      });
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

  const handleRefreshTimeline = async () => {
    if (activeReferral?.id) {
      try {
        const historyData = await getReferralHistory(activeReferral.id);
        setHistory(historyData);
        toast({
          title: "Timeline Refreshed",
          description: "Referral timeline has been updated with the latest information.",
        });
      } catch (error) {
        toast({
          title: "Refresh Failed",
          description: "Failed to refresh the timeline. Please try again.",
          variant: "destructive",
        });
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
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 self-start"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                Discharge Plan: {patient.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground truncate">
                {patient.diagnosis}
                <span className="block text-xs text-muted-foreground/80 mt-1">
                  Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Esc</kbd> to go back
                </span>
              </p>
            </div>
            <Badge
              className={`text-xs sm:text-sm px-2 sm:px-3 py-1 self-start sm:self-center flex-shrink-0 ${getRiskBadgeClass(
                patient.leakageRisk.level
              )}`}
            >
              <span className="hidden sm:inline">
                {patient.leakageRisk.score}% Leakage Risk -{" "}
                {patient.leakageRisk.level.toUpperCase()}
              </span>
              <span className="sm:hidden">
                {patient.leakageRisk.score}% {patient.leakageRisk.level.toUpperCase()}
              </span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-1 order-2 lg:order-1">
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

          <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-1 lg:order-2">
            <ReferralManagement
              patient={patient}
              selectedProvider={selectedProvider}
              activeReferral={activeReferral}
              isLoading={isLoading}
              error={error}
              isCreatingReferral={isCreatingReferral || isCreatingReferralOptimistic}
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

            <ReferralNotifications
              activeReferral={activeReferral}
              onMarkAsRead={markAsRead}
              onDismissAll={dismissAll}
            />

            <ReferralConfirmationTracker
              activeReferral={activeReferral}
              selectedProvider={selectedProvider}
              onRetryConfirmation={handleRetryLoad}
              onContactProvider={() => {
                if (selectedProvider?.phone) {
                  window.open(`tel:${selectedProvider.phone}`);
                }
              }}
            />

            <RiskAnalysisCard patient={patient} />

            <ReferralStatusTimeline
              selectedProvider={selectedProvider}
              activeReferral={activeReferral}
              isLoading={isLoading}
              error={error}
              history={history}
              onRefresh={handleRefreshTimeline}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

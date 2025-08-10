import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, UserCircle, AlertCircle } from "lucide-react";
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
import { useIsMobile, useScreenSize } from "@/hooks/use-mobile";

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
  
  // Mobile responsiveness hooks
  const isMobile = useIsMobile();
  const { isMobile: isMobileScreen, isTablet } = useScreenSize();

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
  } = useReferrals();

  // Use optimistic updates for better UX
  const {
    createReferral: createReferralOptimistic,
    updateReferralStatus: updateReferralStatusOptimistic,
    isCreatingReferral: isCreatingReferralOptimistic,
    isUpdatingReferral: isUpdatingReferralOptimistic,
  } = useOptimisticUpdates();

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
              latitude: null,
              longitude: null,
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
            latitude: null,
            longitude: null,
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

  useEffect(() => {
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
    // Refetch patient referrals to get the most recent active referral
    await fetchPatientReferrals();
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
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                  {patient.name}
                </h1>
                {patient.leakageRisk.level === 'high' && (
                  <Badge className="bg-red-100 text-red-800 border-red-300 text-xs font-bold animate-pulse">
                    URGENT
                  </Badge>
                )}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground truncate mb-1">
                <span className="font-semibold">{patient.diagnosis}</span> • Needs {patient.required_followup}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <UserCircle className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Age <span className="font-medium">{new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-red-600">
                      {Math.floor((new Date().getTime() - new Date(patient.discharge_date).getTime()) / (1000 * 60 * 60 * 24))} days
                    </span> since discharge
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-600 font-bold">$</span>
                  <span className="text-muted-foreground">
                    <span className="font-bold text-green-600">
                      ${((patient.leakageRisk.level === 'high' ? 18.5 : patient.leakageRisk.level === 'medium' ? 12.0 : 6.0)).toFixed(1)}K
                    </span> annual value
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground/80 mt-2 bg-muted/30 rounded px-2 py-1 inline-block">
                💡 <strong>Brenda's mission:</strong> Keep {patient.name} in our network with the right care at the right time
                <span className="ml-2">
                  Press <kbd className="px-1 py-0.5 text-xs bg-background rounded">Esc</kbd> to return
                </span>
              </div>
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
        {/* Story Impact Banner */}
        {patient.leakageRisk.level === 'high' && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="relative">
                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-red-800 dark:text-red-200 text-lg">🚨 Critical Intervention Needed</h3>
                  <Badge className="bg-red-100 text-red-800 border-red-300 text-xs font-bold">
                    HIGH PRIORITY
                  </Badge>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 mb-3 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-2 font-medium">
                    <span className="font-bold text-red-700">{patient.name}</span> is at <span className="font-bold text-red-600">{patient.leakageRisk.score}% risk</span> of seeking care outside your network. 
                    <span className="text-green-700 dark:text-green-400 font-semibold"> Your quick action now can save this patient relationship.</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 rounded p-2">
                      <Clock className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-red-800 dark:text-red-200">
                          {Math.floor((new Date().getTime() - new Date(patient.discharge_date).getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                        <div className="text-red-600 dark:text-red-400">since discharge</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 rounded p-2">
                      <div className="h-4 w-4 text-green-600 flex-shrink-0 font-bold">$</div>
                      <div>
                        <div className="font-bold text-green-800 dark:text-green-200">
                          ${((18.5)).toFixed(1)}K
                        </div>
                        <div className="text-green-600 dark:text-green-400">annual value at risk</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                      <UserCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-blue-800 dark:text-blue-200">
                          You
                        </div>
                        <div className="text-blue-600 dark:text-blue-400">can make the difference</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs bg-amber-100 dark:bg-amber-900/30 rounded px-3 py-2">
                  <span className="text-amber-800 dark:text-amber-200">
                    💡 <strong>Success Story:</strong> Care coordinators using our AI retain 85% of high-risk patients vs. 45% with manual processes
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Medium Risk Banner */}
        {patient.leakageRisk.level === 'medium' && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">⚠️ Proactive Care Opportunity</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {patient.name} shows moderate leakage risk. Scheduling follow-up care within 3 days can prevent escalation and secure ${((12.0)).toFixed(1)}K in annual revenue.
                </p>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Window for action:</strong> Next 72 hours are optimal for intervention
                </div>
              </div>
            </div>
          </div>
        )}
        
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

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Calendar,
  Plus,
  Check,
  Star,
  Clock,
  Phone,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { ProviderMatchCards } from "./ProviderMatchCards";
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
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const { toast } = useToast();

  // Initialize referrals hook with patient's current referral ID if available
  const {
    referral,
    history,
    isLoading,
    error,
    createReferral,
    updateReferralStatus,
    scheduleReferral,
    completeReferral,
    cancelReferral,
    getPatientReferrals,
    getReferralById,
    refreshReferral,
  } = useReferrals(patient.current_referral_id || undefined);

  // Fetch patient's active referral on component mount
  useEffect(() => {
    const fetchPatientReferrals = async () => {
      if (patient.id) {
        try {
          const referrals = await getPatientReferrals(patient.id);
          if (referrals.length > 0) {
            // Find the most recent non-cancelled referral
            const activeRef = referrals.find(
              (ref) => ref.status !== "cancelled"
            );
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

              // If we have a provider ID, we should fetch the provider details
              // For now, we'll just set a placeholder
              setSelectedProvider({
                id: activeRef.provider_id,
                name: "Selected Provider", // This would be replaced with actual provider data
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
          }
        } catch (err) {
          console.error("Error fetching patient referrals:", err);
          toast({
            title: "Error Loading Referrals",
            description: "Failed to load patient referrals. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    fetchPatientReferrals();
  }, [patient.id, getPatientReferrals, toast]);

  const handleAddFollowupCare = () => {
    setShowProviderMatch(true);
  };

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
        patient.required_followup.split("+")[0].trim() // Use the first required followup type
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

  // Loading skeleton for the entire view
  const renderLoadingSkeleton = () => (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-9 w-36 bg-muted rounded animate-pulse"></div>
            <div className="flex-1">
              <div className="h-7 w-64 bg-muted rounded mb-2 animate-pulse"></div>
              <div className="h-5 w-48 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-32 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Summary Panel Skeleton */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-6">
                  <div className="h-6 w-40 bg-muted rounded mb-6 animate-pulse"></div>
                  <div className="space-y-6">
                    {[...Array(8)].map((_, i) => (
                      <div key={i}>
                        <div className="h-4 w-32 bg-muted rounded mb-2 animate-pulse"></div>
                        <div className="h-5 w-48 bg-muted rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Required Follow-up Care Skeleton */}
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
                  <div className="h-9 w-36 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="h-20 bg-muted rounded animate-pulse"></div>
              </div>
            </div>

            {/* Risk Factor Breakdown Skeleton */}
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6">
                <div className="h-6 w-48 bg-muted rounded mb-6 animate-pulse"></div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 bg-muted rounded animate-pulse"></div>
                    <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-4 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="h-4 w-36 bg-muted rounded animate-pulse"></div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded animate-pulse"></div>
                          <div className="h-4 w-8 bg-muted rounded animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Status Tracker Skeleton */}
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6">
                <div className="h-6 w-48 bg-muted rounded mb-6 animate-pulse"></div>
                <div className="space-y-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-muted animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-5 w-32 bg-muted rounded mb-2 animate-pulse"></div>
                        <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Error state for the entire view
  const renderErrorState = (errorMessage: string) => (
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
                Error Loading Patient
              </h1>
              <p className="text-muted-foreground">
                There was a problem loading the patient data
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <span className="text-xl font-medium">
              Failed to load patient data
            </span>
          </div>
          <p className="text-center text-muted-foreground max-w-md">
            {errorMessage ||
              "There was an error loading the patient data. Please try again or contact support if the problem persists."}
          </p>
          <div className="flex gap-4">
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Check if we need to show loading or error states
  if (isLoading) {
    return renderLoadingSkeleton();
  }

  if (error) {
    return renderErrorState(error.message);
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
          {/* Patient Summary Panel (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Patient Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </p>
                    <p className="text-foreground font-semibold">
                      {patient.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </p>
                    <p className="text-foreground">
                      {new Date(patient.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Age
                    </p>
                    <p className="text-foreground">{patient.age} years</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Diagnosis
                    </p>
                    <p className="text-foreground">{patient.diagnosis}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Discharge Date
                    </p>
                    <p className="text-foreground">
                      {new Date(patient.discharge_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Days Since Discharge
                    </p>
                    <p className="text-foreground">
                      {patient.daysSinceDischarge} days
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Insurance
                      </p>
                      <p className="text-foreground">{patient.insurance}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Home Address
                      </p>
                      <p className="text-foreground text-sm">
                        {patient.address}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Required Follow-up Care */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Required Follow-up Care
                  </span>
                  {!showProviderMatch && !selectedProvider && !isLoading && (
                    <Button
                      onClick={handleAddFollowupCare}
                      className="gap-2"
                      disabled={isLoading}
                    >
                      <Plus className="h-4 w-4" />
                      Add Follow-up Care
                    </Button>
                  )}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Error State */}
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="flex items-center gap-2 text-destructive mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">
                        Error loading referral data
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {error.message}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        if (patient.current_referral_id) {
                          getReferralById(patient.current_referral_id);
                        }
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-primary-light rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {patient.required_followup}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Post-surgical rehabilitation required
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-warning-light text-warning border-warning"
                  >
                    High Priority
                  </Badge>
                </div>

                {selectedProvider && !activeReferral && (
                  <div className="mt-4 p-4 bg-success-light rounded-lg border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-5 w-5 text-success" />
                      <span className="font-semibold text-success">
                        Provider Selected
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedProvider.name}
                        </p>
                        <p className="text-muted-foreground">
                          {selectedProvider.address}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Next available: {selectedProvider.availability}
                        </p>
                        <p className="text-muted-foreground">
                          Distance: {selectedProvider.distance}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={handleSendReferral}
                      disabled={isCreatingReferral}
                    >
                      <Phone className="h-4 w-4" />
                      {isCreatingReferral
                        ? "Sending..."
                        : "Confirm & Send Referral"}
                    </Button>
                  </div>
                )}

                {activeReferral && (
                  <div className="mt-4 p-4 bg-success-light rounded-lg border border-success/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-success" />
                        <span className="font-semibold text-success">
                          Referral{" "}
                          {activeReferral.status.charAt(0).toUpperCase() +
                            activeReferral.status.slice(1)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={handleCancelReferral}
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedProvider?.name}
                        </p>
                        <p className="text-muted-foreground">
                          {selectedProvider?.address}
                        </p>
                      </div>
                      <div>
                        {activeReferral.scheduledDate ? (
                          <p className="text-muted-foreground">
                            Scheduled:{" "}
                            {new Date(
                              activeReferral.scheduledDate
                            ).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-muted-foreground">
                            Awaiting scheduling
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          Created:{" "}
                          {new Date(
                            activeReferral.createdAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {activeReferral.status === "pending" ||
                    activeReferral.status === "sent" ? (
                      <Button
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={handleScheduleReferral}
                      >
                        <Calendar className="h-4 w-4" />
                        Schedule Appointment
                      </Button>
                    ) : activeReferral.status === "scheduled" ? (
                      <Button
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={handleCompleteReferral}
                      >
                        <Check className="h-4 w-4" />
                        Mark as Completed
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Provider Matching Interface */}
            {showProviderMatch && (
              <ProviderMatchCards
                patient={patient}
                onProviderSelected={handleProviderSelected}
                onCancel={() => setShowProviderMatch(false)}
              />
            )}

            {/* Risk Factor Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Leakage Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Overall Risk Score
                    </span>
                    <Badge
                      className={`${getRiskBadgeClass(
                        patient.leakageRisk.level
                      )}`}
                    >
                      {patient.leakageRisk.score}/100 -{" "}
                      {patient.leakageRisk.level.toUpperCase()}
                    </Badge>
                  </div>

                  {patient.leakageRisk.factors && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        Risk Factor Breakdown:
                      </h4>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Age Factor
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${patient.leakageRisk.factors.age}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">
                              {patient.leakageRisk.factors.age}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Diagnosis Complexity
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${patient.leakageRisk.factors.diagnosisComplexity}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">
                              {patient.leakageRisk.factors.diagnosisComplexity}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Time Since Discharge
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${patient.leakageRisk.factors.timeSinceDischarge}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">
                              {patient.leakageRisk.factors.timeSinceDischarge}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Insurance Type
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${patient.leakageRisk.factors.insuranceType}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">
                              {patient.leakageRisk.factors.insuranceType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Geographic Factors
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${patient.leakageRisk.factors.geographicFactors}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">
                              {patient.leakageRisk.factors.geographicFactors}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Referral Status Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Referral Status Timeline
                  {isLoading && (
                    <div className="ml-2 inline-flex items-center">
                      <Clock className="h-3 w-3 animate-pulse text-muted-foreground" />
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <div className="space-y-4 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-muted"></div>
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-muted rounded mb-2"></div>
                          <div className="h-3 w-48 bg-muted rounded"></div>
                        </div>
                        <div className="h-3 w-16 bg-muted rounded"></div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && !error && (
                  <div className="space-y-4">
                    {/* Provider Selection Status */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          selectedProvider ? "bg-success" : "bg-warning"
                        }`}
                      ></div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {selectedProvider
                            ? "Provider Selected"
                            : "Referral Needed"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedProvider
                            ? `Selected ${selectedProvider.name}`
                            : "Waiting for provider selection"}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {selectedProvider && !activeReferral
                          ? "Today"
                          : selectedProvider && activeReferral
                          ? new Date(
                              activeReferral.createdAt
                            ).toLocaleDateString()
                          : "Pending"}
                      </span>
                    </div>

                    {/* Referral Sent Status */}
                    <div
                      className={`flex items-center gap-4 ${
                        activeReferral &&
                        ["pending", "sent", "scheduled", "completed"].includes(
                          activeReferral.status
                        )
                          ? ""
                          : "opacity-50"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${
                          activeReferral &&
                          [
                            "pending",
                            "sent",
                            "scheduled",
                            "completed",
                          ].includes(activeReferral.status)
                            ? "bg-success"
                            : "bg-muted"
                        }`}
                      ></div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          Referral Sent
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activeReferral &&
                          [
                            "pending",
                            "sent",
                            "scheduled",
                            "completed",
                          ].includes(activeReferral.status)
                            ? `Referral sent to ${selectedProvider?.name}`
                            : "Digital referral transmitted to provider"}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {activeReferral &&
                        ["pending", "sent", "scheduled", "completed"].includes(
                          activeReferral.status
                        )
                          ? new Date(
                              activeReferral.createdAt
                            ).toLocaleDateString()
                          : "Pending"}
                      </span>
                    </div>

                    {/* Appointment Scheduled Status */}
                    <div
                      className={`flex items-center gap-4 ${
                        activeReferral &&
                        ["scheduled", "completed"].includes(
                          activeReferral.status
                        )
                          ? ""
                          : "opacity-50"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${
                          activeReferral &&
                          ["scheduled", "completed"].includes(
                            activeReferral.status
                          )
                            ? "bg-success"
                            : "bg-muted"
                        }`}
                      ></div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          Appointment Scheduled
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activeReferral && activeReferral.scheduledDate
                            ? `Scheduled for ${new Date(
                                activeReferral.scheduledDate
                              ).toLocaleDateString()}`
                            : "Provider confirms appointment time"}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {activeReferral &&
                        ["scheduled", "completed"].includes(
                          activeReferral.status
                        )
                          ? activeReferral.scheduledDate
                            ? new Date(
                                activeReferral.scheduledDate
                              ).toLocaleDateString()
                            : new Date(
                                activeReferral.updatedAt
                              ).toLocaleDateString()
                          : "Pending"}
                      </span>
                    </div>

                    {/* Care Completed Status */}
                    <div
                      className={`flex items-center gap-4 ${
                        activeReferral && activeReferral.status === "completed"
                          ? ""
                          : "opacity-50"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${
                          activeReferral &&
                          activeReferral.status === "completed"
                            ? "bg-success"
                            : "bg-muted"
                        }`}
                      ></div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          Care Completed
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activeReferral &&
                          activeReferral.status === "completed"
                            ? `Care completed with ${selectedProvider?.name}`
                            : "Patient attends appointment"}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {activeReferral && activeReferral.status === "completed"
                          ? activeReferral.completedDate
                            ? new Date(
                                activeReferral.completedDate
                              ).toLocaleDateString()
                            : new Date(
                                activeReferral.updatedAt
                              ).toLocaleDateString()
                          : "Pending"}
                      </span>
                    </div>

                    {/* Referral History */}
                    {history.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <h4 className="text-sm font-semibold mb-3">
                          Referral History
                        </h4>
                        <div className="space-y-3">
                          {history.map((entry) => (
                            <div key={entry.id} className="text-sm">
                              <div className="flex justify-between">
                                <p className="font-medium">
                                  {entry.status.charAt(0).toUpperCase() +
                                    entry.status.slice(1)}
                                </p>
                                <span className="text-muted-foreground">
                                  {new Date(
                                    entry.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              {entry.notes && (
                                <p className="text-muted-foreground mt-1">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

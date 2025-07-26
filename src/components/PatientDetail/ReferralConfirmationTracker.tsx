import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress"; // Commented out as it may not exist
import {
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  User,
} from "lucide-react";
import { ReferralStatus, Provider } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ConfirmationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp?: string;
  estimatedTime?: string;
  actionRequired?: boolean;
}

interface ReferralConfirmationTrackerProps {
  activeReferral: ReferralStatus | null;
  selectedProvider: Provider | null;
  onRetryConfirmation?: () => void;
  onContactProvider?: () => void;
}

export const ReferralConfirmationTracker = ({
  activeReferral,
  selectedProvider,
  onRetryConfirmation,
  onContactProvider,
}: ReferralConfirmationTrackerProps) => {
  const [confirmationSteps, setConfirmationSteps] = useState<ConfirmationStep[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const { toast } = useToast();

  // Generate confirmation steps based on referral status
  useEffect(() => {
    if (!activeReferral) {
      setConfirmationSteps([]);
      setOverallProgress(0);
      return;
    }

    const steps: ConfirmationStep[] = [
      {
        id: "referral_sent",
        title: "Referral Transmitted",
        description: "Digital referral sent to provider's system",
        status: activeReferral.status === "pending" ? "in_progress" : "completed",
        timestamp: activeReferral.createdAt,
        estimatedTime: "Immediate",
      },
      {
        id: "provider_notification",
        title: "Provider Notified",
        description: "Provider has been notified of the new referral",
        status: 
          activeReferral.status === "pending" ? "in_progress" :
          ["sent", "scheduled", "completed"].includes(activeReferral.status) ? "completed" : "pending",
        estimatedTime: "Within 15 minutes",
      },
      {
        id: "provider_acknowledgment",
        title: "Provider Acknowledgment",
        description: "Provider has acknowledged receipt of referral",
        status: 
          ["sent", "scheduled", "completed"].includes(activeReferral.status) ? "completed" :
          activeReferral.status === "pending" ? "in_progress" : "pending",
        estimatedTime: "Within 2 hours",
      },
      {
        id: "appointment_scheduling",
        title: "Appointment Scheduling",
        description: "Provider is scheduling the appointment",
        status: 
          ["scheduled", "completed"].includes(activeReferral.status) ? "completed" :
          activeReferral.status === "sent" ? "in_progress" : "pending",
        estimatedTime: "Within 24 hours",
        actionRequired: activeReferral.status === "sent",
      },
      {
        id: "patient_notification",
        title: "Patient Notification",
        description: "Patient has been notified of appointment details",
        status: 
          activeReferral.status === "completed" ? "completed" :
          activeReferral.status === "scheduled" ? "completed" : "pending",
        timestamp: activeReferral.scheduledDate,
        estimatedTime: "After scheduling",
      },
    ];

    // Check for any failed steps (e.g., if referral has been pending too long)
    const createdTime = new Date(activeReferral.createdAt).getTime();
    const now = new Date().getTime();
    const hoursSinceCreated = (now - createdTime) / (1000 * 60 * 60);

    if (activeReferral.status === "pending" && hoursSinceCreated > 4) {
      // Mark provider notification as potentially failed
      steps[1].status = "failed";
      steps[1].actionRequired = true;
    }

    if (activeReferral.status === "sent" && hoursSinceCreated > 48) {
      // Mark appointment scheduling as potentially failed
      steps[3].status = "failed";
      steps[3].actionRequired = true;
    }

    setConfirmationSteps(steps);

    // Calculate overall progress
    const completedSteps = steps.filter(step => step.status === "completed").length;
    const progress = (completedSteps / steps.length) * 100;
    setOverallProgress(progress);
  }, [activeReferral]);

  const getStatusIcon = (status: ConfirmationStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-warning animate-pulse" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: ConfirmationStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-success";
      case "in_progress":
        return "text-warning";
      case "failed":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const handleRetryConfirmation = () => {
    if (onRetryConfirmation) {
      onRetryConfirmation();
    }
    toast({
      title: "Retrying Confirmation",
      description: "Attempting to re-establish confirmation with the provider.",
    });
  };

  const handleContactProvider = () => {
    if (onContactProvider) {
      onContactProvider();
    }
    toast({
      title: "Contacting Provider",
      description: "Opening provider contact information.",
    });
  };

  if (!activeReferral) {
    return null;
  }

  const hasFailedSteps = confirmationSteps.some(step => step.status === "failed");
  const hasActionRequired = confirmationSteps.some(step => step.actionRequired);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Referral Confirmation Tracking
            {hasFailedSteps && (
              <Badge variant="destructive" className="text-xs">
                Action Required
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {Math.round(overallProgress)}% Complete
            </span>
            {onRetryConfirmation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetryConfirmation}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {confirmationSteps.filter(s => s.status === "completed").length} of {confirmationSteps.length} steps
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-2 bg-primary rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Confirmation Steps */}
        <div className="space-y-4">
          {confirmationSteps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Timeline connector */}
              {index < confirmationSteps.length - 1 && (
                <div className="absolute left-2 top-8 w-0.5 h-8 bg-border"></div>
              )}
              
              <div className="flex items-start gap-3">
                {getStatusIcon(step.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${getStatusColor(step.status)}`}>
                      {step.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      {step.actionRequired && (
                        <Badge variant="outline" className="text-xs">
                          Action Required
                        </Badge>
                      )}
                      {step.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(step.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                  {step.estimatedTime && step.status === "pending" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expected: {step.estimatedTime}
                    </p>
                  )}
                  
                  {/* Action buttons for failed steps */}
                  {step.status === "failed" && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetryConfirmation}
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                      {selectedProvider && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleContactProvider}
                          className="text-xs"
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call Provider
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Provider Contact Information */}
        {selectedProvider && hasActionRequired && (
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Provider Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="font-medium">{selectedProvider.name}</p>
                <p className="text-muted-foreground">{selectedProvider.type}</p>
                <p className="text-muted-foreground">{selectedProvider.address}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{selectedProvider.phone}</span>
                </div>
                {selectedProvider.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    <span>{selectedProvider.email}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleContactProvider}
                className="gap-2"
              >
                <Phone className="h-3 w-3" />
                Call Provider
              </Button>
              {selectedProvider.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${selectedProvider.email}`)}
                  className="gap-2"
                >
                  <Mail className="h-3 w-3" />
                  Send Email
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Success Message */}
        {overallProgress === 100 && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">
                Referral confirmation process completed successfully!
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All confirmation steps have been completed. The patient should receive appointment details soon.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Check,
  Clock,
  Phone,
  AlertCircle,
  X,
  Calendar,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Patient, Provider, ReferralStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { useOptimisticUpdates } from "@/hooks/use-optimistic-updates";

interface ReferralManagementProps {
  patient: Patient;
  selectedProvider: Provider | null;
  activeReferral: ReferralStatus | null;
  isLoading: boolean;
  error: Error | null;
  isCreatingReferral: boolean;
  onAddFollowupCare: () => void;
  onSendReferral: () => Promise<void>;
  onScheduleReferral: () => Promise<void>;
  onCompleteReferral: () => Promise<void>;
  onCancelReferral: () => Promise<void>;
  onRetryLoad: () => void;
}

export const ReferralManagement = ({
  patient,
  selectedProvider,
  activeReferral,
  isLoading,
  error,
  isCreatingReferral,
  onAddFollowupCare,
  onSendReferral,
  onScheduleReferral,
  onCompleteReferral,
  onCancelReferral,
  onRetryLoad,
}: ReferralManagementProps) => {
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { 
    notifyStatusChange, 
    notifyAppointmentScheduled, 
    notifyReferralCompleted, 
    notifyReferralCancelled 
  } = useNotifications();

  // Use optimistic updates for better UX
  const {
    selectProvider: selectProviderOptimistic,
    isUpdatingReferral: isUpdatingReferralOptimistic,
  } = useOptimisticUpdates();

  const handleSendReferral = async () => {
    setIsProcessing(true);
    try {
      await onSendReferral();
      setShowSendConfirmation(false);
      
      // Enhanced notification with the new system
      if (activeReferral && selectedProvider) {
        notifyStatusChange(
          activeReferral as any, 
          'needed', 
          patient.name, 
          selectedProvider.name
        );
      }
      
      toast({
        title: "Referral Sent Successfully",
        description: `Referral has been sent to ${selectedProvider?.name}. The provider will be notified and can schedule the appointment.`,
      });
    } catch (error) {
      console.error("Error sending referral:", error);
      toast({
        title: "Failed to Send Referral",
        description: "There was an error sending the referral. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScheduleReferral = async () => {
    setIsProcessing(true);
    try {
      await onScheduleReferral();
      setShowScheduleDialog(false);
      setNotes("");
      
      // Enhanced notification with the new system
      if (activeReferral && selectedProvider) {
        notifyAppointmentScheduled(
          activeReferral as any, 
          patient.name, 
          selectedProvider.name
        );
      }
      
      toast({
        title: "Appointment Scheduled",
        description: "The appointment has been scheduled successfully. The patient will be notified.",
      });
    } catch (error) {
      toast({
        title: "Failed to Schedule Appointment",
        description: "There was an error scheduling the appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteReferral = async () => {
    setIsProcessing(true);
    try {
      await onCompleteReferral();
      setShowCompleteDialog(false);
      setNotes("");
      
      // Enhanced notification with the new system
      if (activeReferral && selectedProvider) {
        notifyReferralCompleted(
          activeReferral as any, 
          patient.name, 
          selectedProvider.name
        );
      }
      
      toast({
        title: "Referral Completed",
        description: "The referral has been marked as completed. The care transition is now finished.",
      });
    } catch (error) {
      toast({
        title: "Failed to Complete Referral",
        description: "There was an error completing the referral. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelReferral = async () => {
    setIsProcessing(true);
    try {
      await onCancelReferral();
      setShowCancelConfirmation(false);
      
      // Enhanced notification with the new system
      if (activeReferral && selectedProvider) {
        notifyReferralCancelled(
          { ...activeReferral, status: 'cancelled' } as any, 
          patient.name, 
          selectedProvider.name
        );
      }
      
      toast({
        title: "Referral Cancelled",
        description: "The referral has been cancelled. You can select a new provider if needed.",
      });
    } catch (error) {
      toast({
        title: "Failed to Cancel Referral",
        description: "There was an error cancelling the referral. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Required Follow-up Care
            </span>
            {!selectedProvider && !isLoading && (
              <Button
                onClick={onAddFollowupCare}
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
          {isLoading && <ReferralManagementSkeleton />}
          
          {!isLoading && (
            <>
              <ErrorDisplay error={error} onRetry={onRetryLoad} />
              
              <RequiredCareInfo patient={patient} />
            </>
          )}
          
          {/* Workflow Progress Indicator */}
          <WorkflowProgress 
            hasSelectedProvider={!!selectedProvider}
            activeReferral={activeReferral}
          />
          
          {selectedProvider && !activeReferral && (
            <SelectedProviderCard
              provider={selectedProvider}
              isCreatingReferral={isCreatingReferral}
              onSendReferral={async () => setShowSendConfirmation(true)}
            />
          )}

          {activeReferral && (
            <ActiveReferralCard
              referral={activeReferral}
              provider={selectedProvider}
              onSchedule={async () => setShowScheduleDialog(true)}
              onComplete={async () => setShowCompleteDialog(true)}
              onCancel={async () => setShowCancelConfirmation(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Send Referral Confirmation Dialog */}
      <AlertDialog open={showSendConfirmation} onOpenChange={setShowSendConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Referral Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this referral to <strong>{selectedProvider?.name}</strong>?
              <br /><br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Notify the provider about the patient's need for care</li>
                <li>Share relevant patient information securely</li>
                <li>Allow the provider to schedule an appointment</li>
                <li>Update the patient's referral status to "sent"</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSendReferral}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Referral
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Appointment Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Appointment
            </DialogTitle>
            <DialogDescription>
              Schedule an appointment for {patient.name} with {selectedProvider?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-notes">Notes (Optional)</Label>
              <Textarea
                id="schedule-notes"
                placeholder="Add any notes about the appointment scheduling..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This will schedule the appointment for tomorrow as a demonstration. 
                In a real system, you would select a specific date and time based on provider availability.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleScheduleReferral} disabled={isProcessing} className="gap-2">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Schedule Appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Referral Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Complete Referral
            </DialogTitle>
            <DialogDescription>
              Mark this referral as completed for {patient.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="complete-notes">Completion Notes (Optional)</Label>
              <Textarea
                id="complete-notes"
                placeholder="Add any notes about the completed care..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm text-success">
                <strong>Completing this referral will:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 text-sm text-success space-y-1">
                <li>Mark the patient's care transition as finished</li>
                <li>Update the referral status to "completed"</li>
                <li>Close this referral workflow</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleCompleteReferral} disabled={isProcessing} className="gap-2">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Referral
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Referral Confirmation Dialog */}
      <AlertDialog open={showCancelConfirmation} onOpenChange={setShowCancelConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" />
              Cancel Referral
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this referral?
              <br /><br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Cancel the current referral to {selectedProvider?.name}</li>
                <li>Reset the patient's referral status to "needed"</li>
                <li>Allow you to select a different provider</li>
                <li>Notify the provider that the referral has been cancelled</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Keep Referral</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelReferral}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90 gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  Cancel Referral
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface ErrorDisplayProps {
  error: Error | null;
  onRetry: () => void;
}

const ErrorDisplay = ({ error, onRetry }: ErrorDisplayProps) => {
  if (!error) return null;

  return (
    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
      <div className="flex items-center gap-2 text-destructive mb-1">
        <AlertCircle className="h-4 w-4" />
        <span className="font-medium">Error loading referral data</span>
      </div>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
};

interface RequiredCareInfoProps {
  patient: Patient;
}

const RequiredCareInfo = ({ patient }: RequiredCareInfoProps) => (
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
);

interface SelectedProviderCardProps {
  provider: Provider;
  isCreatingReferral: boolean;
  onSendReferral: () => Promise<void>;
}

const SelectedProviderCard = ({
  provider,
  isCreatingReferral,
  onSendReferral,
}: SelectedProviderCardProps) => (
  <div className="mt-4 p-4 bg-success-light rounded-lg border border-success/20">
    <div className="flex items-center gap-2 mb-3">
      <Check className="h-5 w-5 text-success" />
      <span className="font-semibold text-success">Provider Selected</span>
    </div>
    
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-foreground">{provider.name}</p>
          <p className="text-muted-foreground">{provider.type}</p>
          <p className="text-muted-foreground">{provider.address}</p>
        </div>
        <div>
          <p className="text-muted-foreground">
            <strong>Next available:</strong> {provider.availability_next || "Call to schedule"}
          </p>
          <p className="text-muted-foreground">
            <strong>Distance:</strong> {provider.distanceText || (typeof provider.distance === 'number' ? `${provider.distance} miles` : 'Unknown')}
          </p>
          <p className="text-muted-foreground">
            <strong>Phone:</strong> {provider.phone}
          </p>
        </div>
      </div>

      {/* Specialties */}
      {provider.specialties && provider.specialties.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Specialties:</p>
          <div className="flex flex-wrap gap-1">
            {provider.specialties.slice(0, 3).map((specialty) => (
              <Badge key={specialty} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
            {provider.specialties.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{provider.specialties.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Insurance Network Status */}
      {provider.inNetwork !== undefined && (
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`h-4 w-4 ${provider.inNetwork ? 'text-success' : 'text-muted-foreground'}`} />
          <Badge 
            variant={provider.inNetwork ? "default" : "secondary"}
            className={provider.inNetwork ? "bg-success-light text-success border-success" : ""}
          >
            {provider.inNetwork ? "In-Network ✓" : "Out-of-Network"}
          </Badge>
        </div>
      )}
    </div>

    <div className="mt-4 pt-3 border-t border-success/20">
      <p className="text-xs text-muted-foreground mb-3">
        Ready to send referral? This will notify the provider and begin the appointment scheduling process.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 gap-2"
          onClick={onSendReferral}
          disabled={isCreatingReferral}
        >
          {isCreatingReferral ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Referral
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Phone className="h-4 w-4" />
          Call
        </Button>
      </div>
    </div>
  </div>
);

interface ActiveReferralCardProps {
  referral: ReferralStatus;
  provider: Provider | null;
  onSchedule: () => Promise<void>;
  onComplete: () => Promise<void>;
  onCancel: () => Promise<void>;
}

const ActiveReferralCard = ({
  referral,
  provider,
  onSchedule,
  onComplete,
  onCancel,
}: ActiveReferralCardProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "sent":
        return <Clock className="h-5 w-5 text-warning" />;
      case "scheduled":
        return <Calendar className="h-5 w-5 text-primary" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
      case "sent":
        return "text-warning";
      case "scheduled":
        return "text-primary";
      case "completed":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "pending":
        return "Referral is being processed";
      case "sent":
        return "Referral sent to provider, awaiting response";
      case "scheduled":
        return "Appointment has been scheduled";
      case "completed":
        return "Care has been completed";
      default:
        return "Status unknown";
    }
  };

  return (
    <div className="mt-4 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(referral.status)}
          <div>
            <span className={`font-semibold ${getStatusColor(referral.status)}`}>
              Referral {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
            </span>
            <p className="text-xs text-muted-foreground">
              {getStatusDescription(referral.status)}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={onCancel}
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-foreground">{provider?.name || "Provider"}</p>
            <p className="text-muted-foreground">{provider?.type || "Unknown Type"}</p>
            <p className="text-muted-foreground">{provider?.address || "Address not available"}</p>
            {provider?.phone && (
              <p className="text-muted-foreground">
                <strong>Phone:</strong> {provider.phone}
              </p>
            )}
          </div>
          <div className="space-y-1">
            {referral.scheduledDate ? (
              <div>
                <p className="text-sm font-medium text-foreground">Scheduled Date:</p>
                <p className="text-sm text-primary font-medium">
                  {new Date(referral.scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-primary">
                  {new Date(referral.scheduledDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Awaiting scheduling</p>
            )}
            
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                <strong>Created:</strong> {new Date(referral.createdAt).toLocaleDateString()}
              </p>
              {referral.completedDate && (
                <p className="text-xs text-muted-foreground">
                  <strong>Completed:</strong> {new Date(referral.completedDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {referral.notes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-foreground mb-1">Notes:</p>
            <p className="text-sm text-muted-foreground">{referral.notes}</p>
          </div>
        )}
      </div>

      <ReferralActions
        status={referral.status}
        onSchedule={onSchedule}
        onComplete={onComplete}
      />
    </div>
  );
};

interface ReferralActionsProps {
  status: string;
  onSchedule: () => Promise<void>;
  onComplete: () => Promise<void>;
}

const ReferralActions = ({ status, onSchedule, onComplete }: ReferralActionsProps) => {
  if (status === "pending" || status === "sent") {
    return (
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">
          Next step: Schedule an appointment with the provider
        </p>
        <Button size="sm" className="gap-2" onClick={onSchedule}>
          <Calendar className="h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>
    );
  }
  
  if (status === "scheduled") {
    return (
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">
          Appointment is scheduled. Mark as completed when care is finished.
        </p>
        <Button size="sm" className="gap-2" onClick={onComplete}>
          <CheckCircle2 className="h-4 w-4" />
          Mark as Completed
        </Button>
      </div>
    );
  }
  
  if (status === "completed") {
    return (
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Care completed successfully</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This referral workflow is now finished.
        </p>
      </div>
    );
  }
  
  return null;
};

interface WorkflowProgressProps {
  hasSelectedProvider: boolean;
  activeReferral: ReferralStatus | null;
}

const WorkflowProgress = ({ hasSelectedProvider, activeReferral }: WorkflowProgressProps) => {
  const steps = [
    {
      id: 1,
      title: "Select Provider",
      description: "Choose the best provider for patient care",
      completed: hasSelectedProvider,
      active: !hasSelectedProvider,
    },
    {
      id: 2,
      title: "Send Referral",
      description: "Send referral to selected provider",
      completed: !!activeReferral,
      active: hasSelectedProvider && !activeReferral,
    },
    {
      id: 3,
      title: "Schedule Appointment",
      description: "Coordinate appointment scheduling",
      completed: activeReferral?.status === "scheduled" || activeReferral?.status === "completed",
      active: activeReferral?.status === "sent",
    },
    {
      id: 4,
      title: "Complete Care",
      description: "Mark care as completed",
      completed: activeReferral?.status === "completed",
      active: activeReferral?.status === "scheduled",
    },
  ];

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
      <h4 className="text-sm font-semibold text-foreground mb-3">Referral Workflow Progress</h4>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step.completed
                    ? "bg-success text-success-foreground"
                    : step.active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={`text-xs font-medium ${
                  step.completed || step.active ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground max-w-20">
                  {step.description}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors ${
                  steps[index + 1].completed || steps[index + 1].active
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ReferralManagementSkeleton = () => (
  <div className="space-y-4">
    {/* Required Care Info Skeleton */}
    <div className="p-4 bg-muted/30 rounded-lg animate-pulse">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-5 w-48 bg-muted rounded mb-2"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
        <div className="h-6 w-24 bg-muted rounded-full"></div>
      </div>
    </div>

    {/* Workflow Progress Skeleton */}
    <div className="p-4 bg-muted/30 rounded-lg border border-border animate-pulse">
      <div className="h-4 w-40 bg-muted rounded mb-3"></div>
      <div className="flex items-center justify-between">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-muted rounded-full"></div>
              <div className="mt-2 text-center">
                <div className="h-3 w-16 bg-muted rounded mb-1"></div>
                <div className="h-2 w-20 bg-muted rounded"></div>
              </div>
            </div>
            {index < 3 && (
              <div className="flex-1 h-0.5 mx-2 bg-muted"></div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Provider Selection Skeleton */}
    <div className="p-4 bg-muted/30 rounded-lg animate-pulse">
      <div className="space-y-3">
        <div className="h-5 w-32 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-36 bg-muted rounded"></div>
            <div className="h-3 w-24 bg-muted rounded"></div>
            <div className="h-3 w-40 bg-muted rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-32 bg-muted rounded"></div>
            <div className="h-3 w-28 bg-muted rounded"></div>
            <div className="h-3 w-24 bg-muted rounded"></div>
          </div>
        </div>
        <div className="flex gap-2 pt-3 border-t border-muted">
          <div className="h-8 w-24 bg-muted rounded"></div>
          <div className="h-8 w-16 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  </div>
);
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Check,
  Clock,
  Phone,
  AlertCircle,
  X,
  Calendar,
} from "lucide-react";
import { Patient, Provider, ReferralStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";

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
  return (
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
        <ErrorDisplay error={error} onRetry={onRetryLoad} />
        
        <RequiredCareInfo patient={patient} />
        
        {selectedProvider && !activeReferral && (
          <SelectedProviderCard
            provider={selectedProvider}
            isCreatingReferral={isCreatingReferral}
            onSendReferral={onSendReferral}
          />
        )}

        {activeReferral && (
          <ActiveReferralCard
            referral={activeReferral}
            provider={selectedProvider}
            onSchedule={onScheduleReferral}
            onComplete={onCompleteReferral}
            onCancel={onCancelReferral}
          />
        )}
      </CardContent>
    </Card>
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
    <div className="flex items-center gap-2 mb-2">
      <Check className="h-5 w-5 text-success" />
      <span className="font-semibold text-success">Provider Selected</span>
    </div>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="font-medium text-foreground">{provider.name}</p>
        <p className="text-muted-foreground">{provider.address}</p>
      </div>
      <div>
        <p className="text-muted-foreground">
          Next available: {provider.availability}
        </p>
        <p className="text-muted-foreground">
          Distance: {provider.distanceText || (typeof provider.distance === 'number' ? `${provider.distance} miles` : 'Unknown')}
        </p>
      </div>
    </div>
    <Button
      size="sm"
      className="mt-3 gap-2"
      onClick={onSendReferral}
      disabled={isCreatingReferral}
    >
      <Phone className="h-4 w-4" />
      {isCreatingReferral ? "Sending..." : "Confirm & Send Referral"}
    </Button>
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
}: ActiveReferralCardProps) => (
  <div className="mt-4 p-4 bg-success-light rounded-lg border border-success/20">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Check className="h-5 w-5 text-success" />
        <span className="font-semibold text-success">
          Referral {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
        </span>
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
    
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="font-medium text-foreground">{provider?.name}</p>
        <p className="text-muted-foreground">{provider?.address}</p>
      </div>
      <div>
        {referral.scheduledDate ? (
          <p className="text-muted-foreground">
            Scheduled: {new Date(referral.scheduledDate).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-muted-foreground">Awaiting scheduling</p>
        )}
        <p className="text-muted-foreground">
          Created: {new Date(referral.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>

    <ReferralActions
      status={referral.status}
      onSchedule={onSchedule}
      onComplete={onComplete}
    />
  </div>
);

interface ReferralActionsProps {
  status: string;
  onSchedule: () => Promise<void>;
  onComplete: () => Promise<void>;
}

const ReferralActions = ({ status, onSchedule, onComplete }: ReferralActionsProps) => {
  if (status === "pending" || status === "sent") {
    return (
      <Button size="sm" className="mt-3 gap-2" onClick={onSchedule}>
        <Calendar className="h-4 w-4" />
        Schedule Appointment
      </Button>
    );
  }
  
  if (status === "scheduled") {
    return (
      <Button size="sm" className="mt-3 gap-2" onClick={onComplete}>
        <Check className="h-4 w-4" />
        Mark as Completed
      </Button>
    );
  }
  
  return null;
};
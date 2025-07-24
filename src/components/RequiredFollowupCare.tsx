
import type { PatientDetailViewProps } from "./PatientDetailView";
import { Patient } from "@/types";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, Phone, Calendar, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, Clock } from "lucide-react";

interface RequiredFollowupCareProps extends PatientDetailViewProps {
  showProviderMatch: boolean;
  selectedProvider: any;
  isLoading: boolean;
  isCreatingReferral: boolean;
  activeReferral: any;
  error: any;
  handleAddFollowupCare: () => void;
  handleProviderSelected: (provider: any) => void;
  handleSendReferral: () => void;
  handleScheduleReferral: () => void;
  handleCompleteReferral: () => void;
  handleCancelReferral: () => void;
  getReferralById: (id: string) => void;
}

const RequiredFollowupCare = (props: RequiredFollowupCareProps) => {
  const {
    patient,
    showProviderMatch,
    selectedProvider,
    isLoading,
    isCreatingReferral,
    activeReferral,
    error,
    handleAddFollowupCare,
    handleSendReferral,
    handleScheduleReferral,
    handleCompleteReferral,
    handleCancelReferral,
    getReferralById,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Required Follow-up Care
          </span>
          {!showProviderMatch && !selectedProvider && !isLoading && (
            <Button onClick={handleAddFollowupCare} className="gap-2" disabled={isLoading}>
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
              <span className="font-medium">Error loading referral data</span>
            </div>
            <p className="text-sm text-muted-foreground">{error.message}</p>
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
            <p className="font-semibold text-foreground">{patient.required_followup}</p>
            <p className="text-sm text-muted-foreground">Post-surgical rehabilitation required</p>
          </div>
          <Badge variant="outline" className="bg-warning-light text-warning border-warning">
            High Priority
          </Badge>
        </div>
        {selectedProvider && !activeReferral && (
          <div className="mt-4 p-4 bg-success-light rounded-lg border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-5 w-5 text-success" />
              <span className="font-semibold text-success">Provider Selected</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground">{selectedProvider.name}</p>
                <p className="text-muted-foreground">{selectedProvider.address}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Next available: {selectedProvider.availability}</p>
                <p className="text-muted-foreground">Distance: {selectedProvider.distance}</p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="mt-3 gap-2" 
              onClick={handleSendReferral}
              disabled={isCreatingReferral}
            >
              <Phone className="h-4 w-4" />
              {isCreatingReferral ? 'Sending...' : 'Confirm & Send Referral'}
            </Button>
          </div>
        )}
        {activeReferral && (
          <div className="mt-4 p-4 bg-success-light rounded-lg border border-success/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                <span className="font-semibold text-success">Referral {activeReferral.status.charAt(0).toUpperCase() + activeReferral.status.slice(1)}</span>
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
                <p className="font-medium text-foreground">{selectedProvider?.name}</p>
                <p className="text-muted-foreground">{selectedProvider?.address}</p>
              </div>
              <div>
                {activeReferral.scheduledDate ? (
                  <p className="text-muted-foreground">
                    Scheduled: {new Date(activeReferral.scheduledDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Awaiting scheduling</p>
                )}
                <p className="text-muted-foreground">
                  Created: {new Date(activeReferral.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {activeReferral.status === 'needed' || activeReferral.status === 'sent' ? (
              <Button 
                size="sm" 
                className="mt-3 gap-2"
                onClick={handleScheduleReferral}
              >
                <Calendar className="h-4 w-4" />
                Schedule Appointment
              </Button>
            ) : activeReferral.status === 'scheduled' ? (
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
  );
};

export default RequiredFollowupCare;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Provider, ReferralStatus } from "@/types";

interface ReferralStatusTimelineProps {
  selectedProvider: Provider | null;
  activeReferral: ReferralStatus | null;
  isLoading: boolean;
  error: Error | null;
  history: any[];
}

export const ReferralStatusTimeline = ({
  selectedProvider,
  activeReferral,
  isLoading,
  error,
  history,
}: ReferralStatusTimelineProps) => {
  // Check if we have history data to display
  const hasHistory = Array.isArray(history) && history.length > 0;
  
  return (
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
        {isLoading && <TimelineLoadingSkeleton />}

        {!isLoading && !error && (
          <div className="space-y-4">
            <TimelineStep
              title={selectedProvider ? "Provider Selected" : "Referral Needed"}
              description={
                selectedProvider
                  ? `Selected ${selectedProvider.name}`
                  : "Waiting for provider selection"
              }
              status={selectedProvider ? "completed" : "pending"}
              date={
                selectedProvider && !activeReferral
                  ? "Today"
                  : selectedProvider && activeReferral
                  ? new Date(activeReferral.createdAt).toLocaleDateString()
                  : "Pending"
              }
            />

            <TimelineStep
              title="Referral Sent"
              description={
                activeReferral &&
                ["pending", "sent", "scheduled", "completed"].includes(
                  activeReferral.status
                )
                  ? `Referral sent to ${selectedProvider?.name}`
                  : "Digital referral transmitted to provider"
              }
              status={
                activeReferral &&
                ["pending", "sent", "scheduled", "completed"].includes(
                  activeReferral.status
                )
                  ? "completed"
                  : "pending"
              }
              date={
                activeReferral &&
                ["pending", "sent", "scheduled", "completed"].includes(
                  activeReferral.status
                )
                  ? new Date(activeReferral.createdAt).toLocaleDateString()
                  : "Pending"
              }
            />

            <TimelineStep
              title="Appointment Scheduled"
              description={
                activeReferral && activeReferral.scheduledDate
                  ? `Scheduled for ${new Date(
                      activeReferral.scheduledDate
                    ).toLocaleDateString()}`
                  : "Provider confirms appointment time"
              }
              status={
                activeReferral &&
                ["scheduled", "completed"].includes(activeReferral.status)
                  ? "completed"
                  : "pending"
              }
              date={
                activeReferral &&
                ["scheduled", "completed"].includes(activeReferral.status)
                  ? activeReferral.scheduledDate
                    ? new Date(activeReferral.scheduledDate).toLocaleDateString()
                    : new Date(activeReferral.updatedAt).toLocaleDateString()
                  : "Pending"
              }
            />

            <TimelineStep
              title="Care Completed"
              description={
                activeReferral && activeReferral.status === "completed"
                  ? `Care completed with ${selectedProvider?.name}`
                  : "Patient attends appointment"
              }
              status={
                activeReferral && activeReferral.status === "completed"
                  ? "completed"
                  : "pending"
              }
              date={
                activeReferral && activeReferral.status === "completed"
                  ? activeReferral.completedDate
                    ? new Date(activeReferral.completedDate).toLocaleDateString()
                    : new Date(activeReferral.updatedAt).toLocaleDateString()
                  : "Pending"
              }
            />

            {hasHistory && <ReferralHistory history={history} />}
            
            {activeReferral && !hasHistory && (
              <div className="mt-6 pt-4 border-t border-border text-center text-sm text-muted-foreground">
                No detailed history available for this referral.
              </div>
            )}
          </div>
        )}
        
        {!isLoading && error && (
          <div className="p-4 text-center">
            <p className="text-sm text-destructive">
              Error loading referral timeline: {error.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TimelineLoadingSkeleton = () => (
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
);

interface TimelineStepProps {
  title: string;
  description: string;
  status: "completed" | "pending";
  date: string;
}

const TimelineStep = ({ title, description, status, date }: TimelineStepProps) => (
  <div className={`flex items-center gap-4 ${status === "pending" ? "opacity-50" : ""}`}>
    <div
      className={`w-3 h-3 rounded-full ${
        status === "completed" ? "bg-success" : "bg-muted"
      }`}
    />
    <div className="flex-1">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <span className="text-sm text-muted-foreground">{date}</span>
  </div>
);

interface ReferralHistoryProps {
  history: any[];
}

const ReferralHistory = ({ history }: ReferralHistoryProps) => (
  <div className="mt-6 pt-4 border-t border-border">
    <h4 className="text-sm font-semibold mb-3">Referral History</h4>
    <div className="space-y-3">
      {history.map((entry) => (
        <div key={entry.id} className="text-sm">
          <div className="flex justify-between">
            <p className="font-medium">
              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
            </p>
            <span className="text-muted-foreground">
              {new Date(entry.created_at).toLocaleString()}
            </span>
          </div>
          {entry.notes && (
            <p className="text-muted-foreground mt-1">{entry.notes}</p>
          )}
          {entry.created_by && (
            <p className="text-xs text-muted-foreground mt-1">
              By: {entry.created_by}
            </p>
          )}
        </div>
      ))}
    </div>
  </div>
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  Send, 
  Calendar, 
  User, 
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Star,
  Activity,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { Provider, ReferralStatus } from "@/types";
import { useState } from "react";
import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow } from "date-fns";

interface ReferralStatusTimelineProps {
  selectedProvider: Provider | null;
  activeReferral: ReferralStatus | null;
  isLoading: boolean;
  error: Error | null;
  history: any[];
  onRefresh?: () => void;
}

export const ReferralStatusTimeline = ({
  selectedProvider,
  activeReferral,
  isLoading,
  error,
  history,
  onRefresh,
}: ReferralStatusTimelineProps) => {
  const [showDetailedHistory, setShowDetailedHistory] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  
  // Check if we have history data to display
  const hasHistory = Array.isArray(history) && history.length > 0;
  
  // Calculate timeline progress
  const getTimelineProgress = () => {
    if (!activeReferral) return 0;
    switch (activeReferral.status) {
      case "completed": return 100;
      case "scheduled": return 75;
      case "sent": case "pending": return 50;
      default: return selectedProvider ? 25 : 0;
    }
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Referral Timeline</span>
            </div>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {activeReferral && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusBadgeClass(activeReferral.status)}`}
              >
                {activeReferral.status.charAt(0).toUpperCase() + activeReferral.status.slice(1)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailedHistory(!showDetailedHistory)}
                className="text-xs gap-1"
              >
                {showDetailedHistory ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    Show Details
                  </>
                )}
              </Button>
            )}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="text-xs gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardTitle>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{getTimelineProgress()}% Complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                getTimelineProgress() === 100 ? "bg-success" :
                getTimelineProgress() >= 75 ? "bg-primary" :
                getTimelineProgress() >= 50 ? "bg-warning" : "bg-muted-foreground"
              }`}
              style={{ width: `${getTimelineProgress()}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading && <TimelineLoadingSkeleton />}

        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Enhanced Timeline Steps */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
              
              <div className="space-y-8">
                <EnhancedTimelineStep
                  id="provider-selection"
                  title="Provider Selection"
                  description={selectedProvider ? `Selected ${selectedProvider.name}` : "Waiting for provider selection"}
                  status={selectedProvider ? "completed" : "pending"}
                  date={selectedProvider && activeReferral ? activeReferral.createdAt : undefined}
                  icon={selectedProvider ? CheckCircle : User}
                  provider={selectedProvider}
                  isExpanded={expandedStep === "provider-selection"}
                  onToggleExpand={() => setExpandedStep(expandedStep === "provider-selection" ? null : "provider-selection")}
                />

                <EnhancedTimelineStep
                  id="referral-sent"
                  title="Referral Sent"
                  description={
                    activeReferral && ["pending", "sent", "scheduled", "completed"].includes(activeReferral.status)
                      ? `Referral transmitted to ${selectedProvider?.name || "provider"}`
                      : "Digital referral will be sent to provider"
                  }
                  status={
                    activeReferral && ["pending", "sent", "scheduled", "completed"].includes(activeReferral.status)
                      ? "completed" : "pending"
                  }
                  date={
                    activeReferral && ["pending", "sent", "scheduled", "completed"].includes(activeReferral.status)
                      ? activeReferral.createdAt : undefined
                  }
                  icon={activeReferral ? Send : Clock}
                  isExpanded={expandedStep === "referral-sent"}
                  onToggleExpand={() => setExpandedStep(expandedStep === "referral-sent" ? null : "referral-sent")}
                />

                <EnhancedTimelineStep
                  id="appointment-scheduled"
                  title="Appointment Scheduled"
                  description={
                    activeReferral && activeReferral.scheduledDate
                      ? `Scheduled for ${formatRelativeDate(activeReferral.scheduledDate)}`
                      : "Provider will confirm appointment time"
                  }
                  status={
                    activeReferral && ["scheduled", "completed"].includes(activeReferral.status)
                      ? "completed" : "pending"
                  }
                  date={
                    activeReferral && ["scheduled", "completed"].includes(activeReferral.status)
                      ? activeReferral.scheduledDate || activeReferral.updatedAt : undefined
                  }
                  icon={activeReferral && ["scheduled", "completed"].includes(activeReferral.status) ? Calendar : Clock}
                  scheduledDate={activeReferral?.scheduledDate}
                  isExpanded={expandedStep === "appointment-scheduled"}
                  onToggleExpand={() => setExpandedStep(expandedStep === "appointment-scheduled" ? null : "appointment-scheduled")}
                />

                <EnhancedTimelineStep
                  id="care-completed"
                  title="Care Completed"
                  description={
                    activeReferral && activeReferral.status === "completed"
                      ? `Care completed with ${selectedProvider?.name || "provider"}`
                      : "Patient will attend appointment"
                  }
                  status={activeReferral && activeReferral.status === "completed" ? "completed" : "pending"}
                  date={
                    activeReferral && activeReferral.status === "completed"
                      ? activeReferral.completedDate || activeReferral.updatedAt : undefined
                  }
                  icon={activeReferral && activeReferral.status === "completed" ? CheckCircle2 : Clock}
                  isExpanded={expandedStep === "care-completed"}
                  onToggleExpand={() => setExpandedStep(expandedStep === "care-completed" ? null : "care-completed")}
                />
              </div>
            </div>

            {/* Detailed History Section */}
            {hasHistory && showDetailedHistory && (
              <div className="mt-8 pt-6 border-t border-border">
                <ReferralHistory history={history} />
              </div>
            )}
            
            {activeReferral && !hasHistory && showDetailedHistory && (
              <div className="mt-6 pt-4 border-t border-border text-center text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                No detailed history available for this referral.
              </div>
            )}

            {/* Enhanced Tracking Summary */}
            {activeReferral && (
              <div className="mt-8 pt-6 border-t border-border">
                <EnhancedReferralTrackingSummary 
                  referral={activeReferral} 
                  provider={selectedProvider}
                  historyCount={history.length}
                />
              </div>
            )}
          </div>
        )}
        
        {!isLoading && error && (
          <div className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
            <p className="text-sm text-destructive font-medium mb-2">
              Error loading referral timeline
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {error.message}
            </p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function to get status badge styling
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success border-success/20";
    case "scheduled":
      return "bg-primary/10 text-primary border-primary/20";
    case "sent":
    case "pending":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-muted/10 text-muted-foreground border-muted/20";
  }
};

const TimelineLoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0"></div>
        <div className="flex-1 pt-2">
          <div className="h-4 w-32 bg-muted rounded mb-2"></div>
          <div className="h-3 w-48 bg-muted rounded mb-3"></div>
          <div className="h-2 w-24 bg-muted rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

interface EnhancedTimelineStepProps {
  id: string;
  title: string;
  description: string;
  status: "completed" | "pending";
  date?: string;
  icon: any;
  provider?: Provider | null;
  scheduledDate?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const EnhancedTimelineStep = ({ 
  id,
  title, 
  description, 
  status, 
  date, 
  icon: Icon,
  provider,
  scheduledDate,
  isExpanded,
  onToggleExpand
}: EnhancedTimelineStepProps) => {
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <div className={`relative ${status === "pending" ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-4">
        {/* Icon Circle */}
        <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          status === "completed" 
            ? "bg-success text-success-foreground" 
            : "bg-muted text-muted-foreground"
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-foreground">{title}</h4>
            {date && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {formatRelativeDate(date)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(date)}
                </div>
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          
          {/* Expandable Details */}
          {(provider || scheduledDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="text-xs gap-1 h-6 px-2 -ml-2"
            >
              {isExpanded ? "Hide Details" : "Show Details"}
              <ArrowRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </Button>
          )}
          
          {isExpanded && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
              {provider && id === "provider-selection" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{provider.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{provider.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{provider.phone}</span>
                  </div>
                  {provider.rating && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-3 w-3" />
                      <span>{provider.rating}/5.0 rating</span>
                    </div>
                  )}
                  {provider.specialties && provider.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provider.specialties.slice(0, 3).map((specialty) => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {scheduledDate && id === "appointment-scheduled" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {format(new Date(scheduledDate), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(scheduledDate), "h:mm a")}</span>
                  </div>
                  {provider && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>at {provider.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ReferralHistoryProps {
  history: any[];
}

const ReferralHistory = ({ history }: ReferralHistoryProps) => (
  <div className="mt-6 pt-4 border-t border-border">
    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
      <Clock className="h-4 w-4" />
      Detailed History ({history.length} entries)
    </h4>
    <div className="space-y-3">
      {history.map((entry, index) => (
        <div key={entry.id} className="relative">
          {/* Timeline connector */}
          {index < history.length - 1 && (
            <div className="absolute left-2 top-6 w-0.5 h-8 bg-border"></div>
          )}
          
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0 mt-0.5"></div>
            <div className="flex-1 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-foreground">
                    {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                  </p>
                  {entry.notes && (
                    <p className="text-muted-foreground mt-1">{entry.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                  {entry.created_by && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3 inline mr-1" />
                      {entry.created_by}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface EnhancedReferralTrackingSummaryProps {
  referral: ReferralStatus;
  provider: Provider | null;
  historyCount: number;
}

const EnhancedReferralTrackingSummary = ({ 
  referral, 
  provider, 
  historyCount 
}: EnhancedReferralTrackingSummaryProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "sent":
        return <Send className="h-4 w-4 text-warning" />;
      case "scheduled":
        return <Calendar className="h-4 w-4 text-primary" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTimeElapsed = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffInHours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Less than 1 hour";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  };

  const getTotalTimeElapsed = () => {
    if (referral.completedDate) {
      return getTimeElapsed(referral.createdAt, referral.completedDate);
    }
    return getTimeElapsed(referral.createdAt);
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "pending":
        return "Referral is being processed";
      case "sent":
        return "Awaiting provider response";
      case "scheduled":
        return "Appointment confirmed";
      case "completed":
        return "Care successfully completed";
      default:
        return "Status unknown";
    }
  };

  return (
    <div>
      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Referral Summary
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Status Card */}
        <div className="p-3 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(referral.status)}
            <span className="font-medium text-sm">Current Status</span>
          </div>
          <p className="text-sm text-foreground font-medium mb-1">
            {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            {getStatusDescription(referral.status)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            In status: {getTimeElapsed(referral.updatedAt)}
          </p>
        </div>

        {/* Timeline Card */}
        <div className="p-3 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Timeline</span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            <strong>Created:</strong> {format(new Date(referral.createdAt), "MMM d, h:mm a")}
          </p>
          {referral.scheduledDate && (
            <p className="text-xs text-muted-foreground mb-1">
              <strong>Scheduled:</strong> {format(new Date(referral.scheduledDate), "MMM d, h:mm a")}
            </p>
          )}
          {referral.completedDate && (
            <p className="text-xs text-muted-foreground mb-1">
              <strong>Completed:</strong> {format(new Date(referral.completedDate), "MMM d, h:mm a")}
            </p>
          )}
          <p className="text-xs text-primary font-medium mt-1">
            Total time: {getTotalTimeElapsed()}
          </p>
        </div>

        {/* Provider Card */}
        <div className="p-3 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Provider</span>
          </div>
          <p className="text-sm text-foreground font-medium mb-1">
            {provider?.name || "Unknown Provider"}
          </p>
          {provider?.type && (
            <p className="text-xs text-muted-foreground mb-1">
              {provider.type}
            </p>
          )}
          {provider?.phone && (
            <p className="text-xs text-muted-foreground">
              {provider.phone}
            </p>
          )}
        </div>

        {/* Activity Card */}
        <div className="p-3 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Activity</span>
          </div>
          <p className="text-sm text-foreground font-medium mb-1">
            {historyCount} Event{historyCount !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground mb-1">
            Status changes tracked
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated: {formatDistanceToNow(new Date(referral.updatedAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Next Steps */}
      {referral.status !== "completed" && (
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <h5 className="text-sm font-medium text-primary mb-2">Next Steps</h5>
          <p className="text-xs text-muted-foreground">
            {referral.status === "pending" || referral.status === "sent" 
              ? "Waiting for provider to confirm appointment availability."
              : referral.status === "scheduled"
              ? "Patient should attend the scheduled appointment."
              : "Continue monitoring referral progress."
            }
          </p>
        </div>
      )}
    </div>
  );
};
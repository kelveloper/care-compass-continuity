import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { ReferralStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ReferralNotification {
  id: string;
  type: "status_change" | "reminder" | "confirmation" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high";
  referralId?: string;
  actionRequired?: boolean;
}

interface ReferralNotificationsProps {
  activeReferral: ReferralStatus | null;
  onMarkAsRead: (notificationId: string) => void;
  onDismissAll: () => void;
}

export const ReferralNotifications = ({
  activeReferral,
  onMarkAsRead,
  onDismissAll,
}: ReferralNotificationsProps) => {
  const [notifications, setNotifications] = useState<ReferralNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Generate notifications based on referral status
  useEffect(() => {
    if (!activeReferral) {
      setNotifications([]);
      return;
    }

    const newNotifications: ReferralNotification[] = [];

    // Status-based notifications
    switch (activeReferral.status) {
      case "sent":
        newNotifications.push({
          id: `${activeReferral.id}-sent`,
          type: "confirmation",
          title: "Referral Sent",
          message: "Referral has been successfully sent to the provider. Awaiting confirmation.",
          timestamp: activeReferral.createdAt,
          read: false,
          priority: "medium",
          referralId: activeReferral.id,
          actionRequired: false,
        });
        break;

      case "scheduled":
        newNotifications.push({
          id: `${activeReferral.id}-scheduled`,
          type: "status_change",
          title: "Appointment Scheduled",
          message: activeReferral.scheduledDate
            ? `Appointment scheduled for ${new Date(activeReferral.scheduledDate).toLocaleDateString()}`
            : "Appointment has been scheduled with the provider.",
          timestamp: activeReferral.updatedAt,
          read: false,
          priority: "high",
          referralId: activeReferral.id,
          actionRequired: false,
        });
        break;

      case "completed":
        newNotifications.push({
          id: `${activeReferral.id}-completed`,
          type: "status_change",
          title: "Care Completed",
          message: "Patient care has been completed successfully. Referral workflow is finished.",
          timestamp: activeReferral.completedDate || activeReferral.updatedAt,
          read: false,
          priority: "high",
          referralId: activeReferral.id,
          actionRequired: false,
        });
        break;

      case "pending":
        // Add reminder if referral has been pending for more than 24 hours
        const createdTime = new Date(activeReferral.createdAt).getTime();
        const now = new Date().getTime();
        const hoursSincePending = (now - createdTime) / (1000 * 60 * 60);

        if (hoursSincePending > 24) {
          newNotifications.push({
            id: `${activeReferral.id}-pending-reminder`,
            type: "reminder",
            title: "Referral Pending",
            message: "This referral has been pending for over 24 hours. Consider following up with the provider.",
            timestamp: new Date().toISOString(),
            read: false,
            priority: "medium",
            referralId: activeReferral.id,
            actionRequired: true,
          });
        }
        break;
    }

    setNotifications(newNotifications);
  }, [activeReferral]);

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
    onMarkAsRead(notificationId);
  };

  const handleDismissAll = () => {
    setNotifications([]);
    onDismissAll();
    toast({
      title: "Notifications Cleared",
      description: "All referral notifications have been dismissed.",
    });
  };

  const getNotificationIcon = (type: ReferralNotification["type"]) => {
    switch (type) {
      case "confirmation":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "status_change":
        return <Bell className="h-4 w-4 text-primary" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-warning" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: ReferralNotification["priority"]) => {
    switch (priority) {
      case "high":
        return "border-l-destructive bg-destructive/5";
      case "medium":
        return "border-l-warning bg-warning/5";
      case "low":
        return "border-l-muted bg-muted/5";
      default:
        return "border-l-muted bg-muted/5";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Referral Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Dismiss All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border-l-4 transition-all ${getPriorityColor(
                notification.priority
              )} ${notification.read ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </h4>
                      {notification.actionRequired && (
                        <Badge variant="outline" className="text-xs">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-xs"
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Hook for managing referral notifications
export const useReferralNotifications = () => {
  const [notifications, setNotifications] = useState<ReferralNotification[]>([]);

  const addNotification = (notification: Omit<ReferralNotification, "id" | "timestamp" | "read">) => {
    const newNotification: ReferralNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const dismissAll = () => {
    setNotifications([]);
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  return {
    notifications,
    addNotification,
    markAsRead,
    dismissAll,
    getUnreadCount,
  };
};
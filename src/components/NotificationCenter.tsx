import { useState } from "react";
import { Bell, Settings, Check, CheckCheck, Trash2, Volume2, VolumeX, Monitor, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, StatusChangeNotification } from "@/hooks/use-notifications";

export const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    preferences,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    clearNotifications,
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);

  const getNotificationIcon = (type: StatusChangeNotification['type']) => {
    switch (type) {
      case 'appointment':
        return '📅';
      case 'completion':
        return '✅';
      case 'cancellation':
        return '❌';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'scheduled':
        return 'text-blue-600';
      case 'sent':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2 text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notification Settings</DialogTitle>
                    <DialogDescription>
                      Configure how you want to receive notifications about referral status changes.
                    </DialogDescription>
                  </DialogHeader>
                  <NotificationSettings 
                    preferences={preferences}
                    onUpdate={updatePreferences}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs">You'll see referral updates here</p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="w-full text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all notifications
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface NotificationItemProps {
  notification: StatusChangeNotification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const getNotificationIcon = (type: StatusChangeNotification['type']) => {
    switch (type) {
      case 'appointment':
        return '📅';
      case 'completion':
        return '✅';
      case 'cancellation':
        return '❌';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'scheduled':
        return 'text-blue-600';
      case 'sent':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`p-3 rounded-lg border mb-2 cursor-pointer transition-colors hover:bg-muted/50 ${
        !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-background'
      }`}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium truncate">
              {notification.patientName}
            </p>
            <div className="flex items-center gap-2">
              {!notification.read && (
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
              )}
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatTimestamp(notification.timestamp)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            {notification.message}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Provider: {notification.providerName}
            </span>
            <span className={`text-xs font-medium ${getStatusColor(notification.newStatus)}`}>
              {notification.newStatus.charAt(0).toUpperCase() + notification.newStatus.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NotificationSettingsProps {
  preferences: any;
  onUpdate: (preferences: any) => void;
}

const NotificationSettings = ({ preferences, onUpdate }: NotificationSettingsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Notification Types</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Status Changes</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when referral status changes
              </p>
            </div>
            <Switch
              checked={preferences.statusChanges}
              onCheckedChange={(checked) => onUpdate({ statusChanges: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Appointments</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when appointments are scheduled
              </p>
            </div>
            <Switch
              checked={preferences.appointments}
              onCheckedChange={(checked) => onUpdate({ appointments: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Completions</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when care is completed
              </p>
            </div>
            <Switch
              checked={preferences.completions}
              onCheckedChange={(checked) => onUpdate({ completions: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Cancellations</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when referrals are cancelled
              </p>
            </div>
            <Switch
              checked={preferences.cancellations}
              onCheckedChange={(checked) => onUpdate({ cancellations: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-medium mb-3">Delivery Methods</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              {preferences.sound ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm">Sound</Label>
                <p className="text-xs text-muted-foreground">
                  Play a sound for notifications
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.sound}
              onCheckedChange={(checked) => onUpdate({ sound: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              {preferences.desktop ? (
                <Monitor className="h-4 w-4 text-primary" />
              ) : (
                <MonitorX className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm">Desktop Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Show desktop notifications (requires permission)
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.desktop}
              onCheckedChange={(checked) => onUpdate({ desktop: checked })}
            />
          </div>
        </div>
      </div>

      {preferences.desktop && 'Notification' in window && Notification.permission === 'default' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Desktop notifications require permission. Click "Allow" when prompted by your browser.
          </p>
        </div>
      )}

      {preferences.desktop && 'Notification' in window && Notification.permission === 'denied' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Desktop notifications are blocked. Please enable them in your browser settings.
          </p>
        </div>
      )}
    </div>
  );
};
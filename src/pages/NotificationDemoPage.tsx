import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useNotifications } from "@/hooks/use-notifications";
import { Bell, Send, Calendar, CheckCircle2, X, ArrowLeft } from "lucide-react";

export default function NotificationDemoPage() {
  const {
    notifyStatusChange,
    notifyAppointmentScheduled,
    notifyReferralCompleted,
    notifyReferralCancelled,
    notifications,
    unreadCount,
  } = useNotifications();

  const [demoStep, setDemoStep] = useState(0);

  const mockReferral = {
    id: 'demo-referral-1',
    patient_id: 'demo-patient-1',
    provider_id: 'demo-provider-1',
    service_type: 'Physical Therapy',
    status: 'sent' as const,
    scheduled_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    completed_date: null,
    notes: 'Demo referral for testing notifications',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const demoScenarios = [
    {
      title: "Send Referral",
      description: "Simulate sending a referral to a provider",
      icon: <Send className="h-4 w-4" />,
      action: () => {
        notifyStatusChange(
          { ...mockReferral, status: 'sent' },
          'needed',
          'Sarah Johnson',
          'Dr. Michael Chen, PT'
        );
        setDemoStep(1);
      },
    },
    {
      title: "Schedule Appointment",
      description: "Simulate scheduling an appointment",
      icon: <Calendar className="h-4 w-4" />,
      action: () => {
        notifyAppointmentScheduled(
          { ...mockReferral, status: 'scheduled' },
          'Sarah Johnson',
          'Dr. Michael Chen, PT'
        );
        setDemoStep(2);
      },
    },
    {
      title: "Complete Care",
      description: "Simulate completing the care process",
      icon: <CheckCircle2 className="h-4 w-4" />,
      action: () => {
        notifyReferralCompleted(
          { ...mockReferral, status: 'completed' },
          'Sarah Johnson',
          'Dr. Michael Chen, PT'
        );
        setDemoStep(3);
      },
    },
    {
      title: "Cancel Referral",
      description: "Simulate cancelling a referral",
      icon: <X className="h-4 w-4" />,
      action: () => {
        notifyReferralCancelled(
          { ...mockReferral, status: 'cancelled' },
          'Sarah Johnson',
          'Dr. Michael Chen, PT'
        );
        setDemoStep(4);
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Notification System Demo</h1>
                <p className="text-muted-foreground">Test the enhanced notification system</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <div className="text-right">
                <p className="font-medium text-foreground">Demo Mode</p>
                <p className="text-sm text-muted-foreground">Testing Environment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Demo Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Demo Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold mb-2">Demo Patient: Sarah Johnson</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Diagnosis: Post-surgical knee rehabilitation
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Provider: Dr. Michael Chen, PT - Westside Physical Therapy
                  </p>
                </div>

                <div className="space-y-3">
                  {demoScenarios.map((scenario, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          index <= demoStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {scenario.icon}
                        </div>
                        <div>
                          <p className="font-medium">{scenario.title}</p>
                          <p className="text-sm text-muted-foreground">{scenario.description}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={scenario.action}
                        disabled={index < demoStep}
                        variant={index <= demoStep ? "secondary" : "default"}
                      >
                        {index < demoStep ? "Done" : index === demoStep ? "Try Now" : "Locked"}
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setDemoStep(0)}
                    className="w-full"
                  >
                    Reset Demo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Features Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Notification System Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">✅</Badge>
                    <span className="text-sm">Toast notifications with enhanced messaging</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">✅</Badge>
                    <span className="text-sm">Notification history with read/unread status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">✅</Badge>
                    <span className="text-sm">Customizable notification preferences</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">✅</Badge>
                    <span className="text-sm">Desktop notifications (with permission)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">✅</Badge>
                    <span className="text-sm">Sound notifications using Web Audio API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">✅</Badge>
                    <span className="text-sm">Integration with referral workflow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">✅</Badge>
                    <span className="text-sm">Local storage for preferences persistence</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notification Status */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Notification Status</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount} unread</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No notifications yet</p>
                    <p className="text-sm text-muted-foreground">Try the demo controls to generate notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border ${
                          !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm">{notification.patientName}</p>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Provider: {notification.providerName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {notification.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {notifications.length > 5 && (
                      <p className="text-center text-sm text-muted-foreground">
                        +{notifications.length - 5} more notifications...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How to Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">1. Click the notification bell in the header</p>
                  <p className="text-xs text-muted-foreground">
                    This opens the notification center where you can view all notifications
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">2. Try the demo controls on the left</p>
                  <p className="text-xs text-muted-foreground">
                    Each button simulates a different type of referral status change
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">3. Configure notification settings</p>
                  <p className="text-xs text-muted-foreground">
                    Click the settings icon in the notification center to customize preferences
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">4. Test desktop notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Enable desktop notifications in settings and allow browser permission
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
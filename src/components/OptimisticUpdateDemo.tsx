import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOptimisticUpdates } from '@/hooks/use-optimistic-updates';
import { Patient } from '@/types';

interface OptimisticUpdateDemoProps {
  patient: Patient;
}

/**
 * Demo component showing optimistic updates in action
 * This component demonstrates immediate UI feedback for user actions
 */
export const OptimisticUpdateDemo = ({ patient }: OptimisticUpdateDemoProps) => {
  const [demoProvider] = useState({
    id: 'demo-provider-1',
    name: 'Dr. Sarah Johnson',
    type: 'Physical Therapy',
    address: '123 Health St, Medical City, MC 12345',
    phone: '(555) 123-4567',
    specialties: ['Physical Therapy', 'Sports Medicine'],
    accepted_insurance: [patient.insurance],
    in_network_plans: [patient.insurance],
    rating: 4.8,
    distance: 2.3,
    distanceText: '2.3 miles',
    availability_next: 'Tomorrow at 2:00 PM',
    created_at: new Date().toISOString(),
    latitude: 40.7128,
    longitude: -74.0060,
  });

  const {
    createReferral,
    updateReferralStatus,
    updatePatientInfo,
    selectProvider,
    isCreatingReferral,
    isUpdatingReferral,
    isUpdatingPatient,
  } = useOptimisticUpdates();

  const handleCreateReferral = async () => {
    try {
      await createReferral(
        patient.id,
        demoProvider.id,
        'Physical Therapy'
      );
    } catch (error) {
      console.error('Demo referral creation failed:', error);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      await updateReferralStatus({
        referralId: patient.current_referral_id || 'demo-referral',
        status: 'scheduled',
        patientId: patient.id,
        notes: 'Demo appointment scheduled'
      });
    } catch (error) {
      console.error('Demo status update failed:', error);
    }
  };

  const handleUpdatePatient = async () => {
    try {
      await updatePatientInfo({
        patientId: patient.id,
        updates: {
          diagnosis: patient.diagnosis + ' (Updated)',
        }
      });
    } catch (error) {
      console.error('Demo patient update failed:', error);
    }
  };

  const handleSelectProvider = () => {
    selectProvider(patient.id, demoProvider, (provider) => {
      console.log('Provider selected optimistically:', provider.name);
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Optimistic Updates Demo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Experience immediate UI feedback with optimistic updates. 
          Actions appear to complete instantly while processing in the background.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient Info */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h3 className="font-medium mb-2">Patient: {patient.name}</h3>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{patient.diagnosis}</Badge>
            <Badge 
              variant={patient.referral_status === 'needed' ? 'destructive' : 'default'}
            >
              {patient.referral_status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Risk Score: {patient.leakageRisk.score}% ({patient.leakageRisk.level})
          </p>
        </div>

        {/* Demo Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={handleSelectProvider}
            variant="outline"
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Select Provider (Instant)
          </Button>

          <Button
            onClick={handleCreateReferral}
            disabled={isCreatingReferral}
            className="flex items-center gap-2"
          >
            {isCreatingReferral ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Create Referral
          </Button>

          <Button
            onClick={handleUpdateStatus}
            disabled={isUpdatingReferral}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isUpdatingReferral ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            Update Status
          </Button>

          <Button
            onClick={handleUpdatePatient}
            disabled={isUpdatingPatient}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isUpdatingPatient ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Update Patient
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <h4 className="font-medium mb-2 text-primary">Optimistic Update Status</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {isCreatingReferral ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={isCreatingReferral ? 'text-primary' : 'text-muted-foreground'}>
                Creating Referral: {isCreatingReferral ? 'In Progress' : 'Ready'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isUpdatingReferral ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={isUpdatingReferral ? 'text-primary' : 'text-muted-foreground'}>
                Updating Status: {isUpdatingReferral ? 'In Progress' : 'Ready'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isUpdatingPatient ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={isUpdatingPatient ? 'text-primary' : 'text-muted-foreground'}>
                Updating Patient: {isUpdatingPatient ? 'In Progress' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-medium mb-2 text-green-800 dark:text-green-300">
            Optimistic Updates Benefits
          </h4>
          <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
            <li>• Immediate visual feedback for better UX</li>
            <li>• Reduced perceived loading times</li>
            <li>• Automatic rollback on errors</li>
            <li>• Seamless real-time updates</li>
            <li>• Enhanced user confidence</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
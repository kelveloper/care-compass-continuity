import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/**
 * Test component to verify toast notifications are working correctly
 * This component can be temporarily added to test the toast functionality
 */
export const TestToastNotifications = () => {
  const { toast } = useToast();

  const testSuccessToast = () => {
    toast({
      title: 'Success Test',
      description: 'This is a success toast notification test.',
    });
  };

  const testErrorToast = () => {
    toast({
      title: 'Error Test',
      description: 'This is an error toast notification test.',
      variant: 'destructive',
    });
  };

  const testInfoToast = () => {
    toast({
      title: 'Info Test',
      description: 'This is an info toast notification test.',
    });
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Toast Notification Tests</h2>
      <div className="flex gap-4">
        <Button onClick={testSuccessToast} variant="default">
          Test Success Toast
        </Button>
        <Button onClick={testErrorToast} variant="destructive">
          Test Error Toast
        </Button>
        <Button onClick={testInfoToast} variant="outline">
          Test Info Toast
        </Button>
      </div>
    </div>
  );
};
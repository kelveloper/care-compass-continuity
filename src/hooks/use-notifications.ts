import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { Referral, ReferralHistory } from '@/integrations/supabase/types';

export interface NotificationPreferences {
  statusChanges: boolean;
  appointments: boolean;
  completions: boolean;
  cancellations: boolean;
  sound: boolean;
  desktop: boolean;
}

export interface StatusChangeNotification {
  id: string;
  referralId: string;
  patientName: string;
  providerName: string;
  oldStatus: string;
  newStatus: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'status_change' | 'appointment' | 'completion' | 'cancellation';
}

export interface UseNotificationsReturn {
  notifications: StatusChangeNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  clearNotifications: () => void;
  
  // Notification triggers
  notifyStatusChange: (referral: Referral, oldStatus: string, patientName: string, providerName: string) => void;
  notifyAppointmentScheduled: (referral: Referral, patientName: string, providerName: string) => void;
  notifyReferralCompleted: (referral: Referral, patientName: string, providerName: string) => void;
  notifyReferralCancelled: (referral: Referral, patientName: string, providerName: string) => void;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  statusChanges: true,
  appointments: true,
  completions: true,
  cancellations: true,
  sound: false,
  desktop: false,
};

/**
 * Hook for managing referral status change notifications
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<StatusChangeNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notification-preferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Failed to parse notification preferences:', error);
      }
    }
  }, []);

  // Request desktop notification permission if enabled
  useEffect(() => {
    if (preferences.desktop && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [preferences.desktop]);

  const unreadCount = notifications.filter(n => !n.read).length;

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem('notification-preferences', JSON.stringify(updated));
  }, [preferences]);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Add a new notification
   */
  const addNotification = useCallback((notification: Omit<StatusChangeNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: StatusChangeNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep only last 50 notifications
    return newNotification;
  }, []);

  /**
   * Show toast notification based on preferences
   */
  const showToastNotification = useCallback((
    title: string, 
    description: string, 
    variant: 'default' | 'destructive' = 'default'
  ) => {
    toast({
      title,
      description,
      variant,
      duration: 5000,
    });
  }, [toast]);

  /**
   * Show desktop notification if enabled and permitted
   */
  const showDesktopNotification = useCallback((title: string, body: string) => {
    if (preferences.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'referral-status',
      });
    }
  }, [preferences.desktop]);

  /**
   * Play notification sound if enabled
   */
  const playNotificationSound = useCallback(() => {
    if (preferences.sound) {
      // Create a simple notification sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        console.warn('Failed to play notification sound:', error);
      }
    }
  }, [preferences.sound]);

  /**
   * Notify about referral status change
   */
  const notifyStatusChange = useCallback((
    referral: Referral,
    oldStatus: string,
    patientName: string,
    providerName: string
  ) => {
    if (!preferences.statusChanges) return;

    const statusMessages = {
      pending: 'is being processed',
      sent: 'has been sent to the provider',
      scheduled: 'appointment has been scheduled',
      completed: 'has been completed',
      cancelled: 'has been cancelled',
    };

    const message = `Referral for ${patientName} ${statusMessages[referral.status as keyof typeof statusMessages] || 'status updated'}`;
    
    const notification = addNotification({
      referralId: referral.id,
      patientName,
      providerName,
      oldStatus,
      newStatus: referral.status,
      message,
      type: 'status_change',
    });

    // Show toast notification
    showToastNotification(
      'Referral Status Updated',
      message,
      referral.status === 'cancelled' ? 'destructive' : 'default'
    );

    // Show desktop notification
    showDesktopNotification(
      'Referral Status Updated',
      `${message} with ${providerName}`
    );

    // Play sound
    playNotificationSound();
  }, [preferences.statusChanges, addNotification, showToastNotification, showDesktopNotification, playNotificationSound]);

  /**
   * Notify about appointment scheduled
   */
  const notifyAppointmentScheduled = useCallback((
    referral: Referral,
    patientName: string,
    providerName: string
  ) => {
    if (!preferences.appointments) return;

    const scheduledDate = referral.scheduled_date 
      ? new Date(referral.scheduled_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'soon';

    const message = `Appointment scheduled for ${patientName} with ${providerName} on ${scheduledDate}`;
    
    addNotification({
      referralId: referral.id,
      patientName,
      providerName,
      oldStatus: 'sent',
      newStatus: 'scheduled',
      message,
      type: 'appointment',
    });

    showToastNotification(
      'Appointment Scheduled',
      message
    );

    showDesktopNotification(
      'Appointment Scheduled',
      message
    );

    playNotificationSound();
  }, [preferences.appointments, addNotification, showToastNotification, showDesktopNotification, playNotificationSound]);

  /**
   * Notify about referral completion
   */
  const notifyReferralCompleted = useCallback((
    referral: Referral,
    patientName: string,
    providerName: string
  ) => {
    if (!preferences.completions) return;

    const message = `Care completed for ${patientName} with ${providerName}`;
    
    addNotification({
      referralId: referral.id,
      patientName,
      providerName,
      oldStatus: 'scheduled',
      newStatus: 'completed',
      message,
      type: 'completion',
    });

    showToastNotification(
      'Care Completed',
      message
    );

    showDesktopNotification(
      'Care Completed',
      message
    );

    playNotificationSound();
  }, [preferences.completions, addNotification, showToastNotification, showDesktopNotification, playNotificationSound]);

  /**
   * Notify about referral cancellation
   */
  const notifyReferralCancelled = useCallback((
    referral: Referral,
    patientName: string,
    providerName: string
  ) => {
    if (!preferences.cancellations) return;

    const message = `Referral cancelled for ${patientName} with ${providerName}`;
    
    addNotification({
      referralId: referral.id,
      patientName,
      providerName,
      oldStatus: referral.status === 'cancelled' ? 'sent' : referral.status,
      newStatus: 'cancelled',
      message,
      type: 'cancellation',
    });

    showToastNotification(
      'Referral Cancelled',
      message,
      'destructive'
    );

    showDesktopNotification(
      'Referral Cancelled',
      message
    );

    playNotificationSound();
  }, [preferences.cancellations, addNotification, showToastNotification, showDesktopNotification, playNotificationSound]);

  return {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    clearNotifications,
    notifyStatusChange,
    notifyAppointmentScheduled,
    notifyReferralCompleted,
    notifyReferralCancelled,
  };
}
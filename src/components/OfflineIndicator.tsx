import React, { useEffect, useState } from 'react';
import { useOfflineState } from '@/hooks/use-offline-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  Database,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  /** Show detailed offline information */
  detailed?: boolean;
  /** Show as compact badge instead of full alert */
  compact?: boolean;
  /** Custom className */
  className?: string;
  /** Show retry button */
  showRetryButton?: boolean;
  /** Show cached data count */
  showCachedData?: boolean;
}

export function OfflineIndicator({ 
  detailed = false, 
  compact = false,
  className,
  showRetryButton = true,
  showCachedData = true
}: OfflineIndicatorProps) {
  const offlineState = useOfflineState();
  const [isRetrying, setIsRetrying] = useState(false);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await offlineState.checkConnectivity();
    } finally {
      setIsRetrying(false);
    }
  };

  // Auto-clear transition flags after showing them
  useEffect(() => {
    if (offlineState.justCameOnline || offlineState.justWentOffline) {
      const timer = setTimeout(() => {
        offlineState.clearTransitionFlags();
      }, 5000); // Clear after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [offlineState.justCameOnline, offlineState.justWentOffline, offlineState.clearTransitionFlags]);

  // Don't show anything if online and no recent transitions
  if (!offlineState.isOffline && !offlineState.justCameOnline) {
    return null;
  }

  const getStatusIcon = () => {
    if (offlineState.justCameOnline) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (offlineState.isOffline) {
      return <WifiOff className="h-4 w-4 text-red-600" />;
    }
    return <Wifi className="h-4 w-4 text-green-600" />;
  };

  const getStatusText = () => {
    if (offlineState.justCameOnline) {
      return 'Back Online';
    }
    if (offlineState.isOffline) {
      return 'Offline';
    }
    return 'Online';
  };

  const getStatusVariant = () => {
    if (offlineState.justCameOnline) {
      return 'default';
    }
    if (offlineState.isOffline) {
      return 'destructive';
    }
    return 'default';
  };

  if (compact) {
    return (
      <Badge 
        variant={getStatusVariant() as any}
        className={cn("flex items-center gap-1", className)}
      >
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
        {offlineState.isOffline && offlineState.offlineDuration > 0 && (
          <span className="text-xs opacity-75">
            {formatDuration(offlineState.offlineDuration)}
          </span>
        )}
      </Badge>
    );
  }

  return (
    <Alert 
      variant={offlineState.isOffline ? 'destructive' : 'default'}
      className={cn("mb-4", className)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1">
            <AlertTitle className="flex items-center gap-2">
              {getStatusText()}
              {offlineState.isOffline && offlineState.offlineDuration > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(offlineState.offlineDuration)}
                </Badge>
              )}
            </AlertTitle>
            
            <AlertDescription className="mt-2">
              {offlineState.justCameOnline ? (
                'Connection restored. Data is being synchronized.'
              ) : (
                offlineState.getOfflineMessage()
              )}
            </AlertDescription>

            {detailed && offlineState.isOffline && (
              <div className="mt-3 space-y-2">
                {/* Offline duration progress */}
                {offlineState.offlineDuration > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Offline duration</span>
                      <span>{formatDuration(offlineState.offlineDuration)}</span>
                    </div>
                    <Progress 
                      value={Math.min((offlineState.offlineDuration / 300000) * 100, 100)} 
                      className="h-1"
                    />
                  </div>
                )}

                {/* Failed attempts */}
                {offlineState.failedConnectivityAttempts > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{offlineState.failedConnectivityAttempts} failed connection attempts</span>
                  </div>
                )}

                {/* Cached data info */}
                {showCachedData && offlineState.hasOfflineData && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="h-3 w-3" />
                    <span>{offlineState.getCachedDataCount()} cached items available</span>
                  </div>
                )}

                {/* Available offline features */}
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Available offline:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>View patient list and details</li>
                    <li>Search cached patients</li>
                    <li>View provider information</li>
                    <li>Review referral history</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {offlineState.isOffline && showRetryButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-4 shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
            {isRetrying ? 'Checking...' : 'Retry'}
          </Button>
        )}
      </div>
    </Alert>
  );
}

/**
 * Compact offline status badge for headers/toolbars
 */
export function OfflineStatusBadge({ className }: { className?: string }) {
  return (
    <OfflineIndicator 
      compact 
      showRetryButton={false}
      showCachedData={false}
      className={className}
    />
  );
}

/**
 * Detailed offline status panel for main content areas
 */
export function OfflineStatusPanel({ className }: { className?: string }) {
  return (
    <OfflineIndicator 
      detailed 
      showRetryButton 
      showCachedData
      className={className}
    />
  );
}

/**
 * Hook for conditional offline UI rendering
 */
export function useOfflineDisplay() {
  const offlineState = useOfflineState();
  
  return {
    shouldShowOfflineIndicator: offlineState.isOffline || offlineState.justCameOnline,
    offlineState,
    isOffline: offlineState.isOffline,
    justCameOnline: offlineState.justCameOnline,
    offlineMessage: offlineState.getOfflineMessage(),
    hasOfflineData: offlineState.hasOfflineData,
    cachedDataCount: offlineState.getCachedDataCount(),
  };
}
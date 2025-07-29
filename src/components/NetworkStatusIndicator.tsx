import React from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalHigh, 
  SignalMedium, 
  SignalLow,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkStatusIndicatorProps {
  /** Show detailed network information */
  detailed?: boolean;
  /** Show as compact badge instead of full alert */
  compact?: boolean;
  /** Custom className */
  className?: string;
  /** Show refresh button when offline */
  showRefreshButton?: boolean;
}

export function NetworkStatusIndicator({ 
  detailed = false, 
  compact = false,
  className,
  showRefreshButton = true
}: NetworkStatusIndicatorProps) {
  const networkStatus = useNetworkStatus();

  const getNetworkIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="h-4 w-4" />;
    }

    const quality = networkStatus.getNetworkQuality();
    switch (quality) {
      case 'good':
        return <SignalHigh className="h-4 w-4 text-green-600" />;
      case 'fair':
        return <SignalMedium className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <SignalLow className="h-4 w-4 text-red-600" />;
      default:
        return <Signal className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) {
      return 'Offline';
    }

    const quality = networkStatus.getNetworkQuality();
    switch (quality) {
      case 'good':
        return 'Online - Good Connection';
      case 'fair':
        return 'Online - Fair Connection';
      case 'poor':
        return 'Online - Poor Connection';
      default:
        return 'Online';
    }
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) {
      return 'destructive';
    }

    const quality = networkStatus.getNetworkQuality();
    switch (quality) {
      case 'good':
        return 'default';
      case 'fair':
        return 'secondary';
      case 'poor':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getDetailedInfo = () => {
    if (!detailed || !networkStatus.isOnline) return null;

    const details = [];
    
    if (networkStatus.effectiveType) {
      details.push(`Type: ${networkStatus.effectiveType.toUpperCase()}`);
    }
    
    if (networkStatus.downlink) {
      details.push(`Speed: ${networkStatus.downlink} Mbps`);
    }
    
    if (networkStatus.rtt) {
      details.push(`Latency: ${networkStatus.rtt}ms`);
    }

    return details.length > 0 ? details.join(' • ') : null;
  };

  // Don't show anything if online with good connection and not detailed
  if (networkStatus.isOnline && 
      networkStatus.getNetworkQuality() === 'good' && 
      !detailed && 
      !networkStatus.wasOffline) {
    return null;
  }

  if (compact) {
    return (
      <Badge 
        variant={getStatusColor() as any}
        className={cn("flex items-center gap-1", className)}
      >
        {getNetworkIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
    );
  }

  return (
    <Alert 
      variant={networkStatus.isOnline ? 'default' : 'destructive'}
      className={cn("mb-4", className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getNetworkIcon()}
          <div>
            <AlertDescription className="font-medium">
              {getStatusText()}
            </AlertDescription>
            {detailed && getDetailedInfo() && (
              <AlertDescription className="text-sm text-muted-foreground mt-1">
                {getDetailedInfo()}
              </AlertDescription>
            )}
          </div>
        </div>
        
        {!networkStatus.isOnline && showRefreshButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => networkStatus.checkConnectivity()}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Connection
          </Button>
        )}
      </div>
    </Alert>
  );
}

/**
 * Compact network status badge for use in headers/toolbars
 */
export function NetworkStatusBadge({ className }: { className?: string }) {
  return (
    <NetworkStatusIndicator 
      compact 
      className={className}
    />
  );
}

/**
 * Detailed network status panel for debugging/admin views
 */
export function NetworkStatusPanel({ className }: { className?: string }) {
  return (
    <NetworkStatusIndicator 
      detailed 
      showRefreshButton 
      className={className}
    />
  );
}

/**
 * Hook to get network status for conditional rendering
 */
export function useNetworkStatusDisplay() {
  const networkStatus = useNetworkStatus();
  
  return {
    shouldShowStatus: !networkStatus.isOnline || 
                     networkStatus.getNetworkQuality() !== 'good' ||
                     networkStatus.wasOffline,
    networkStatus,
    statusText: networkStatus.isOnline ? 'Online' : 'Offline',
    statusColor: networkStatus.isOnline ? 'green' : 'red',
    networkQuality: networkStatus.getNetworkQuality(),
  };
}
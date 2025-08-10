import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileNavigationProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  showMenuButton?: boolean;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  title,
  subtitle,
  onBack,
  actions,
  showMenuButton = false,
  onMenuToggle,
  isMenuOpen = false,
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="border-b bg-card safe-area-padding">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left side - Back button or Menu */}
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                onClick={onBack}
                className="gap-2 touch-target"
              >
                <ArrowLeft className="h-4 w-4" />
                {!isMobile && <span>Back</span>}
              </Button>
            )}
            
            {showMenuButton && (
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                onClick={onMenuToggle}
                className="touch-target"
              >
                {isMenuOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Center - Title */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className={`font-bold text-foreground truncate ${
              isMobile ? 'text-lg' : 'text-xl sm:text-2xl'
            }`}>
              {title}
            </h1>
            {subtitle && (
              <p className={`text-muted-foreground truncate ${
                isMobile ? 'text-sm' : 'text-sm sm:text-base'
              }`}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Right side - Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNavigation;
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MobileButtonProps extends ButtonProps {
  mobileSize?: 'sm' | 'default' | 'lg';
  mobileVariant?: ButtonProps['variant'];
  fullWidthOnMobile?: boolean;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  className,
  size,
  variant,
  mobileSize,
  mobileVariant,
  fullWidthOnMobile = false,
  ...props
}) => {
  const isMobile = useIsMobile();

  const effectiveSize = isMobile && mobileSize ? mobileSize : size;
  const effectiveVariant = isMobile && mobileVariant ? mobileVariant : variant;

  return (
    <Button
      {...props}
      size={effectiveSize}
      variant={effectiveVariant}
      className={cn(
        'touch-target mobile-button-spacing',
        isMobile && fullWidthOnMobile && 'w-full',
        isMobile && 'min-h-[44px]', // Ensure minimum touch target size
        className
      )}
    >
      {children}
    </Button>
  );
};

export default MobileButton;
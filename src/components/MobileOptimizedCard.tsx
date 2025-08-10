import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileOptimizedCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  isSelected?: boolean;
  isHighPriority?: boolean;
}

export const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  children,
  onClick,
  className = '',
  isSelected = false,
  isHighPriority = false,
}) => {
  const isMobile = useIsMobile();

  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200
        ${isMobile ? 'active:scale-[0.98] touch-target' : 'hover:shadow-md'}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isHighPriority ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'}
        mobile-focus
        ${className}
      `}
      onClick={onClick}
    >
      <CardContent className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
        {children}
      </CardContent>
    </Card>
  );
};

export default MobileOptimizedCard;
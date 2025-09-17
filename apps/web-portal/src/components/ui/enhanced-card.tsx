'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode, ComponentProps } from 'react';

interface EnhancedCardProps extends ComponentProps<typeof Card> {
  variant?: 'default' | 'glass' | 'glass-strong' | 'gradient' | 'premium' | 'elevated';
  animationType?: 'fade-in' | 'slide-up' | 'scale-in' | 'bounce-subtle' | 'none';
  glowColor?: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
  gradient?: 'primary' | 'secondary' | 'success' | 'warning' | 'premium';
  children?: ReactNode;
}

export function EnhancedCard({
  className,
  variant = 'default',
  animationType = 'fade-in',
  glowColor = 'blue',
  gradient,
  children,
  ...props
}: EnhancedCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'glass':
        return 'glass bg-gradient-card';
      case 'glass-strong':
        return 'glass-strong bg-gradient-card';
      case 'gradient':
        return gradient ? `bg-gradient-${gradient}` : 'bg-gradient-primary';
      case 'premium':
        return 'bg-gradient-premium shadow-glow';
      case 'elevated':
        return 'shadow-strong hover-lift';
      default:
        return 'bg-gradient-card shadow-soft';
    }
  };

  const getAnimationProps = () => {
    switch (animationType) {
      case 'fade-in':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.5 }
        };
      case 'slide-up':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3 }
        };
      case 'scale-in':
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.2 }
        };
      case 'bounce-subtle':
        return {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6 }
        };
      default:
        return {};
    }
  };

  const getGlowClasses = () => {
    if (variant === 'premium') {
      return 'hover-glow';
    }
    return '';
  };

  return (
    <motion.div {...getAnimationProps()}>
      <Card
        className={cn(
          getVariantClasses(),
          getGlowClasses(),
          'transition-all duration-300',
          className
        )}
        {...props}
      >
        {children}
      </Card>
    </motion.div>
  );
}

// Specialized card variants
export function GlassCard({ children, ...props }: Omit<EnhancedCardProps, 'variant'>) {
  return (
    <EnhancedCard variant="glass" {...props}>
      {children}
    </EnhancedCard>
  );
}

export function PremiumCard({ children, ...props }: Omit<EnhancedCardProps, 'variant'>) {
  return (
    <EnhancedCard
      variant="premium"
      animationType="scale-in"
      {...props}
    >
      {children}
    </EnhancedCard>
  );
}

export function ElevatedCard({ children, ...props }: Omit<EnhancedCardProps, 'variant'>) {
  return (
    <EnhancedCard
      variant="elevated"
      animationType="slide-up"
      {...props}
    >
      {children}
    </EnhancedCard>
  );
}

// Skeleton loader component
export function SkeletonCard({ className, ...props }: Omit<EnhancedCardProps, 'children'>) {
  return (
    <EnhancedCard
      className={cn('skeleton-card', className)}
      animationType="none"
      {...props}
    >
      <div className="space-y-3">
        <div className="skeleton-text h-4 w-3/4"></div>
        <div className="skeleton-text h-4 w-1/2"></div>
        <div className="skeleton-text h-4 w-2/3"></div>
        <div className="flex space-x-2">
          <div className="skeleton-button h-8 w-20"></div>
          <div className="skeleton-button h-8 w-16"></div>
        </div>
      </div>
    </EnhancedCard>
  );
}
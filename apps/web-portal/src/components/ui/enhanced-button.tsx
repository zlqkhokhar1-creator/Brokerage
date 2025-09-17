'use client';

import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EnhancedButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient' | 'glow';
  animationType?: 'scale' | 'lift' | 'glow' | 'bounce' | 'none';
  gradient?: 'primary' | 'secondary' | 'success' | 'warning' | 'premium';
}

export function EnhancedButton({
  className,
  variant = 'default',
  animationType = 'scale',
  gradient,
  children,
  ...props
}: EnhancedButtonProps) {
  const getAnimationProps = () => {
    switch (animationType) {
      case 'scale':
        return {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98 },
          transition: { type: "spring" as const, stiffness: 400, damping: 17 }
        };
      case 'lift':
        return {
          whileHover: { y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" },
          whileTap: { y: 0 },
          transition: { type: "spring" as const, stiffness: 400, damping: 17 }
        };
      case 'glow':
        return {
          whileHover: {
            boxShadow: variant === 'gradient' || gradient
              ? "0 0 30px rgba(102, 126, 234, 0.4)"
              : "0 0 20px rgba(102, 126, 234, 0.3)"
          },
          transition: { duration: 0.2 }
        };
      case 'bounce':
        return {
          whileHover: { y: -1 },
          whileTap: { y: 1 },
          transition: { type: "spring" as const, stiffness: 400, damping: 10 }
        };
      default:
        return {};
    }
  };

  const getGradientClasses = () => {
    if (variant === 'gradient' && gradient) {
      return `bg-gradient-${gradient} text-white border-0 hover:shadow-glow`;
    }
    return '';
  };

  return (
    <motion.div {...getAnimationProps()}>
      <Button
        className={cn(
          getGradientClasses(),
          animationType !== 'none' && 'transition-all duration-200',
          className
        )}
        variant={variant === 'gradient' || variant === 'glow' ? 'default' : variant as any}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  );
}

// Specialized button variants
export function PrimaryButton({ children, ...props }: Omit<EnhancedButtonProps, 'variant' | 'gradient'>) {
  return (
    <EnhancedButton
      variant="gradient"
      gradient="primary"
      animationType="glow"
      {...props}
    >
      {children}
    </EnhancedButton>
  );
}

export function SuccessButton({ children, ...props }: Omit<EnhancedButtonProps, 'variant'>) {
  return (
    <EnhancedButton
      variant="default"
      className="bg-green-600 hover:bg-green-700 text-white"
      animationType="lift"
      {...props}
    >
      {children}
    </EnhancedButton>
  );
}

export function PremiumButton({ children, ...props }: Omit<EnhancedButtonProps, 'variant' | 'gradient'>) {
  return (
    <EnhancedButton
      variant="gradient"
      gradient="premium"
      animationType="glow"
      className="shadow-glow"
      {...props}
    >
      {children}
    </EnhancedButton>
  );
}
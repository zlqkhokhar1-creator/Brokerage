import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedArrowProps {
  className?: string;
  variant?: 'default' | 'pulse' | 'bounce' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  direction?: 'right' | 'left' | 'up' | 'down';
}

export const EnhancedArrow: React.FC<EnhancedArrowProps> = ({
  className,
  variant = 'default',
  size = 'md',
  direction = 'right'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const rotationMap = {
    right: 0,
    left: 180,
    up: -90,
    down: 90
  };

  const arrowVariants = {
    default: {
      x: 0,
      scale: 1
    },
    hover: {
      x: variant === 'bounce' ? [0, 5, 0] : 3,
      scale: variant === 'pulse' ? [1, 1.2, 1] : 1.1
    }
  };

  return (
    <motion.div
      className={cn('inline-flex items-center justify-center', className)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        variants={arrowVariants}
        initial="default"
        animate={isHovered ? "hover" : "default"}
        transition={{
          duration: variant === 'bounce' ? 0.6 : 0.3,
          repeat: variant === 'pulse' ? Infinity : 0,
          repeatType: variant === 'pulse' ? 'reverse' : 'loop'
        }}
        style={{ rotate: rotationMap[direction] }}
      >
        <ArrowRight 
          className={cn(
            sizeClasses[size],
            variant === 'glow' && isHovered && 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]'
          )} 
        />
      </motion.div>
      
      {/* Glow effect for glow variant */}
      {variant === 'glow' && isHovered && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
          }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
};

// Enhanced CTA Button Component
interface CTAButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const CTAButton: React.FC<CTAButtonProps> = ({
  children,
  className,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const sizeClasses = {
    sm: 'text-sm px-4 py-2',
    md: 'text-base px-6 py-3',
    lg: 'text-lg px-8 py-4'
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-green-500 to-teal-500 text-white',
    secondary: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black',
    outline: 'border-2 border-green-500 text-green-500 bg-transparent',
    glow: 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
  };

  const handleClick = () => {
    if (disabled) return;
    
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  return (
    <motion.button
      className={cn(
        'relative overflow-hidden rounded-lg font-semibold transition-all duration-300 transform-gpu',
        'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
        sizeClasses[size],
        variantClasses[variant],
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      animate={{
        scale: isClicked ? 0.95 : (isHovered ? 1.02 : 1),
        boxShadow: variant === 'glow' && isHovered 
          ? '0 0 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.2)'
          : '0 4px 15px rgba(0, 0, 0, 0.1)'
      }}
      transition={{
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {/* Background gradient animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-green-600 to-teal-600"
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1.05 : 1
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Shimmer effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 0.8,
            ease: 'easeInOut'
          }}
        />
      )}
      
      {/* Content */}
      <motion.div
        className="relative z-10 flex items-center justify-center gap-2"
        animate={{
          x: isHovered ? 2 : 0
        }}
        transition={{ duration: 0.2 }}
      >
        {icon && iconPosition === 'left' && (
          <motion.div
            animate={{
              rotate: isHovered ? 360 : 0
            }}
            transition={{ duration: 0.5 }}
          >
            {icon}
          </motion.div>
        )}
        
        <span>{children}</span>
        
        {icon && iconPosition === 'right' && (
          <motion.div
            animate={{
              x: isHovered ? 3 : 0
            }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        )}
      </motion.div>
      
      {/* Ripple effect on click */}
      {isClicked && (
        <motion.div
          className="absolute inset-0 bg-white/20 rounded-lg"
          initial={{
            scale: 0,
            opacity: 0.8
          }}
          animate={{
            scale: 2,
            opacity: 0
          }}
          transition={{
            duration: 0.5,
            ease: 'easeOut'
          }}
        />
      )}
    </motion.button>
  );
};

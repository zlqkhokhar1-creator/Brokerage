import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EnhancedArrowProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'magnetic' | 'pulse' | 'bounce';
  onClick?: () => void;
  disabled?: boolean;
  glowColor?: string;
  direction?: 'right' | 'left' | 'up' | 'down';
}

export const EnhancedArrow: React.FC<EnhancedArrowProps> = ({
  className,
  size = 'md',
  variant = 'default',
  onClick,
  disabled = false,
  glowColor = '#00D09C',
  direction = 'right'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const arrowRef = useRef<HTMLDivElement>(null);
  
  // Mouse position for magnetic effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring animations for smooth magnetic effect
  const springX = useSpring(mouseX, { stiffness: 300, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 20 });
  
  // Transform mouse position to arrow movement
  const rotateX = useTransform(springY, [-50, 50], [10, -10]);
  const rotateY = useTransform(springX, [-50, 50], [-10, 10]);

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!arrowRef.current || disabled) return;
    
    const rect = arrowRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * 0.3;
    const deltaY = (e.clientY - centerY) * 0.3;
    
    mouseX.set(deltaX);
    mouseY.set(deltaY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleClick = () => {
    if (disabled) return;
    
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  // Base animation variants
  const baseVariants = {
    initial: {
      scale: 1,
      rotate: rotationMap[direction],
      filter: 'brightness(1) drop-shadow(0 0 0 transparent)'
    },
    hover: {
      scale: variant === 'magnetic' ? 1.2 : 1.1,
      rotate: rotationMap[direction],
      filter: `brightness(1.2) drop-shadow(0 0 8px ${glowColor}40)`,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    clicked: {
      scale: 0.8,
      rotate: rotationMap[direction],
      transition: {
        duration: 0.1,
        ease: 'easeOut'
      }
    }
  };

  // Pulse animation for continuous attention
  const pulseVariants = {
    initial: {
      scale: 1,
      opacity: 1
    },
    pulse: {
      scale: [1, 1.1, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  // Bounce animation
  const bounceVariants = {
    initial: {
      y: 0
    },
    bounce: {
      y: [-2, 0, -2],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  // Wrapper for magnetic effect
  const MagneticWrapper = ({ children }: { children: React.ReactNode }) => {
    if (variant === 'magnetic') {
      return (
        <motion.div
          ref={arrowRef}
          style={{
            x: springX,
            y: springY,
            rotateX,
            rotateY
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className={cn(
            'cursor-pointer transform-gpu perspective-1000',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {children}
        </motion.div>
      );
    }
    
    return (
      <div
        ref={arrowRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={cn(
          'cursor-pointer transform-gpu',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {children}
      </div>
    );
  };

  return (
    <MagneticWrapper>
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: isHovered
            ? `0 0 20px ${glowColor}60, 0 0 40px ${glowColor}40`
            : '0 0 0 transparent'
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Ripple effect on click */}
      {isClicked && (
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: glowColor
          }}
          initial={{
            scale: 1,
            opacity: 0.8
          }}
          animate={{
            scale: 2,
            opacity: 0
          }}
          transition={{
            duration: 0.4,
            ease: 'easeOut'
          }}
        />
      )}
      
      {/* Main arrow with animations */}
      <motion.div
        className={cn(
          'relative z-10 flex items-center justify-center',
          sizeClasses[size],
          className
        )}
        variants={baseVariants}
        initial="initial"
        animate={isClicked ? 'clicked' : (isHovered ? 'hover' : 'initial')}
      >
        {/* Pulse animation overlay */}
        {variant === 'pulse' && (
          <motion.div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              sizeClasses[size]
            )}
            variants={pulseVariants}
            initial="initial"
            animate="pulse"
          >
            <ArrowRight 
              className={cn(
                sizeClasses[size],
                'text-secondary opacity-60'
              )}
            />
          </motion.div>
        )}
        
        {/* Bounce animation wrapper */}
        <motion.div
          variants={bounceVariants}
          initial="initial"
          animate={variant === 'bounce' ? 'bounce' : 'initial'}
          className="flex items-center justify-center"
        >
          <ArrowRight 
            className={cn(
              sizeClasses[size],
              'text-current transition-colors duration-200',
              isHovered && 'text-secondary'
            )}
          />
        </motion.div>
      </motion.div>
      
      {/* Particle trail effect on hover */}
      {isHovered && variant === 'magnetic' && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: glowColor,
                left: '50%',
                top: '50%'
              }}
              animate={{
                x: [0, (i + 1) * -20, (i + 1) * -40],
                y: [0, (i + 1) * -5, (i + 1) * -10],
                opacity: [1, 0.5, 0],
                scale: [1, 0.8, 0.4]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeOut'
              }}
            />
          ))}
        </motion.div>
      )}
    </MagneticWrapper>
  );
};

// Enhanced Call-to-Action Button with compelling arrow
export const CTAButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  className,
  disabled = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const baseClasses = {
    primary: 'bg-secondary text-white hover:bg-accent',
    secondary: 'bg-white text-primary border border-border hover:bg-background-alt'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  return (
    <motion.button
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 overflow-hidden group',
        baseClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-secondary to-accent opacity-0"
        animate={{
          opacity: isHovered ? 0.1 : 0
        }}
        transition={{ duration: 0.3 }}
      />
      
      <span className="relative z-10 mr-2">{children}</span>
      
      <EnhancedArrow
        variant="magnetic"
        size={size === 'lg' ? 'md' : 'sm'}
        className="relative z-10 group-hover:translate-x-1 transition-transform duration-200"
      />
    </motion.button>
  );
};
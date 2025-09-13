import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EnhancedCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  tilt?: boolean;
  glow?: boolean;
  expandable?: boolean;
  glowColor?: string;
  hoverEffect?: 'scale' | 'lift' | 'glow' | 'none';
}

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  className,
  hover = false,
  tilt = false,
  glow = false,
  expandable = false,
  glowColor = '#00D09C',
  hoverEffect = 'scale'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const cardVariants = {
    initial: {
      scale: 1,
      rotateX: 0,
      rotateY: 0,
      y: 0,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    },
    hover: {
      scale: hover && hoverEffect === 'scale' ? 1.02 : 1,
      y: hover && hoverEffect === 'lift' ? -5 : 0,
      rotateX: tilt && isHovered ? 5 : 0,
      rotateY: tilt && isHovered ? 5 : 0,
      zIndex: hover ? 20 : 0,
      boxShadow: hover && hoverEffect === 'glow' 
        ? `0 0 20px 5px ${glowColor}40` 
        : hover && hoverEffect === 'lift'
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }
  };

  const transition = {
    duration: 0.3,
    ease: [0.25, 0.46, 0.45, 0.94] as const
  };

  const glowVariants = {
    initial: {
      boxShadow: `0 0 0 rgba(0, 208, 156, 0)`
    },
    hover: {
      boxShadow: glow && isHovered 
        ? `0 0 30px rgba(0, 208, 156, 0.3)`
        : `0 0 0 rgba(0, 208, 156, 0)`
    }
  };

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm',
        className
      )}
      variants={cardVariants}
      initial="initial"
      whileHover={hover ? 'hover' : undefined}
      onHoverStart={() => hover && setIsHovered(true)}
      onHoverEnd={() => hover && setIsHovered(false)}
      onClick={() => expandable && setIsExpanded(!isExpanded)}
      transition={transition}
      style={{
        cursor: expandable ? 'pointer' : 'default',
        zIndex: isHovered ? 20 : 0,
      }}
    >
      <motion.div
        variants={glowVariants}
        initial="initial"
        animate={isHovered ? "hover" : "initial"}
        className="w-full h-full"
      >
        <motion.div
          animate={{
            height: expandable && isExpanded ? 'auto' : 'auto'
          }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Enhanced Magnetic Button Component with Compelling Micro-interactions
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'pulse' | 'glow' | 'magnetic';
  size?: 'sm' | 'md' | 'lg';
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className,
  onClick,
  disabled = false,
  variant = 'magnetic',
  size = 'md'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Enhanced mouse tracking with spring physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { stiffness: 200, damping: 20, mass: 0.5 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);
  
  // 3D rotation based on mouse position
  const rotateX = useTransform(y, [-100, 100], [8, -8]);
  const rotateY = useTransform(x, [-100, 100], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || disabled) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * 0.2;
    const deltaY = (e.clientY - centerY) * 0.2;
    
    mouseX.set(deltaX);
    mouseY.set(deltaY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleClick = () => {
    if (disabled) return;
    
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  const sizeClasses = {
    sm: 'text-sm px-3 py-2',
    md: 'text-base px-4 py-3',
    lg: 'text-lg px-6 py-4'
  };

  return (
    <motion.button
      ref={buttonRef}
      className={cn(
        'relative overflow-hidden transform-gpu perspective-1000 rounded-lg font-medium transition-colors duration-200',
        sizeClasses[size],
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
      style={{
        transformStyle: 'preserve-3d'
      }}
      animate={{
        x: variant === 'magnetic' ? x : 0,
        y: variant === 'magnetic' ? y : 0,
        scale: isClicked ? 0.95 : (isHovered ? 1.05 : 1),
        rotateX: variant === 'magnetic' ? rotateX : 0,
        rotateY: variant === 'magnetic' ? rotateY : 0
      }}
      transition={{
        scale: { duration: 0.1 },
        x: { type: 'spring', stiffness: 200, damping: 20 },
        y: { type: 'spring', stiffness: 200, damping: 20 }
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
    >
      {/* Enhanced Background Gradient with Compelling Animations */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-green-500 to-teal-500"
        animate={{
          opacity: isHovered ? 0.15 : 0,
          scale: isHovered ? 1.1 : 1,
          rotate: isHovered ? 1 : 0
        }}
        transition={{ 
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      />
      
      {/* Pulse Animation Overlay */}
      {variant === 'pulse' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-lg"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}
      
      {/* Glow Effect */}
      {(variant === 'glow' || isHovered) && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          animate={{
            boxShadow: isHovered
              ? '0 0 30px rgba(0, 208, 156, 0.4), 0 0 60px rgba(0, 208, 156, 0.2)'
              : '0 0 0 transparent'
          }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* Click Ripple Effect */}
      {isClicked && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-green-500"
          initial={{
            scale: 0.8,
            opacity: 0.8
          }}
          animate={{
            scale: 1.5,
            opacity: 0
          }}
          transition={{
            duration: 0.4,
            ease: 'easeOut'
          }}
        />
      )}
      
      {/* Shimmer Effect on Hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 0.6,
            ease: 'easeInOut'
          }}
        />
      )}
      
      {/* Content with enhanced z-index */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        animate={{
          color: isHovered ? '#ffffff' : 'inherit'
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
      
      {/* Floating particles on hover for magnetic variant */}
      {isHovered && variant === 'magnetic' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-green-500/60"
              style={{
                left: `${20 + i * 10}%`,
                top: `${30 + (i % 2) * 40}%`
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
      )}
    </motion.button>
  );
};

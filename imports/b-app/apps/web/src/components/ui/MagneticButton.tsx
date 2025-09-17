import React, { useRef, useState } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { ButtonHTMLAttributes } from 'react';

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  magneticForce?: number;
  asChild?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'glow' | 'pulse';
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  magneticForce = 0.3,
  asChild = false,
  size = 'default',
  variant = 'default',
  ...props
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, (val) => {
    const mapped = (val / 100) * 15;
    return Math.max(-15, Math.min(15, mapped));
  }) as unknown as number; // Type assertion to handle Framer Motion types
  
  const rotateY = useTransform(x, (val) => {
    const mapped = (val / 100) * -15;
    return Math.max(-15, Math.min(15, mapped));
  }) as unknown as number; // Type assertion to handle Framer Motion types
  
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    const x = e.clientX - left - width / 2;
    const y = e.clientY - top - height / 2;
    
    setPosition({ x, y });
    
    const xVal = e.clientX - left - width / 2;
    const yVal = e.clientY - top - height / 2;
    
    (x as any).set(xVal);
    (y as any).set(yVal);
    
    controls.start({
      x: xVal * magneticForce,
      y: yVal * magneticForce,
      transition: { type: 'spring', stiffness: 200, damping: 20, mass: 0.5 }
    });
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    controls.start({
      x: 0,
      y: 0,
      transition: { 
        type: 'spring', 
        stiffness: 200, 
        damping: 20, 
        mass: 0.5 
      }
    });
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <motion.div
      style={{
        perspective: 1000,
        display: 'inline-block',
      }}
      animate={{
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
      }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 100,
      }}
    >
      <motion.div
        animate={controls}
        onMouseMove={handleMouseMove as any}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'inline-block',
          transformStyle: 'preserve-3d',
        }}
      >
        <Button
          ref={ref}
          className={`relative overflow-hidden ${className}`}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          size={size}
          variant={variant}
          {...props}
        >
          {children}
          {isHovered && (
            <motion.span 
              className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 0.3 }}
              style={{
                background: `radial-gradient(circle at ${position.x + 50}% ${position.y + 50}%, rgba(255,255,255,0.1), transparent 70%)`
              }}
            />
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default MagneticButton;

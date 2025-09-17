import { motion, Variants } from 'framer-motion';
import React from 'react';

interface MotionWrapperProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
  xOffset?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  once?: boolean;
  viewport?: {
    once?: boolean;
    amount?: number | 'some' | 'all';
    margin?: string;
  };
}

export const MotionWrapper: React.FC<MotionWrapperProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  yOffset = 20,
  xOffset = 0,
  scale = 1,
  rotate = 0,
  opacity = 0,
  once = true,
  viewport = { once: true, amount: 0.1 },
}) => {
  const variants: Variants = {
    hidden: {
      y: yOffset,
      x: xOffset,
      opacity: opacity,
      scale: scale,
      rotate: rotate,
    },
    visible: {
      y: 0,
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 100,
        delay: delay,
        duration: duration,
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
    >
      {children}
    </motion.div>
  );
};

export const StaggerWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
  delayChildren?: number;
}> = ({ children, className = '', staggerChildren = 0.1, delayChildren = 0 }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerChildren,
            delayChildren: delayChildren,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

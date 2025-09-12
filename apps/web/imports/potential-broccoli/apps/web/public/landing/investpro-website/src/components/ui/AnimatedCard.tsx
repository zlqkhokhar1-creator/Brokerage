import React from 'react';
import { motion } from 'framer-motion';
import { fadeIn, cardHover } from '../../animations';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  className = '', 
  hover = true,
  delay = 0
}) => {
  return (
    <motion.div
      className={`bg-white rounded-2xl p-6 shadow-lg border border-light-grey ${className}`}
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay }}
      whileHover={hover ? "hover" : undefined}
      {...(hover && cardHover)}
    >
      {children}
    </motion.div>
  );
};
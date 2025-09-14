"use client";
import React, { useState } from 'react';
import { motion } from '@/components/MotionWrappers';
import { Smartphone, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppDownloadButtonsProps {
  className?: string;
  variant?: 'horizontal' | 'vertical';
  theme?: 'light' | 'dark';
  showComingSoon?: boolean;
}

export const AppDownloadButtons: React.FC<AppDownloadButtonsProps> = ({
  className,
  variant = 'horizontal',
  theme = 'light',
  showComingSoon = false
}) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const buttonVariants = {
    initial: {
      scale: 1,
      y: 0
    },
    hover: {
      scale: 1.05,
      y: -2,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const iconVariants = {
    initial: {
      rotate: 0,
      scale: 1
    },
    hover: {
      rotate: 10,
      scale: 1.1,
      transition: {
        duration: 0.3
      }
    }
  };

  const themeClasses = {
    light: {
      button: 'bg-black text-white hover:bg-gray-800',
      text: 'text-white',
      subtext: 'text-gray-300'
    },
    dark: {
      button: 'bg-white text-black hover:bg-gray-100 border border-white/20',
      text: 'text-black',
      subtext: 'text-gray-600'
    }
  };

  const currentTheme = themeClasses[theme];

  const AppStoreButton = () => (
    <motion.button
      className={cn(
        'relative overflow-hidden rounded-lg px-4 py-2 flex items-center space-x-3 transition-all duration-300',
        'min-w-[140px] h-[50px]',
        currentTheme.button,
        className
      )}
      variants={buttonVariants}
      initial="initial"
      animate={hoveredButton === 'appstore' ? "hover" : "initial"}
      onHoverStart={() => setHoveredButton('appstore')}
      onHoverEnd={() => setHoveredButton(null)}
      disabled={showComingSoon}
    >
      {/* Background shimmer effect */}
      {hoveredButton === 'appstore' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 0.8,
            ease: 'easeInOut'
          }}
        />
      )}
      
      <motion.div
        variants={iconVariants}
        initial="initial"
        animate={hoveredButton === 'appstore' ? "hover" : "initial"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </motion.div>
      
      <div className="flex flex-col items-start">
        <div className={cn('text-xs', currentTheme.subtext)}>
          {showComingSoon ? 'Coming Soon' : 'Download on the'}
        </div>
        <div className={cn('text-sm font-semibold', currentTheme.text)}>
          App Store
        </div>
      </div>
      
      {showComingSoon && (
        <motion.div
          className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-xs font-medium text-white/80">Coming Soon</span>
        </motion.div>
      )}
    </motion.button>
  );

  const GooglePlayButton = () => (
    <motion.button
      className={cn(
        'relative overflow-hidden rounded-lg px-4 py-2 flex items-center space-x-3 transition-all duration-300',
        'min-w-[140px] h-[50px]',
        currentTheme.button,
        className
      )}
      variants={buttonVariants}
      initial="initial"
      animate={hoveredButton === 'googleplay' ? "hover" : "initial"}
      onHoverStart={() => setHoveredButton('googleplay')}
      onHoverEnd={() => setHoveredButton(null)}
      disabled={showComingSoon}
    >
      {/* Background shimmer effect */}
      {hoveredButton === 'googleplay' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 0.8,
            ease: 'easeInOut'
          }}
        />
      )}
      
      <motion.div
        variants={iconVariants}
        initial="initial"
        animate={hoveredButton === 'googleplay' ? "hover" : "initial"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
        </svg>
      </motion.div>
      
      <div className="flex flex-col items-start">
        <div className={cn('text-xs', currentTheme.subtext)}>
          {showComingSoon ? 'Coming Soon' : 'Get it on'}
        </div>
        <div className={cn('text-sm font-semibold', currentTheme.text)}>
          Google Play
        </div>
      </div>
      
      {showComingSoon && (
        <motion.div
          className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-xs font-medium text-white/80">Coming Soon</span>
        </motion.div>
      )}
    </motion.button>
  );

  return (
    <motion.div
      className={cn(
        'flex gap-3',
        variant === 'vertical' ? 'flex-col' : 'flex-row',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <AppStoreButton />
      <GooglePlayButton />
    </motion.div>
  );
};

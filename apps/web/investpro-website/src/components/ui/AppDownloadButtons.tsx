import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Apple } from 'lucide-react';

interface AppDownloadButtonsProps {
  variant?: 'default' | 'compact' | 'horizontal';
  theme?: 'light' | 'dark';
  showComingSoon?: boolean;
  className?: string;
}

export const AppDownloadButtons: React.FC<AppDownloadButtonsProps> = ({
  variant = 'default',
  theme = 'light',
  showComingSoon = true,
  className = ''
}) => {
  const buttonBaseClass = `
    inline-flex items-center justify-center rounded-lg border transition-all duration-200
    hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const getButtonClass = (store: 'apple' | 'google') => {
    const baseClasses = buttonBaseClass;
    
    if (theme === 'dark') {
      return `${baseClasses} bg-gray-900 border-gray-700 text-white hover:bg-gray-800 focus:ring-gray-500`;
    }
    
    return `${baseClasses} bg-black border-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500`;
  };

  const getSize = () => {
    switch (variant) {
      case 'compact':
        return { padding: 'px-3 py-2', text: 'text-xs', iconSize: 'w-4 h-4' };
      case 'horizontal':
        return { padding: 'px-4 py-3', text: 'text-sm', iconSize: 'w-5 h-5' };
      default:
        return { padding: 'px-6 py-3', text: 'text-sm', iconSize: 'w-6 h-6' };
    }
  };

  const size = getSize();
  const isHorizontal = variant === 'horizontal';

  const AppStoreButton = () => (
    <motion.a
      href="#"
      className={`${getButtonClass('apple')} ${size.padding} relative overflow-hidden group`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.preventDefault();
        // TODO: Replace with actual App Store URL when available
        console.log('App Store download clicked');
      }}
    >
      <div className="flex items-center space-x-2">
        <Apple className={`${size.iconSize} fill-current`} />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs opacity-75">
            {showComingSoon ? 'Coming Soon' : 'Download on the'}
          </span>
          <span className={`${size.text} font-semibold -mt-0.5`}>App Store</span>
        </div>
      </div>
      {showComingSoon && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
    </motion.a>
  );

  const PlayStoreButton = () => (
    <motion.a
      href="#"
      className={`${getButtonClass('google')} ${size.padding} relative overflow-hidden group`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.preventDefault();
        // TODO: Replace with actual Play Store URL when available
        console.log('Play Store download clicked');
      }}
    >
      <div className="flex items-center space-x-2">
        <div className={`${size.iconSize} flex items-center justify-center`}>
          {/* Google Play Store Icon */}
          <svg viewBox="0 0 24 24" className={`${size.iconSize} fill-current`}>
            <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
          </svg>
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs opacity-75">
            {showComingSoon ? 'Coming Soon' : 'Get it on'}
          </span>
          <span className={`${size.text} font-semibold -mt-0.5`}>Google Play</span>
        </div>
      </div>
      {showComingSoon && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
    </motion.a>
  );

  return (
    <div className={`
      flex ${isHorizontal ? 'flex-row space-x-4' : 'flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4'} 
      ${className}
    `}>
      <AppStoreButton />
      <PlayStoreButton />
    </div>
  );
};

// Standalone components for specific use cases
export const AppStoreButton: React.FC<{
  compact?: boolean;
  theme?: 'light' | 'dark';
  showComingSoon?: boolean;
}> = ({ compact = false, theme = 'light', showComingSoon = true }) => (
  <AppDownloadButtons 
    variant={compact ? 'compact' : 'default'} 
    theme={theme}
    showComingSoon={showComingSoon}
    className="flex-row space-x-0"
  />
);

export const MobileAppPromo: React.FC<{
  title?: string;
  subtitle?: string;
  theme?: 'light' | 'dark';
}> = ({ 
  title = "Get the InvestPro App",
  subtitle = "Trade and invest on the go with our mobile app",
  theme = 'light'
}) => {
  return (
    <motion.div 
      className={`
        rounded-2xl p-6 text-center
        ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-white" />
        </div>
      </div>
      
      <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h3>
      
      <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        {subtitle}
      </p>
      
      <AppDownloadButtons 
        variant="horizontal" 
        theme={theme}
        showComingSoon={true}
      />
    </motion.div>
  );
};
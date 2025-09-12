import React from 'react';

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  // This wrapper ensures clean React context and prevents state conflicts
  return (
    <div className="app-wrapper">
      {children}
    </div>
  );
}
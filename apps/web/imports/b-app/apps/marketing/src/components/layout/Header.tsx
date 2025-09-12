import React, { useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { AppDownloadButtons } from '../ui/AppDownloadButtons';
import { Menu, X, ChevronDown, Smartphone } from 'lucide-react';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();
  const hoverTimeoutRef = useRef<number | null>(null);

  // Clear any existing timeout
  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Handle mouse enter with immediate dropdown show
  const handleMouseEnter = useCallback((label: string) => {
    clearHoverTimeout();
    setActiveDropdown(label);
  }, [clearHoverTimeout]);

  // Handle mouse leave with delayed dropdown hide
  const handleMouseLeave = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = window.setTimeout(() => {
      setActiveDropdown(null);
    }, 500); // 500ms delay before closing
  }, [clearHoverTimeout]);

  // Handle dropdown area mouse enter (prevent closing when hovering over dropdown)
  const handleDropdownEnter = useCallback(() => {
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navigationItems = [
    {
      label: 'Trade',
      path: '/trade',
      children: [
        { label: 'Stocks & ETFs', path: '/trade/stocks-etfs' },
        { label: 'Mutual Funds', path: '/trade/mutual-funds' }
      ]
    },
    {
      label: 'Invest',
      path: '/invest',
      children: [
        { label: 'Robo-Advisor', path: '/invest/robo-advisor' },
        { label: 'Private Wealth', path: '/invest/private-wealth' }
      ]
    },
    {
      label: 'Pricing',
      path: '/pricing'
    },
    {
      label: 'Discover',
      path: '/discover',
      children: [
        { label: 'Blog', path: '/discover/blog' },
        { label: 'Retirement Calculator', path: '/discover/retirement-calculator' }
      ]
    }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">IP</span>
            </div>
            <span className="text-2xl font-heading font-bold text-primary">InvestPro</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && handleMouseEnter(item.label)}
                onMouseLeave={handleMouseLeave}
              >
                {item.children ? (
                  <button className={`flex items-center space-x-1 py-2 text-sm font-medium transition-colors ${
                    isActive(item.path) ? 'text-secondary' : 'text-foreground hover:text-secondary'
                  }`}>
                    <span>{item.label}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    to={item.path!}
                    className={`py-2 text-sm font-medium transition-colors ${
                      isActive(item.path!) ? 'text-secondary' : 'text-foreground hover:text-secondary'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
                
                {/* Dropdown Menu */}
                {item.children && activeDropdown === item.label && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-border py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-200"
                    onMouseEnter={handleDropdownEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className="block px-4 py-2 text-sm text-foreground hover:text-secondary hover:bg-background-alt transition-colors duration-150"
                        onClick={() => setActiveDropdown(null)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button variant="ghost" size="sm">Log In</Button>
            <Button variant="primary" size="sm">Sign Up</Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-foreground hover:text-secondary transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <nav className="space-y-4">
              {navigationItems.map((item) => (
                <div key={item.label}>
                  {item.children ? (
                    <div>
                      <div className="font-medium text-foreground py-2">{item.label}</div>
                      <div className="pl-4 space-y-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className="block py-2 text-sm text-muted hover:text-secondary transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      to={item.path!}
                      className="block py-2 font-medium text-foreground hover:text-secondary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              <div className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start">Log In</Button>
                  <Button variant="primary" size="sm" className="w-full">Sign Up</Button>
                </div>
                
                <div className="border-t border-border pt-4">
                  <div className="flex items-center mb-3">
                    <Smartphone className="w-4 h-4 mr-2 text-secondary" />
                    <span className="text-sm font-medium text-foreground">Get the App</span>
                  </div>
                  <AppDownloadButtons 
                    variant="compact" 
                    theme="light" 
                    showComingSoon={true}
                    className="w-full"
                  />
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
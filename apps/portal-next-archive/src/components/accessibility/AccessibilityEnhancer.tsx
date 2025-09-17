"use client";
'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Type, Volume2, Eye, EyeOff, Contrast, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ThemeMode = 'light' | 'dark' | 'system';
type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

interface AccessibilitySettings {
  theme: ThemeMode;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  contrast: number;
  colorBlindMode: ColorBlindMode;
  reduceAnimations: boolean;
  highlightLinks: boolean;
  voiceControl: boolean;
  showAccessibilityMenu: boolean;
}

export function AccessibilityEnhancer() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => ({
    theme: 'system',
    fontSize: 1,
    lineHeight: 1.5,
    letterSpacing: 0,
    contrast: 1,
    colorBlindMode: 'none',
    reduceAnimations: false,
    highlightLinks: true,
    voiceControl: false,
    showAccessibilityMenu: false
  }));

  // Apply accessibility settings when they change
  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    
    // Set CSS variables based on settings
    root.style.setProperty('--font-size-multiplier', settings.fontSize.toString());
    root.style.setProperty('--line-height-multiplier', settings.lineHeight.toString());
    root.style.setProperty('--letter-spacing', `${settings.letterSpacing}px`);
    root.style.setProperty('--contrast', settings.contrast.toString());
    
    // Apply color blind mode
    root.classList.remove(
      'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'
    );
    
    if (settings.colorBlindMode !== 'none') {
      root.classList.add(settings.colorBlindMode);
    }
    
    // Apply reduced motion
    if (settings.reduceAnimations) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--transition-duration', '0.01ms' );
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }
    
    // Apply link highlighting
    if (settings.highlightLinks) {
      root.classList.add('highlight-links');
    } else {
      root.classList.remove('highlight-links');
    }
    
    // Handle theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Add global styles for accessibility
    const styleId = 'accessibility-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      :root {
        --font-size-base: calc(1rem * var(--font-size-multiplier, 1));
        --line-height-base: calc(1.5 * var(--line-height-multiplier, 1));
        --letter-spacing-base: var(--letter-spacing, 0);
        --contrast-filter: contrast(var(--contrast, 1));
      }
      
      body {
        font-size: var(--font-size-base);
        line-height: var(--line-height-base);
        letter-spacing: var(--letter-spacing-base);
        filter: var(--contrast-filter);
      }
      
      .highlight-links a {
        text-decoration: underline !important;
        text-decoration-thickness: 2px !important;
        text-underline-offset: 2px !important;
      }
      
      /* Color blind simulation filters */
      .protanopia {
        --color-blindness-filter: url('#protanopia');
      }
      
      .deuteranopia {
        --color-blindness-filter: url('#deuteranopia');
      }
      
      .tritanopia {
        --color-blindness-filter: url('#tritanopia');
      }
      
      .achromatopsia {
        --color-blindness-filter: url('#achromatopsia');
      }
      
      /* Apply color blindness filter to the entire page */
      .protanopia,
      .deuteranopia,
      .tritanopia,
      .achromatopsia {
        filter: var(--color-blindness-filter);
      }
    `;
    
    // Add SVG filters for color blindness simulation
    const svgFilters = `
      <svg aria-hidden="true" style="position: absolute; width: 0; height: 0; overflow: hidden;" version="1.1">
        <defs>
          <!-- Protanopia (red-weak) -->
          <filter id="protanopia" x="0" y="0">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" />
          </filter>
          
          <!-- Deuteranopia (green-weak) -->
          <filter id="deuteranopia" x="0" y="0">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" />
          </filter>
          
          <!-- Tritanopia (blue-weak) -->
          <filter id="tritanopia" x="0" y="0">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" />
          </filter>
          
          <!-- Achromatopsia (monochrome) -->
          <filter id="achromatopsia" x="0" y="0">
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>
    `;
    
    // Add SVG filters to the document if not already present
    if (!document.getElementById('color-blindness-filters')) {
      const svgContainer = document.createElement('div');
      svgContainer.id = 'color-blindness-filters';
      svgContainer.innerHTML = svgFilters;
      document.body.appendChild(svgContainer);
    }
    
    // Cleanup function
    return () => {
      // Remove the style element when component unmounts
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
      
      // Reset styles
      root.style.removeProperty('--font-size-multiplier');
      root.style.removeProperty('--line-height-multiplier');
      root.style.removeProperty('--letter-spacing');
      root.style.removeProperty('--contrast');
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
      root.classList.remove('highlight-links');
    };
  }, [settings]);
  
  // Set up voice control commands
  useEffect(() => {
    if (!settings.voiceControl) return;
    
    const commands = {
      'increase text size': () => {
        setSettings(s => ({
          ...s,
          fontSize: Math.min(2, s.fontSize + 0.1)
        }));
      },
      'decrease text size': () => {
        setSettings(s => ({
          ...s,
          fontSize: Math.max(0.8, s.fontSize - 0.1)
        }));
      },
      'reset text size': () => {
        setSettings(s => ({
          ...s,
          fontSize: 1
        }));
      },
      'increase contrast': () => {
        setSettings(s => ({
          ...s,
          contrast: Math.min(2, s.contrast + 0.1)
        }));
      },
      'decrease contrast': () => {
        setSettings(s => ({
          ...s,
          contrast: Math.max(1, s.contrast - 0.1)
        }));
      },
      'reset contrast': () => {
        setSettings(s => ({
          ...s,
          contrast: 1
        }));
      },
      'toggle dark mode': () => {
        setSettings(s => ({
          ...s,
          theme: s.theme === 'dark' ? 'light' : 'dark'
        }));
      },
      'open accessibility menu': () => {
        setSettings(s => ({
          ...s,
          showAccessibilityMenu: true
        }));
      },
      'close accessibility menu': () => {
        setSettings(s => ({
          ...s,
          showAccessibilityMenu: false
        }));
      },
      'enable color blind mode': (mode: string) => {
        const validModes = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
        if (validModes.includes(mode)) {
          setSettings(s => ({
            ...s,
            colorBlindMode: mode as ColorBlindMode
          }));
        }
      },
      'disable color blind mode': () => {
        setSettings(s => ({
          ...s,
          colorBlindMode: 'none'
        }));
      },
      'enable reduced motion': () => {
        setSettings(s => ({
          ...s,
          reduceAnimations: true
        }));
      },
      'disable reduced motion': () => {
        setSettings(s => ({
          ...s,
          reduceAnimations: false
        }));
      },
      'highlight links': () => {
        setSettings(s => ({
          ...s,
          highlightLinks: true
        }));
      },
      'remove link highlighting': () => {
        setSettings(s => ({
          ...s,
          highlightLinks: false
        }));
      }
    };
    
    // Simple voice command recognition
    const handleVoiceCommand = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase().trim();
      console.log('Voice command:', command);
      
      // Check for exact matches first
      if (commands[command as keyof typeof commands]) {
        commands[command as keyof typeof commands]();
        return;
      }
      
      // Check for color blind mode commands
      const colorBlindModeMatch = command.match(/enable (protanopia|deuteranopia|tritanopia|achromatopsia) mode/i);
      if (colorBlindModeMatch) {
        commands['enable color blind mode'](colorBlindModeMatch[1].toLowerCase());
        return;
      }
    };
    
    // Set up speech recognition if available
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = handleVoiceCommand;
      
      // Start listening
      recognition.start();
      
      // Clean up
      return () => {
        recognition.stop();
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }, [settings.voiceControl]);
  
  const toggleAccessibilityMenu = () => {
    setSettings(s => ({
      ...s,
      showAccessibilityMenu: !s.showAccessibilityMenu
    }));
  };
  
  const resetAccessibilitySettings = () => {
    setSettings({
      theme: 'system',
      fontSize: 1,
      lineHeight: 1.5,
      letterSpacing: 0,
      contrast: 1,
      colorBlindMode: 'none',
      reduceAnimations: false,
      highlightLinks: true,
      voiceControl: false,
      showAccessibilityMenu: settings.showAccessibilityMenu
    });
  };
  
  const toggleTheme = (theme: ThemeMode) => {
    setSettings(s => ({
      ...s,
      theme
    }));
  };
  
  const toggleColorBlindMode = (mode: ColorBlindMode) => {
    setSettings(s => ({
      ...s,
      colorBlindMode: s.colorBlindMode === mode ? 'none' : mode
    }));
  };
  
  return (
    <>
      {/* Accessibility Menu Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleAccessibilityMenu}
                className="rounded-full h-14 w-14 shadow-lg"
                aria-label="Accessibility settings"
                aria-expanded={settings.showAccessibilityMenu}
                aria-controls="accessibility-menu"
              >
                {settings.showAccessibilityMenu ? (
                  <ArrowLeft className="h-6 w-6" />
                ) : (
                  <Contrast className="h-6 w-6" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Accessibility Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Accessibility Menu */}
      {settings.showAccessibilityMenu && (
        <div 
          id="accessibility-menu"
          className="fixed bottom-24 right-6 w-80 bg-background rounded-lg shadow-xl border p-4 z-50 space-y-4"
          role="dialog"
          aria-labelledby="accessibility-menu-title"
          aria-modal="true"
        >
          <div className="flex items-center justify-between">
            <h2 id="accessibility-menu-title" className="text-lg font-semibold">
              Accessibility Settings
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={resetAccessibilitySettings}
              aria-label="Reset all accessibility settings"
            >
              Reset All
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* Theme Selector */}
            <div>
              <h3 className="text-sm font-medium mb-2">Theme</h3>
              <div className="flex gap-2">
                <Toggle
                  pressed={settings.theme === 'light'}
                  onPressedChange={() => toggleTheme('light')}
                  className="flex-1"
                  aria-label="Light theme"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Toggle>
                <Toggle
                  pressed={settings.theme === 'dark'}
                  onPressedChange={() => toggleTheme('dark')}
                  className="flex-1"
                  aria-label="Dark theme"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Toggle>
                <Toggle
                  pressed={settings.theme === 'system'}
                  onPressedChange={() => toggleTheme('system')}
                  className="flex-1"
                  aria-label="System theme"
                >
                  <Type className="h-4 w-4 mr-2" />
                  System
                </Toggle>
              </div>
            </div>
            
            {/* Text Size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Text Size</h3>
                <span className="text-xs text-muted-foreground">
                  {Math.round(settings.fontSize * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[settings.fontSize]}
                  min={0.8}
                  max={2}
                  step={0.1}
                  onValueChange={(value) => 
                    setSettings(s => ({ ...s, fontSize: value[0] }))
                  }
                  className="flex-1"
                  aria-label="Text size"
                />
                <Type className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            {/* Line Height */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">
                  {settings.contrast.toFixed(1)}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Contrast className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[settings.contrast]}
                  min={1}
                  max={2}
                  step={0.1}
                  onValueChange={(value) => 
                    setSettings(s => ({ ...s, contrast: value[0] }))
                  }
                  className="flex-1"
                  aria-label="Contrast level"
                />
                <Contrast className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            {/* Color Blind Modes */}
            <div>
              <h3 className="text-sm font-medium mb-2">Color Vision</h3>
              <div className="grid grid-cols-2 gap-2">
                <Toggle
                  pressed={settings.colorBlindMode === 'protanopia'}
                  onPressedChange={() => toggleColorBlindMode('protanopia')}
                  className="justify-start"
                  aria-label="Protanopia mode"
                >
                  <div className="h-3 w-3 rounded-full bg-red-500 mr-2" />
                  Protanopia
                </Toggle>
                <Toggle
                  pressed={settings.colorBlindMode === 'deuteranopia'}
                  onPressedChange={() => toggleColorBlindMode('deuteranopia')}
                  className="justify-start"
                  aria-label="Deuteranopia mode"
                >
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-2" />
                  Deuteranopia
                </Toggle>
                <Toggle
                  pressed={settings.colorBlindMode === 'tritanopia'}
                  onPressedChange={() => toggleColorBlindMode('tritanopia')}
                  className="justify-start"
                  aria-label="Tritanopia mode"
                >
                  <div className="h-3 w-3 rounded-full bg-blue-500 mr-2" />
                  Tritanopia
                </Toggle>
                <Toggle
                  pressed={settings.colorBlindMode === 'achromatopsia'}
                  onPressedChange={() => toggleColorBlindMode('achromatopsia')}
                  className="justify-start"
                  aria-label="Achromatopsia mode"
                >
                  <div className="h-3 w-3 rounded-full bg-gray-500 mr-2" />
                  Grayscale
                </Toggle>
              </div>
            </div>
            
            {/* Additional Accessibility Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="reduce-motion" className="text-sm font-medium">
                  Reduce Motion
                </label>
                <Toggle
                  id="reduce-motion"
                  pressed={settings.reduceAnimations}
                  onPressedChange={(pressed) => 
                    setSettings(s => ({ ...s, reduceAnimations: pressed }))
                  }
                  aria-label="Reduce animations"
                >
                  {settings.reduceAnimations ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Toggle>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="highlight-links" className="text-sm font-medium">
                  Highlight Links
                </label>
                <Toggle
                  id="highlight-links"
                  pressed={settings.highlightLinks}
                  onPressedChange={(pressed) => 
                    setSettings(s => ({ ...s, highlightLinks: pressed }))
                  }
                  aria-label="Highlight links"
                >
                  {settings.highlightLinks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Toggle>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="voice-control" className="text-sm font-medium">
                  Voice Control
                </label>
                <Toggle
                  id="voice-control"
                  pressed={settings.voiceControl}
                  onPressedChange={(pressed) => {
                    if (pressed && !('webkitSpeechRecognition' in window)) {
                      alert('Voice control is not supported in your browser. Try using Chrome or Edge.');
                      return;
                    }
                    setSettings(s => ({ ...s, voiceControl: pressed }));
                  }}
                  aria-label="Voice control"
                >
                  {settings.voiceControl ? (
                    <Volume2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Toggle>
              </div>
              
              {settings.voiceControl && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  <p>Try saying: "increase text size", "toggle dark mode", "enable protanopia mode"</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              These settings are saved in your browser for this device.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

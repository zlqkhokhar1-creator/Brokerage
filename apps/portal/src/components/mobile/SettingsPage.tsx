"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Smartphone, 
  Moon, 
  Sun,
  ChevronRight,
  Globe,
  HelpCircle,
  FileText,
  LogOut,
  Wallet,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

interface SettingsPageProps {
  user: { id: string; email: string; name: string };
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export function SettingsPage({ user, onLogout, onNavigate }: SettingsPageProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    marketNews: true,
    portfolio: true,
    social: false
  });

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Profile Settings",
          description: "Manage your personal information",
          action: () => {},
          showArrow: true
        },
        {
          icon: Shield,
          label: "Security & Privacy",
          description: "Two-factor authentication, passwords",
          action: () => {},
          showArrow: true
        },
        {
          icon: Wallet,
          label: "Banking & Cards",
          description: "Manage payment methods",
          action: () => onNavigate('funding'),
          showArrow: true
        }
      ]
    },
    {
      title: "Trading",
      items: [
        {
          icon: BarChart3,
          label: "Trading Preferences",
          description: "Default order types, confirmations",
          action: () => {},
          showArrow: true
        },
        {
          icon: Bell,
          label: "Price Alerts",
          description: "Manage stock price notifications",
          toggle: notifications.priceAlerts,
          onToggle: (value: boolean) => setNotifications(prev => ({ ...prev, priceAlerts: value }))
        },
        {
          icon: CreditCard,
          label: "Transaction History",
          description: "View all your trades and transactions",
          action: () => onNavigate('transactions'),
          showArrow: true
        }
      ]
    },
    {
      title: "App Settings",
      items: [
        {
          icon: darkMode ? Moon : Sun,
          label: "Dark Mode",
          description: "Switch between light and dark themes",
          toggle: darkMode,
          onToggle: setDarkMode
        },
        {
          icon: Bell,
          label: "Push Notifications",
          description: "Market news and updates",
          toggle: notifications.marketNews,
          onToggle: (value: boolean) => setNotifications(prev => ({ ...prev, marketNews: value }))
        },
        {
          icon: Globe,
          label: "Language & Region",
          description: "English (US), Currency: USD",
          action: () => {},
          showArrow: true
        }
      ]
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          label: "Help Center",
          description: "Get help and contact support",
          action: () => {},
          showArrow: true
        },
        {
          icon: FileText,
          label: "Terms & Privacy",
          description: "Legal information and policies",
          action: () => {},
          showArrow: true
        }
      ]
    }
  ];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 m-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Customize your experience</p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="px-4 mb-6">
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant="secondary" className="bg-success/20 text-success">
                Verified
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Sections */}
      <div className="px-4 space-y-6">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
              {section.title.toUpperCase()}
            </h2>
            <Card>
              <CardContent className="p-0">
                {section.items.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={item.label}>
                      <div 
                        className={`flex items-center gap-3 p-4 ${
                          item.action || item.onToggle ? 'cursor-pointer hover:bg-accent/50' : ''
                        }`}
                        onClick={item.action}
                      >
                        <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        {item.toggle !== undefined && item.onToggle && (
                          <Switch
                            checked={item.toggle}
                            onCheckedChange={item.onToggle}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {item.showArrow && (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      {index < section.items.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
            QUICK ACTIONS
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => onNavigate('funding')}
            >
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-sm">Add Funds</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => onNavigate('transactions')}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm">View History</span>
            </Button>
          </div>
        </div>

        {/* Logout Section */}
        <Card className="border-destructive/20">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 p-4 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onLogout}
            >
              <div className="h-10 w-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Sign Out</div>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            TradePro Mobile v2.4.1
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © 2024 TradePro Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
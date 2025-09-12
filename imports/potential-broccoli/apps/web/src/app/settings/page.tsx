"use client";

import PortalShell from '@/components/PortalShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [notifyOrder, setNotifyOrder] = useState(true);
  const [notifyPrice, setNotifyPrice] = useState(true);
  const [notifySystem, setNotifySystem] = useState(false);

  return (
    <PortalShell currentPath="/settings">
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle">Dark mode</Label>
              <Switch id="theme-toggle" checked={theme === 'dark'} onCheckedChange={(v: boolean) => setTheme(v ? 'dark' : 'light')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-order">Order updates</Label>
              <Switch id="notif-order" checked={notifyOrder} onCheckedChange={setNotifyOrder} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-price">Price alerts</Label>
              <Switch id="notif-price" checked={notifyPrice} onCheckedChange={setNotifyPrice} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-system">System updates</Label>
              <Switch id="notif-system" checked={notifySystem} onCheckedChange={setNotifySystem} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accessibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="reduce-motion">Reduce motion</Label>
              <Switch id="reduce-motion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
            </div>
            <p className="text-sm text-muted-foreground">Honors system setting; enabling here will further minimize non-essential animations.</p>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}


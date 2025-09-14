"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-6">Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="elevated-card">
          <CardHeader>
            <CardTitle>Test Card 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a test card with elevated styling.</p>
            <Button className="mt-4">Test Button</Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Test Card 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a test card with glass styling.</p>
            <Badge className="mt-4">Test Badge</Badge>
          </CardContent>
        </Card>

        <Card className="bg-card-secondary">
          <CardHeader>
            <CardTitle>Test Card 3</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a test card with secondary background.</p>
            <div className="mt-4 space-x-2">
              <span className="text-success">Success Text</span>
              <span className="text-destructive">Error Text</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Color Test</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center">Primary</div>
          <div className="bg-success text-success-foreground p-4 rounded-lg text-center">Success</div>
          <div className="bg-destructive text-destructive-foreground p-4 rounded-lg text-center">Destructive</div>
          <div className="bg-muted text-muted-foreground p-4 rounded-lg text-center">Muted</div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Image Test</h2>
        <img 
          src="/trading-dashboard.jpg" 
          alt="Trading Dashboard" 
          className="w-full max-w-2xl h-64 object-cover rounded-lg"
        />
      </div>
    </div>
  );
}

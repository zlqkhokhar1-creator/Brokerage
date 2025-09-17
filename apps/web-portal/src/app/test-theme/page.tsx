'use client';

import { useThemeStore } from '@/lib/stores/theme-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestThemePage() {
  const { currentTheme, setTheme, availableThemes } = useThemeStore();

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Theme Testing Page</h1>
          <p className="text-muted-foreground">
            Test the professional Equiti-inspired design with different color themes
          </p>
        </div>

        {/* Current Theme Display */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle>Current Theme: {currentTheme.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{currentTheme.description}</p>
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded-full border-2 border-border"
                style={{ backgroundColor: currentTheme.preview.primary }}
              />
              <div 
                className="w-8 h-8 rounded-full border-2 border-border"
                style={{ backgroundColor: currentTheme.preview.secondary }}
              />
              <div 
                className="w-8 h-8 rounded-full border-2 border-border"
                style={{ backgroundColor: currentTheme.preview.accent }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Selector */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle>Available Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    currentTheme.id === theme.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.preview.primary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.preview.secondary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.preview.accent }}
                    />
                  </div>
                  <h3 className="font-semibold text-foreground">{theme.name}</h3>
                  <p className="text-sm text-muted-foreground">{theme.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Component Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-professional">
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-professional">
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Color Palette */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Primary</h4>
                <div className="space-y-1">
                  {Object.entries(currentTheme.colors.primary).map(([shade, color]) => (
                    <div key={shade} className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-muted-foreground">{shade}: {color}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Gray</h4>
                <div className="space-y-1">
                  {Object.entries(currentTheme.colors.gray).map(([shade, color]) => (
                    <div key={shade} className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-muted-foreground">{shade}: {color}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

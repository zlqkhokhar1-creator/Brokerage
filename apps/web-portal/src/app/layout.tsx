import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { MantineProvider, createTheme } from '@mantine/core'
import { QueryProvider } from '@/components/query-provider'
import { CommandPalette } from '@/components/command-palette'
import { StatusBar } from '@/components/layout/status-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeInitializer } from '@/components/theme-initializer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Dynamic theme that uses CSS variables
const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue: [
      'hsl(var(--primary))',
      'hsl(var(--primary))',
      'hsl(var(--primary))',
      'hsl(var(--primary))',
      'hsl(var(--primary))',
      'hsl(var(--primary))',
      'hsl(var(--primary))',
      'hsl(var(--primary))',
      'hsl(var(--primary))',
      'hsl(var(--primary))',
    ],
    green: [
      'hsl(var(--success))',
      'hsl(var(--success))',
      'hsl(var(--success))',
      'hsl(var(--success))',
      'hsl(var(--success))',
      'hsl(var(--success))',
      'hsl(var(--success))',
      'hsl(var(--success))',
      'hsl(var(--success))',
      'hsl(var(--success))',
    ],
    red: [
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
      'hsl(var(--destructive))',
    ],
  },
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md',
  components: {
    Card: {
      styles: {
        root: {
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--card-foreground))',
        },
      },
    },
    Button: {
      styles: {
        root: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          border: '1px solid hsl(var(--primary))',
        },
      },
    },
  },
});

export const metadata: Metadata = {
  title: 'Invest Pro - Professional Trading Platform',
  description: 'Advanced financial dashboard for professional traders and investors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <ThemeInitializer />
          <MantineProvider theme={theme}>
            <QueryProvider>
              {children}
              <CommandPalette />
              <StatusBar />
            </QueryProvider>
          </MantineProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
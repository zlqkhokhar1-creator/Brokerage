import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { MantineProvider, createTheme } from '@mantine/core'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Dynamic theme that uses CSS variables
const theme = createTheme({
  primaryColor: 'dark',
  colors: {
    dark: [
      'hsl(var(--muted-foreground))',
      'hsl(var(--muted-foreground))',
      'hsl(var(--muted-foreground))',
      'hsl(var(--muted-foreground))',
      'hsl(var(--border))',
      'hsl(var(--border))',
      'hsl(var(--card))',
      'hsl(var(--card))',
      'hsl(var(--card))',
      'hsl(var(--background))',
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
      'hsl(var(--error))',
      'hsl(var(--error))',
      'hsl(var(--error))',
      'hsl(var(--error))',
      'hsl(var(--error))',
      'hsl(var(--error))',
      'hsl(var(--error))',
      'hsl(var(--error))',
      'hsl(var(--error))',
      'hsl(var(--error))',
    ],
  },
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md',
  components: {
    Table: {
      styles: {
        root: {
          backgroundColor: 'hsl(var(--card))',
        },
        tr: {
          backgroundColor: 'hsl(var(--card))',
          '&:hover': {
            backgroundColor: 'hsl(var(--muted))',
          },
        },
      },
    },
    Card: {
      styles: {
        root: {
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
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
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
      </body>
    </html>
  )
}

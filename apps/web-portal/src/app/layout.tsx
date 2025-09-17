import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { MantineProvider, createTheme } from '@mantine/core'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Bloomberg-inspired theme
const theme = createTheme({
  primaryColor: 'dark',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#0f0f0f', // Bloomberg dark
    ],
    green: [
      '#00ff00', // Bloomberg green
      '#00e600',
      '#00cc00',
      '#00b300',
      '#009900',
      '#008000',
      '#006600',
      '#004d00',
      '#003300',
      '#001a00',
    ],
    red: [
      '#ff0000', // Bloomberg red
      '#e60000',
      '#cc0000',
      '#b30000',
      '#990000',
      '#800000',
      '#660000',
      '#4d0000',
      '#330000',
      '#1a0000',
    ],
  },
  fontFamily: 'Courier New, monospace',
  defaultRadius: 'md',
  components: {
    Table: {
      styles: {
        root: {
          backgroundColor: '#0f0f0f',
        },
        tr: {
          backgroundColor: '#1a1a1a',
          '&:hover': {
            backgroundColor: '#25262b',
          },
        },
      },
    },
    Card: {
      styles: {
        root: {
          backgroundColor: '#1a1a1a',
          border: '1px solid #373A40',
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
      <body className={`${inter.className} bg-[#0f0f0f] text-white`}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
      </body>
    </html>
  )
}

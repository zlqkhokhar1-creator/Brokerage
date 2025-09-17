'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, LayoutDashboard, Activity, PieChart, TrendingUp, Users, BookOpen, Newspaper, Star, Settings, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  className?: string
}

const routes = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Trading', href: '/dashboard/trading', icon: Activity },
  { label: 'Portfolio', href: '/dashboard/portfolio', icon: PieChart },
  { label: 'Markets', href: '/dashboard/markets', icon: TrendingUp },
  { label: 'Watchlists', href: '/dashboard/watchlists', icon: Star },
  { label: 'News', href: '/dashboard/news', icon: Newspaper },
  { label: 'Social', href: '/dashboard/social', icon: Users },
  { label: 'Education', href: '/dashboard/education', icon: BookOpen },
  { label: 'AI Trading', href: '/dashboard/ai-trading', icon: Bot },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function CommandPalette({ className }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filteredRoutes = useMemo(() => {
    if (!query) return routes
    const q = query.toLowerCase()
    return routes.filter((r) => r.label.toLowerCase().includes(q))
  }, [query])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global Command Menu"
        className={cn(
          'fixed z-[61] left-1/2 top-24 w-[90vw] max-w-2xl -translate-x-1/2 rounded-xl border border-border bg-card text-foreground shadow-2xl',
          className,
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages, actions..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Command.List className="max-h-80 overflow-y-auto">
          <Command.Empty className="px-3 py-4 text-sm text-muted-foreground">No results found.</Command.Empty>
          <Command.Group heading="Navigate" className="px-2 py-1.5 text-xs text-muted-foreground">
            {filteredRoutes.map((item) => (
              <Command.Item
                key={item.href}
                onSelect={() => {
                  router.push(item.href)
                  setOpen(false)
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{item.label}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Press Ctrl/Cmd + K to toggle • Enter to navigate • Esc to close
        </div>
      </Command.Dialog>
    </>
  )
}


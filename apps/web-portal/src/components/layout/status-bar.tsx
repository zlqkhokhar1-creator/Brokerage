'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Cloud, Bell, Activity, Gauge } from 'lucide-react'

export function StatusBar() {
  const [online, setOnline] = useState(true)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [wsConnected, setWsConnected] = useState(true)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const ping = async () => {
      const start = performance.now()
      try {
        await fetch('/api/features/check?feature=ping', { cache: 'no-store' })
        if (!cancelled) setLatencyMs(Math.max(1, Math.round(performance.now() - start)))
      } catch {
        if (!cancelled) setLatencyMs(null)
      }
    }
    ping()
    const id = setInterval(ping, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-9 max-w-screen-2xl items-center justify-between px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Cloud className="h-3.5 w-3.5" />
            <span>Invest Pro</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            <span>Markets: Active</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" />
            <span>Latency: {latencyMs ? `${latencyMs}ms` : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            {online ? <Wifi className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
            <span>{online ? 'Online' : 'Offline'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Bell className="h-3.5 w-3.5" />
            <span>Alerts: 3</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <span className="text-[10px] rounded border px-1 py-0.5">Ctrl/Cmd</span>
            <span className="text-[10px] rounded border px-1 py-0.5">K</span>
            <span>Command</span>
          </div>
        </div>
      </div>
    </div>
  )
}


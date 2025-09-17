'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi, type LineData } from 'lightweight-charts'

interface ProLineChartProps {
  data: LineData[]
  height?: number
}

export function ProLineChart({ data, height = 280 }: ProLineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(var(--muted-foreground))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--border))' },
        horzLines: { color: 'hsl(var(--border))' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      crosshair: { mode: 0 },
    })

    const series = chart.addLineSeries({
      color: 'hsl(var(--primary))',
      lineWidth: 2,
    })
    series.setData(data)

    chart.timeScale().fitContent()

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return
      const { width } = containerRef.current.getBoundingClientRect()
      chart.applyOptions({ width })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [])

  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData(data)
      chartRef.current?.timeScale().fitContent()
    }
  }, [data])

  return <div ref={containerRef} className="w-full" />
}


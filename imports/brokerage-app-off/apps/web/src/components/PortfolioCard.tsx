"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
]

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  chrome: {
    label: "Chrome",
    color: "hsl(var(--chart-1))",
  },
  safari: {
    label: "Safari",
    color: "hsl(var(--chart-2))",
  },
  firefox: {
    label: "Firefox",
    color: "hsl(var(--chart-3))",
  },
  edge: {
    label: "Edge",
    color: "hsl(var(--chart-4))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-5))",
  },
}

export default function PortfolioCard() {
  return (
    <Card className="bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-purple-900 shadow-xl border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-500 animate-pulse" /> Portfolio Allocation
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-300">January - June 2024</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: -20 }}
            barSize={24}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="visitors" hide />
            <Bar dataKey="visitors" layout="vertical" radius={[8, 8, 0, 0]} fill="#6366f1" />
          </BarChart>
        </ChartContainer>
        <div className="flex gap-4 mt-6">
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-green-600">+5.2%</span>
            <span className="text-xs text-slate-500">This month</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-blue-600">$25,400</span>
            <span className="text-xs text-slate-500">Total Value</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm pt-4">
        <div className="flex gap-2 font-medium leading-none">
          <TrendingUp className="h-4 w-4 text-green-500" /> Trending up by 5.2% this month
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  )
}

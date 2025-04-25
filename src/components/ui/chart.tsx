"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * STUB IMPLEMENTATION
 * 
 * This is a stub implementation of the chart component.
 * The original implementation uses recharts, which is not installed.
 * This stub provides the component interface but renders a placeholder.
 */

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500",
          className
        )}
        {...props}
      >
        <div className="text-center">
          <p>Chart Component (Placeholder)</p>
          <p className="text-xs mt-1">Recharts library not installed</p>
        </div>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

// Placeholder components that match the original API
const ChartTooltip = () => null
const ChartTooltipContent = () => null
const Area = (props: any) => null
const Bar = (props: any) => null
const CartesianGrid = (props: any) => null
const Legend = (props: any) => null
const Line = (props: any) => null
const XAxis = (props: any) => null
const YAxis = (props: any) => null
const PolarGrid = (props: any) => null
const PolarAngleAxis = (props: any) => null
const PolarRadiusAxis = (props: any) => null
const RadialBar = (props: any) => null
const Pie = (props: any) => null
const Radar = (props: any) => null
const RadarChart = (props: any) => null
const AreaChart = (props: any) => null
const BarChart = (props: any) => null
const LineChart = (props: any) => null
const ComposedChart = (props: any) => null
const PieChart = (props: any) => null
const RadialBarChart = (props: any) => null

export {
  ChartContainer as Chart,
  ChartTooltip,
  ChartTooltipContent,
  Area,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  XAxis,
  YAxis,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  Pie,
  Radar,
  RadarChart,
  AreaChart,
  BarChart,
  LineChart,
  ComposedChart,
  PieChart,
  RadialBarChart,
}

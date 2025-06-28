"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  Line,
  Bar,
  Pie,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const LineChart = dynamic(() => import("recharts").then(mod => mod.LineChart), { ssr: false })
const BarChart = dynamic(() => import("recharts").then(mod => mod.BarChart), { ssr: false })
const PieChart = dynamic(() => import("recharts").then(mod => mod.PieChart), { ssr: false })
const AreaChart = dynamic(() => import("recharts").then(mod => mod.AreaChart), { ssr: false })

type ChartType = "line" | "bar" | "pie" | "area"

interface DynamicChartProps {
  type: ChartType
  data: any[]
  width?: number | string
  height?: number | string
  xDataKey?: string
  dataKeys?: { key: string; name?: string; color?: string }[]
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  className?: string
}

export default function DynamicChart({
  type = "line",
  data = [],
  width = "100%",
  height = 300,
  xDataKey = "name",
  dataKeys = [],
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  className,
}: DynamicChartProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient || !data.length) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center bg-gray-50 rounded-md"
      >
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-2 border-t-primary animate-spin mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Đang tải biểu đồ...</p>
        </div>
      </div>
    )
  }

  // Tạo chart đúng type, nếu không đúng thì để undefined
  let chart: React.ReactElement | undefined
  if (type === "line") {
    chart = (
      <LineChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xDataKey} />
        <YAxis />
        {showTooltip && <Tooltip />}
        {showLegend && <Legend />}
        {dataKeys.map((item, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={item.key}
            name={item.name || item.key}
            stroke={item.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
          />
        ))}
      </LineChart>
    )
  } else if (type === "bar") {
    chart = (
      <BarChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xDataKey} />
        <YAxis />
        {showTooltip && <Tooltip />}
        {showLegend && <Legend />}
        {dataKeys.map((item, index) => (
          <Bar
            key={index}
            dataKey={item.key}
            name={item.name || item.key}
            fill={item.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
          />
        ))}
      </BarChart>
    )
  } else if (type === "pie") {
    chart = (
      <PieChart>
        {showTooltip && <Tooltip />}
        {showLegend && <Legend />}
        <Pie
          data={data}
          nameKey={xDataKey}
          dataKey={dataKeys[0]?.key || ""}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
        />
      </PieChart>
    )
  } else if (type === "area") {
    chart = (
      <AreaChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xDataKey} />
        <YAxis />
        {showTooltip && <Tooltip />}
        {showLegend && <Legend />}
        {dataKeys.map((item, index) => (
          <Area
            key={index}
            type="monotone"
            dataKey={item.key}
            name={item.name || item.key}
            fill={item.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
            stroke={item.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
          />
        ))}
      </AreaChart>
    )
  }

  // Nếu không có chart, trả fallback (hoặc bạn có thể throw error tuỳ ý)
  if (!chart) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center bg-gray-50 rounded-md"
      >
        <p className="text-sm text-gray-500">Không có biểu đồ phù hợp.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        {chart}
      </ResponsiveContainer>
    </div>
  )
}

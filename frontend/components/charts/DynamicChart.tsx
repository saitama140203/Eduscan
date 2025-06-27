"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports cho các thành phần Recharts
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

type ChartType = 'line' | 'bar' | 'pie' | 'area'

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
  type = 'line',
  data = [],
  width = '100%',
  height = 300,
  xDataKey = 'name',
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

  // Hiển thị placeholder khi đang tải hoặc ở server-side
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

  // Render chart tương ứng với type
  return (
    <div className={className}>
    <ResponsiveContainer width={width} height={height}>
      {type === 'line' && (
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
      )}

      {type === 'bar' && (
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
      )}

      {type === 'pie' && (
        <PieChart>
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          <Pie
            data={data}
            nameKey={xDataKey}
            dataKey={dataKeys[0]?.key || ''}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          />
        </PieChart>
      )}

      {type === 'area' && (
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
      )}
    </ResponsiveContainer>
    </div>
  )
}

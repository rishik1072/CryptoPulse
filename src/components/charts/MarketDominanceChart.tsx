import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface MarketDominanceChartProps {
  btc: number
  eth: number
}

export function MarketDominanceChart({ btc, eth }: MarketDominanceChartProps) {
  const others = 100 - btc - eth
  
  const data = [
    { name: 'BTC', value: btc, color: '#f59e0b' },
    { name: 'ETH', value: eth, color: '#6366f1' },
    { name: 'Others', value: Math.max(others, 0), color: '#64748b' },
  ]

  return (
    <div className="h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={95}
            dataKey="value"
            strokeWidth={4}
            stroke="var(--surface, #151921)"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--surface-elevated, #1B2230)', 
              border: '1px solid var(--border, #262D38)', 
              borderRadius: '12px',
              color: 'var(--foreground, #F0F4F8)',
              fontSize: '12px',
            }} 
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 -mt-4 text-sm">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name} <span className="text-muted">{item.value.toFixed(1)}%</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}
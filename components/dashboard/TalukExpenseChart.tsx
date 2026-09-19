'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function TalukExpenseChart({
  data,
}: {
  data: any[]
}) {
  return (
    <div className="h-[350px]">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <BarChart data={data}>
          <XAxis dataKey="taluk" />
          <YAxis />
          <Tooltip />

          <Bar
            dataKey="expense"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
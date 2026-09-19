'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function BudgetExpenseChart({
  budget,
  expense,
}: {
  budget: number
  expense: number
}) {
  const data = [
    {
      name: 'Budget',
      value: budget,
    },
    {
      name: 'Expense',
      value: expense,
    },
  ]

  const COLORS = ['#3b82f6', '#ef4444']

  return (
    <ResponsiveContainer
      width="100%"
      height={300}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          outerRadius={100}
          label
        >
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={COLORS[index]}
            />
          ))}
        </Pie>

        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
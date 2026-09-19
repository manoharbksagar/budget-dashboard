'use client'

import {
  PieChart,
  Pie,
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

  return (
    <div className="h-[350px]">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
          />

          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
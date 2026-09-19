'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import TalukExpenseChart from '@/components/dashboard/TalukExpenseChart'
import BudgetExpenseChart from '@/components/dashboard/BudgetExpenseChart'

export default function DashboardPage() {
  const supabase = createClient()

  const [expenses, setExpenses] = useState<any[]>([])
  const [totalBudget, setTotalBudget] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [balance, setBalance] = useState(0)

  const [talukSummary, setTalukSummary] =
    useState<any[]>([])

  const [taluks, setTaluks] =
    useState<any[]>([])

  const [selectedTaluk, setSelectedTaluk] =
    useState('')

  const [selectedFY, setSelectedFY] =
    useState('')

  async function loadTaluks() {
    const { data } = await supabase
      .from('taluks')
      .select('*')
      .order('name')

    setTaluks(data || [])
  }

  async function loadDashboard() {
    const { data: releasesData } =
      await supabase
        .from('budget_releases')
        .select(`
          *,
          taluks(name)
        `)

    const { data: expensesData } =
      await supabase
        .from('expenses')
        .select(`
          *,
          taluks(name)
        `)
        .order('expense_date', {
          ascending: false,
        })

    const releases = releasesData || []
    const expenses = expensesData || []

    let filteredReleases = releases
    let filteredExpenses = expenses

    if (selectedFY) {
      filteredReleases =
        filteredReleases.filter(
          (r) =>
            r.financial_year ===
            selectedFY
        )
    }

    if (selectedTaluk) {
      filteredReleases =
        filteredReleases.filter(
          (r) =>
            r.taluks?.name ===
            selectedTaluk
        )

      filteredExpenses =
        filteredExpenses.filter(
          (e) =>
            e.taluks?.name ===
            selectedTaluk
        )
    }

    setExpenses(filteredExpenses)

    const budgetTotal =
      filteredReleases.reduce(
        (sum, r) =>
          sum +
          Number(
            r.installment_1 || 0
          ) +
          Number(
            r.installment_2 || 0
          ) +
          Number(
            r.installment_3 || 0
          ) +
          Number(
            r.installment_4 || 0
          ),
        0
      )

    const expenseTotal =
      filteredExpenses.reduce(
        (sum, e) =>
          sum +
          Number(
            e.net_payable || 0
          ),
        0
      )

    setTotalBudget(budgetTotal)
    setTotalExpense(expenseTotal)
    setBalance(
      budgetTotal - expenseTotal
    )

    const talukMap: any = {}

    filteredReleases.forEach((r) => {
      const taluk =
        r.taluks?.name ||
        'Unknown'

      const released =
        Number(
          r.installment_1 || 0
        ) +
        Number(
          r.installment_2 || 0
        ) +
        Number(
          r.installment_3 || 0
        ) +
        Number(
          r.installment_4 || 0
        )

      if (!talukMap[taluk]) {
        talukMap[taluk] = {
          taluk,
          released: 0,
          expense: 0,
        }
      }

      talukMap[taluk].released +=
        released
    })

    filteredExpenses.forEach((e) => {
      const taluk =
        e.taluks?.name ||
        'Unknown'

      if (!talukMap[taluk]) {
        talukMap[taluk] = {
          taluk,
          released: 0,
          expense: 0,
        }
      }

      talukMap[taluk].expense +=
        Number(
          e.net_payable || 0
        )
    })

    const summary =
      Object.values(
        talukMap
      ).map((item: any) => ({
        ...item,
        balance:
          item.released -
          item.expense,
      }))

    setTalukSummary(summary)
  }

  useEffect(() => {
    loadTaluks()
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [
    selectedFY,
    selectedTaluk,
  ])

  return (
    <main className="p-8">

      <h1 className="text-4xl font-bold mb-8">
        Dashboard
      </h1>

      {/* FILTERS */}

      <div className="grid grid-cols-2 gap-4 mb-8">

        <select
          className="border p-3 rounded"
          value={selectedFY}
          onChange={(e) =>
            setSelectedFY(
              e.target.value
            )
          }
        >
          <option value="">
            All Financial Years
          </option>

          <option value="2025-26">
            2025-26
          </option>

          <option value="2026-27">
            2026-27
          </option>
        </select>

        <select
          className="border p-3 rounded"
          value={selectedTaluk}
          onChange={(e) =>
            setSelectedTaluk(
              e.target.value
            )
          }
        >
          <option value="">
            All Taluks
          </option>

          {taluks.map(
            (taluk: any) => (
              <option
                key={taluk.id}
                value={
                  taluk.name
                }
              >
                {taluk.name}
              </option>
            )
          )}
        </select>

      </div>

      {/* KPI */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <div className="border rounded-lg p-6 shadow">
          <p>
            Total Budget Released
          </p>

          <h2 className="text-4xl font-bold">
            ₹{' '}
            {totalBudget.toLocaleString()}
          </h2>
        </div>

        <div className="border rounded-lg p-6 shadow">
          <p>
            Total Expenses
          </p>

          <h2 className="text-4xl font-bold">
            ₹{' '}
            {totalExpense.toLocaleString()}
          </h2>
        </div>

        <div className="border rounded-lg p-6 shadow">
          <p>
            Balance Available
          </p>

          <h2 className="text-4xl font-bold">
            ₹{' '}
            {balance.toLocaleString()}
          </h2>
        </div>

      </div>

      {/* CHARTS */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

        <div className="border rounded-lg p-6">

          <h2 className="text-xl font-bold mb-4">
            Expense by Taluk
          </h2>

          <TalukExpenseChart
            data={talukSummary}
          />

        </div>

        <div className="border rounded-lg p-6">

          <h2 className="text-xl font-bold mb-4">
            Budget vs Expense
          </h2>

          <BudgetExpenseChart
            budget={
              totalBudget
            }
            expense={
              totalExpense
            }
          />

        </div>

      </div>

      {/* TALUK SUMMARY */}

      <div className="border rounded-lg p-6 mb-10">

        <h2 className="text-2xl font-bold mb-4">
          Taluk Wise Summary
        </h2>

        <table className="w-full border">

          <thead>
            <tr>
              <th className="border p-2">
                Taluk
              </th>

              <th className="border p-2">
                Budget
              </th>

              <th className="border p-2">
                Expense
              </th>

              <th className="border p-2">
                Balance
              </th>
            </tr>
          </thead>

          <tbody>

            {talukSummary.map(
              (
                item: any,
                index
              ) => (
                <tr
                  key={index}
                >
                  <td className="border p-2">
                    {item.taluk}
                  </td>

                  <td className="border p-2">
                    ₹{' '}
                    {item.released.toLocaleString()}
                  </td>

                  <td className="border p-2">
                    ₹{' '}
                    {item.expense.toLocaleString()}
                  </td>

                  <td
                    className={`border p-2 ${
                      item.balance <
                      0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    ₹{' '}
                    {item.balance.toLocaleString()}
                  </td>
                </tr>
              )
            )}

          </tbody>

        </table>

      </div>

      {/* RECENT EXPENSES */}

      <div className="border rounded-lg p-6">

        <h2 className="text-2xl font-bold mb-4">
          Recent Expenses
        </h2>

        <table className="w-full border">

          <thead>
            <tr>
              <th className="border p-2">
                Date
              </th>

              <th className="border p-2">
                Taluk
              </th>

              <th className="border p-2">
                Amount
              </th>
            </tr>
          </thead>

          <tbody>

            {expenses
              .slice(0, 10)
              .map(
                (
                  expense: any
                ) => (
                  <tr
                    key={
                      expense.id
                    }
                  >
                    <td className="border p-2">
                      {
                        expense.expense_date
                      }
                    </td>

                    <td className="border p-2">
                      {
                        expense.taluks
                          ?.name
                      }
                    </td>

                    <td className="border p-2">
                      ₹{' '}
                      {Number(
                        expense.net_payable ||
                          0
                      ).toLocaleString()}
                    </td>
                  </tr>
                )
              )}

          </tbody>

        </table>

      </div>

    </main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import TalukExpenseChart from '@/components/dashboard/TalukExpenseChart'
import BudgetExpenseChart from '@/components/dashboard/BudgetExpenseChart'

const FINANCIAL_YEARS = ['2025-26', '2026-27']

const MONTHS = [
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
  'JANUARY',
  'FEBRUARY',
  'MARCH',
]

const MONTH_NUMBERS: Record<string, number> = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN').format(value)

function getTalukName(taluk: any) {
  return taluk?.name || 'Unknown'
}

function getExpenseDateString(expense: any) {
  if (!expense?.expense_date) {
    return ''
  }

  return expense.expense_date
    .toString()
    .slice(0, 10)
}

function getFinancialYearForDate(dateString: string) {
  if (!dateString) {
    return ''
  }

  const year = Number(dateString.slice(0, 4))
  const month = Number(dateString.slice(5, 7))

  if (!year || !month) {
    return ''
  }

  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`
  }

  return `${year - 1}-${String(year).slice(-2)}`
}

export default function DashboardPage() {
  const supabase = createClient()

  const [expenses, setExpenses] = useState<any[]>([])
  const [totalBudget, setTotalBudget] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [balance, setBalance] = useState(0)

  const [talukSummary, setTalukSummary] = useState<any[]>([])
  const [taluks, setTaluks] = useState<any[]>([])

  const [selectedTaluk, setSelectedTaluk] = useState('')
  const [selectedFY, setSelectedFY] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')

  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const pageSize = 10

  async function loadTaluks() {
    const { data, error } = await supabase
      .from('taluks')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error loading taluks:', error)
      return
    }

    setTaluks(data || [])
  }

  async function loadDashboard() {
    setLoading(true)

    try {
      const { data: releasesData, error: releasesError } =
        await supabase.from('budget_releases').select(`
          *,
          taluks(name)
        `)

      if (releasesError) {
        throw releasesError
      }

      const { data: expensesData, error: expensesError } =
        await supabase
          .from('expenses')
          .select(`
            *,
            taluks(name)
          `)
          .order('expense_date', {
            ascending: false,
          })

      if (expensesError) {
        throw expensesError
      }

      const releases = releasesData || []
      const allExpenses = expensesData || []

      let filteredReleases = releases
      let filteredExpenses = allExpenses

      // Financial year filter
      if (selectedFY) {
        filteredReleases = filteredReleases.filter(
          (release: any) =>
            release.financial_year === selectedFY
        )

        filteredExpenses = filteredExpenses.filter(
          (expense: any) =>
            getFinancialYearForDate(
              getExpenseDateString(expense)
            ) === selectedFY
        )
      }

      // Month filter
      if (selectedMonth) {
        filteredReleases = filteredReleases.filter(
          (release: any) =>
            release.month?.toString().toUpperCase() ===
            selectedMonth
        )

        const selectedMonthNumber =
          MONTH_NUMBERS[selectedMonth]

        filteredExpenses = filteredExpenses.filter(
          (expense: any) => {
            const dateString =
              getExpenseDateString(expense)

            if (!dateString) {
              return false
            }

            const monthNumber = Number(
              dateString.slice(5, 7)
            )

            return monthNumber === selectedMonthNumber
          }
        )
      }

      // Taluk filter
      if (selectedTaluk) {
        filteredReleases = filteredReleases.filter(
          (release: any) =>
            release.taluks?.name === selectedTaluk
        )

        filteredExpenses = filteredExpenses.filter(
          (expense: any) =>
            expense.taluks?.name === selectedTaluk
        )
      }

      setExpenses(filteredExpenses)

      const budgetTotal = filteredReleases.reduce(
        (sum: number, release: any) =>
          sum +
          Number(release.installment_1 || 0) +
          Number(release.installment_2 || 0) +
          Number(release.installment_3 || 0) +
          Number(release.installment_4 || 0),
        0
      )

      const expenseTotal = filteredExpenses.reduce(
        (sum: number, expense: any) =>
          sum + Number(expense.net_payable || 0),
        0
      )

      setTotalBudget(budgetTotal)
      setTotalExpense(expenseTotal)
      setBalance(budgetTotal - expenseTotal)

      const talukMap: Record<string, any> = {}

      filteredReleases.forEach((release: any) => {
        const taluk = getTalukName(release.taluks)

        const released =
          Number(release.installment_1 || 0) +
          Number(release.installment_2 || 0) +
          Number(release.installment_3 || 0) +
          Number(release.installment_4 || 0)

        if (!talukMap[taluk]) {
          talukMap[taluk] = {
            taluk,
            released: 0,
            expense: 0,
          }
        }

        talukMap[taluk].released += released
      })

      filteredExpenses.forEach((expense: any) => {
        const taluk = getTalukName(expense.taluks)

        if (!talukMap[taluk]) {
          talukMap[taluk] = {
            taluk,
            released: 0,
            expense: 0,
          }
        }

        talukMap[taluk].expense += Number(
          expense.net_payable || 0
        )
      })

      const summary = Object.values(talukMap).map(
        (item: any) => ({
          ...item,
          balance: item.released - item.expense,
        })
      )

      setTalukSummary(
        summary.sort(
          (a: any, b: any) => b.expense - a.expense
        )
      )
    } catch (error) {
      console.error('Error loading dashboard:', error)

      setExpenses([])
      setTotalBudget(0)
      setTotalExpense(0)
      setBalance(0)
      setTalukSummary([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTaluks()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
    loadDashboard()
  }, [selectedFY, selectedMonth, selectedTaluk])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  if (loading) {
    return (
      <main className="p-8">
        <h2 className="text-2xl font-semibold">
          Loading Dashboard...
        </h2>
      </main>
    )
  }

  const expenseCount = expenses.length

  const filteredExpenses = expenses.filter(
    (expense: any) =>
      expense.taluks?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.max(
    1,
    Math.ceil(filteredExpenses.length / pageSize)
  )

  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const utilization =
    totalBudget > 0
      ? ((totalExpense / totalBudget) * 100).toFixed(1)
      : '0.0'

  function handleFinancialYearChange(
    value: string
  ) {
    setSelectedFY(value)

    // Clearing month when FY is cleared avoids
    // accidentally combining a month across
    // multiple financial years.
    if (!value) {
      setSelectedMonth('')
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold mb-8">
        Dashboard
      </h1>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <select
          className="border p-3 rounded"
          value={selectedFY}
          onChange={(e) =>
            handleFinancialYearChange(e.target.value)
          }
        >
          <option value="">
            All Financial Years
          </option>

          {FINANCIAL_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          className="border p-3 rounded"
          value={selectedMonth}
          onChange={(e) =>
            setSelectedMonth(e.target.value)
          }
        >
          <option value="">
            All Months
          </option>

          {MONTHS.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>

        <select
          className="border p-3 rounded"
          value={selectedTaluk}
          onChange={(e) =>
            setSelectedTaluk(e.target.value)
          }
        >
          <option value="">
            All Taluks
          </option>

          {taluks.map((taluk: any) => (
            <option key={taluk.id} value={taluk.name}>
              {taluk.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="border rounded-lg p-6 shadow">
          <p>Total Budget Released</p>
          <h2 className="text-4xl font-bold">
            ₹ {formatCurrency(totalBudget)}
          </h2>
        </div>

        <div className="border rounded-lg p-6 shadow">
          <p>Total Expenses</p>
          <h2 className="text-4xl font-bold">
            ₹ {formatCurrency(totalExpense)}
          </h2>
        </div>

        <div className="border rounded-lg p-6 shadow">
          <p>Balance Available</p>
          <h2
            className={`text-4xl font-bold ${
              balance < 0
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            ₹ {formatCurrency(balance)}
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Utilization: {utilization}%
          </p>
        </div>

        <div className="border rounded-lg p-6 shadow">
          <p>Total Bills</p>
          <h2 className="text-4xl font-bold">
            {expenseCount}
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
            data={[...talukSummary]
              .sort(
                (a: any, b: any) =>
                  b.expense - a.expense
              )
              .slice(0, 5)}
          />
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Budget vs Expense
          </h2>

          <BudgetExpenseChart
            budget={totalBudget}
            expense={totalExpense}
          />
        </div>
      </div>

      {/* TALUK SUMMARY */}
      <div className="border rounded-lg p-6 mb-10">
        <h2 className="text-2xl font-bold mb-4">
          Taluk Wise Summary
        </h2>

        {talukSummary.length === 0 ? (
          <p className="text-gray-600">
            No budget data available for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr>
                  <th className="border p-2 text-left">
                    Taluk
                  </th>
                  <th className="border p-2 text-left">
                    Budget
                  </th>
                  <th className="border p-2 text-left">
                    Expense
                  </th>
                  <th className="border p-2 text-left">
                    Balance
                  </th>
                </tr>
              </thead>

              <tbody>
                {talukSummary.map(
                  (item: any, index: number) => (
                    <tr key={`${item.taluk}-${index}`}>
                      <td className="border p-2">
                        {item.taluk}
                      </td>
                      <td className="border p-2">
                        ₹ {formatCurrency(item.released)}
                      </td>
                      <td className="border p-2">
                        ₹ {formatCurrency(item.expense)}
                      </td>
                      <td
                        className={`border p-2 font-medium ${
                          item.balance < 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        ₹ {formatCurrency(item.balance)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT EXPENSES */}
      <div className="border rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold">
            Recent Expenses
          </h2>

          <input
            type="text"
            placeholder="Search Taluk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border p-2 rounded w-full md:w-72"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead>
              <tr>
                <th className="border p-2 text-left">
                  Date
                </th>
                <th className="border p-2 text-left">
                  Taluk
                </th>
                <th className="border p-2 text-left">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedExpenses.map((expense: any) => (
                <tr key={expense.id}>
                  <td className="border p-2">
                    {getExpenseDateString(expense)}
                  </td>

                  <td className="border p-2">
                    {expense.taluks?.name || 'Unknown'}
                  </td>

                  <td className="border p-2">
                    ₹{' '}
                    {formatCurrency(
                      Number(expense.net_payable || 0)
                    )}
                  </td>
                </tr>
              ))}

              {paginatedExpenses.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="border p-4 text-center text-gray-600"
                  >
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-4 mt-4">
          <button
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((page) =>
                Math.max(1, page - 1)
              )
            }
            className="border px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, page + 1)
              )
            }
            className="border px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  )
}

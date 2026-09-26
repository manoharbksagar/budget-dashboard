'use client'

import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'

const FINANCIAL_YEARS = [
  '2025-26',
  '2026-27',
]

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN').format(value)
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

function getMonthForDate(dateString: string) {
  if (!dateString) {
    return ''
  }

  const monthNumber = Number(
    dateString.slice(5, 7)
  )

  return (
    Object.keys(MONTH_NUMBERS).find(
      (month) =>
        MONTH_NUMBERS[month] === monthNumber
    ) || ''
  )
}

function getReleasedAmount(release: any) {
  return (
    Number(release.installment_1 || 0) +
    Number(release.installment_2 || 0) +
    Number(release.installment_3 || 0) +
    Number(release.installment_4 || 0)
  )
}

function getExpenseAmount(expense: any) {
  return Number(expense.net_payable || 0)
}

function getHeadLabel(head: any) {
  if (!head) {
    return 'Unknown'
  }

  if (head.head_code && head.head_name) {
    return `${head.head_code} - ${head.head_name}`
  }

  return head.head_name || head.head_code || 'Unknown'
}

function getSubHeadLabel(subHead: any) {
  if (!subHead) {
    return 'Unknown'
  }

  if (
    subHead.sub_head_code &&
    subHead.sub_head_name
  ) {
    return `${subHead.sub_head_code} - ${subHead.sub_head_name}`
  }

  return (
    subHead.sub_head_name ||
    subHead.sub_head_code ||
    'Unknown'
  )
}

export default function ReportsPage() {
  const supabase = createClient()

  const [taluks, setTaluks] = useState<any[]>([])
  const [heads, setHeads] = useState<any[]>([])
  const [subHeads, setSubHeads] = useState<any[]>([])

  const [releases, setReleases] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])

  const [selectedFY, setSelectedFY] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedTaluk, setSelectedTaluk] = useState('')
  const [selectedHead, setSelectedHead] = useState('')
  const [selectedSubHead, setSelectedSubHead] =
    useState('')

  const [searchTerm, setSearchTerm] = useState('')

  const [loading, setLoading] = useState(true)

  async function loadMasters() {
    const [
      { data: talukData, error: talukError },
      { data: headData, error: headError },
      { data: subHeadData, error: subHeadError },
    ] = await Promise.all([
      supabase
        .from('taluks')
        .select('*')
        .order('name'),

      supabase
        .from('budget_heads')
        .select('*')
        .order('head_code'),

      supabase
        .from('budget_sub_heads')
        .select('*')
        .order('sub_head_code'),
    ])

    if (talukError) {
      throw new Error(
        `Unable to load taluks: ${talukError.message}`
      )
    }

    if (headError) {
      throw new Error(
        `Unable to load budget heads: ${headError.message}`
      )
    }

    if (subHeadError) {
      throw new Error(
        `Unable to load budget sub-heads: ${subHeadError.message}`
      )
    }

    setTaluks(talukData || [])
    setHeads(headData || [])
    setSubHeads(subHeadData || [])
  }

  async function loadReportData() {
    setLoading(true)

    try {
      const [
        { data: releaseData, error: releaseError },
        { data: expenseData, error: expenseError },
      ] = await Promise.all([
        supabase
          .from('budget_releases')
          .select(`
            *,
            taluks(id,name),
            budget_heads(id,head_code,head_name),
            budget_sub_heads(
              id,
              sub_head_code,
              sub_head_name
            )
          `),

        supabase
          .from('expenses')
          .select(`
            *,
            taluks(id,name),
            budget_heads(id,head_code,head_name),
            budget_sub_heads(
              id,
              sub_head_code,
              sub_head_name
            )
          `)
          .order('expense_date', {
            ascending: false,
          }),
      ])

      if (releaseError) {
        throw new Error(
          `Unable to load budget releases: ${releaseError.message}`
        )
      }

      if (expenseError) {
        throw new Error(
          `Unable to load expenses: ${expenseError.message}`
        )
      }

      setReleases(releaseData || [])
      setExpenses(expenseData || [])
    } catch (error: any) {
      console.error(
        'Report loading error:',
        error
      )

      alert(
        error?.message ||
          'Unable to load report data.'
      )

      setReleases([])
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      loadMasters(),
      loadReportData(),
    ]).catch((error) => {
      console.error(error)
    })
  }, [])

  const filteredReleases = useMemo(() => {
    return releases.filter(
      (release: any) => {
        const matchesFY =
          !selectedFY ||
          release.financial_year === selectedFY

        const matchesMonth =
          !selectedMonth ||
          release.month
            ?.toString()
            .toUpperCase() === selectedMonth

        const matchesTaluk =
          !selectedTaluk ||
          release.taluk_id === selectedTaluk

        const matchesHead =
          !selectedHead ||
          release.budget_head_id === selectedHead

        const matchesSubHead =
          !selectedSubHead ||
          release.budget_sub_head_id ===
            selectedSubHead

        return (
          matchesFY &&
          matchesMonth &&
          matchesTaluk &&
          matchesHead &&
          matchesSubHead
        )
      }
    )
  }, [
    releases,
    selectedFY,
    selectedMonth,
    selectedTaluk,
    selectedHead,
    selectedSubHead,
  ])

  const filteredExpenses = useMemo(() => {
    return expenses.filter(
      (expense: any) => {
        const expenseDate =
          expense.expense_date || ''

        const expenseFY =
          getFinancialYearForDate(
            expenseDate
          )

        const expenseMonth =
          getMonthForDate(expenseDate)

        const matchesFY =
          !selectedFY ||
          expenseFY === selectedFY

        const matchesMonth =
          !selectedMonth ||
          expenseMonth === selectedMonth

        const matchesTaluk =
          !selectedTaluk ||
          expense.taluk_id === selectedTaluk

        const matchesHead =
          !selectedHead ||
          expense.head_id === selectedHead

        const matchesSubHead =
          !selectedSubHead ||
          expense.sub_head_id ===
            selectedSubHead

        const query =
          searchTerm
            .trim()
            .toLowerCase()

        const text = [
          expense.taluks?.name,
          getHeadLabel(expense.budget_heads),
          getSubHeadLabel(
            expense.budget_sub_heads
          ),
          expense.bill_number,
          expense.token_number,
          expense.utr_number,
          expense.details,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        const matchesSearch =
          !query ||
          text.includes(query)

        return (
          matchesFY &&
          matchesMonth &&
          matchesTaluk &&
          matchesHead &&
          matchesSubHead &&
          matchesSearch
        )
      }
    )
  }, [
    expenses,
    selectedFY,
    selectedMonth,
    selectedTaluk,
    selectedHead,
    selectedSubHead,
    searchTerm,
  ])

  const summaryRows = useMemo(() => {
    const map: Record<string, any> = {}

    filteredReleases.forEach(
      (release: any) => {
        const key = [
          release.taluk_id || '',
          release.budget_head_id || '',
          release.budget_sub_head_id || '',
        ].join('|')

        if (!map[key]) {
          map[key] = {
            talukId: release.taluk_id,
            taluk:
              release.taluks?.name ||
              'Unknown',
            headId:
              release.budget_head_id,
            head:
              getHeadLabel(
                release.budget_heads
              ),
            subHeadId:
              release.budget_sub_head_id,
            subHead:
              getSubHeadLabel(
                release.budget_sub_heads
              ),
            budget: 0,
            expense: 0,
          }
        }

        map[key].budget +=
          getReleasedAmount(release)
      }
    )

    filteredExpenses.forEach(
      (expense: any) => {
        const key = [
          expense.taluk_id || '',
          expense.head_id || '',
          expense.sub_head_id || '',
        ].join('|')

        if (!map[key]) {
          map[key] = {
            talukId: expense.taluk_id,
            taluk:
              expense.taluks?.name ||
              'Unknown',
            headId: expense.head_id,
            head:
              getHeadLabel(
                expense.budget_heads
              ),
            subHeadId:
              expense.sub_head_id,
            subHead:
              getSubHeadLabel(
                expense.budget_sub_heads
              ),
            budget: 0,
            expense: 0,
          }
        }

        map[key].expense +=
          getExpenseAmount(expense)
      }
    )

    return Object.values(map)
      .map((row: any) => ({
        ...row,
        balance:
          row.budget - row.expense,
        utilization:
          row.budget > 0
            ? (row.expense /
                row.budget) *
              100
            : 0,
      }))
      .filter((row: any) => {
        const query =
          searchTerm
            .trim()
            .toLowerCase()

        if (!query) {
          return true
        }

        return [
          row.taluk,
          row.head,
          row.subHead,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
      .sort((a: any, b: any) =>
        b.expense - a.expense
      )
  }, [
    filteredReleases,
    filteredExpenses,
    searchTerm,
  ])

  const totals = useMemo(() => {
    const budget = summaryRows.reduce(
      (sum: number, row: any) =>
        sum + row.budget,
      0
    )

    const expense = summaryRows.reduce(
      (sum: number, row: any) =>
        sum + row.expense,
      0
    )

    const balance =
      budget - expense

    const bills =
      filteredExpenses.length

    const utilization =
      budget > 0
        ? (expense / budget) * 100
        : 0

    return {
      budget,
      expense,
      balance,
      bills,
      utilization,
    }
  }, [
    summaryRows,
    filteredExpenses.length,
  ])

  const monthlyRows = useMemo(() => {
    const map: Record<string, any> =
      {}

    MONTHS.forEach((month) => {
      map[month] = {
        month,
        budget: 0,
        expense: 0,
      }
    })

    releases
      .filter((release: any) => {
        if (
          !selectedFY
        ) {
          return true
        }

        return (
          release.financial_year ===
          selectedFY
        )
      })
      .filter((release: any) => {
        if (
          !selectedTaluk
        ) {
          return true
        }

        return (
          release.taluk_id ===
          selectedTaluk
        )
      })
      .filter((release: any) => {
        if (
          !selectedHead
        ) {
          return true
        }

        return (
          release.budget_head_id ===
          selectedHead
        )
      })
      .filter((release: any) => {
        if (
          !selectedSubHead
        ) {
          return true
        }

        return (
          release.budget_sub_head_id ===
          selectedSubHead
        )
      })
      .forEach((release: any) => {
        const month =
          release.month
            ?.toString()
            .toUpperCase()

        if (map[month]) {
          map[month].budget +=
            getReleasedAmount(
              release
            )
        }
      })

    expenses
      .filter((expense: any) => {
        if (
          !selectedFY
        ) {
          return true
        }

        return (
          getFinancialYearForDate(
            expense.expense_date
          ) === selectedFY
        )
      })
      .filter((expense: any) => {
        if (
          !selectedTaluk
        ) {
          return true
        }

        return (
          expense.taluk_id ===
          selectedTaluk
        )
      })
      .filter((expense: any) => {
        if (
          !selectedHead
        ) {
          return true
        }

        return (
          expense.head_id ===
          selectedHead
        )
      })
      .filter((expense: any) => {
        if (
          !selectedSubHead
        ) {
          return true
        }

        return (
          expense.sub_head_id ===
          selectedSubHead
        )
      })
      .forEach((expense: any) => {
        const month =
          getMonthForDate(
            expense.expense_date
          )

        if (map[month]) {
          map[month].expense +=
            getExpenseAmount(
              expense
            )
        }
      })

    return MONTHS.map(
      (month) => ({
        ...map[month],
        balance:
          map[month].budget -
          map[month].expense,
      })
    )
  }, [
    releases,
    expenses,
    selectedFY,
    selectedTaluk,
    selectedHead,
    selectedSubHead,
  ])

  const clearFilters = () => {
    setSelectedFY('')
    setSelectedMonth('')
    setSelectedTaluk('')
    setSelectedHead('')
    setSelectedSubHead('')
    setSearchTerm('')
  }

  function exportSummary() {
    const worksheetData =
      summaryRows.map(
        (row: any) => ({
          Taluk: row.taluk,
          Head: row.head,
          'Sub Head': row.subHead,
          Budget: row.budget,
          Expense: row.expense,
          Balance: row.balance,
          'Utilization %':
            Number(
              row.utilization.toFixed(2)
            ),
        })
      )

    const workbook =
      XLSX.utils.book_new()

    const worksheet =
      XLSX.utils.json_to_sheet(
        worksheetData
      )

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Budget Summary'
    )

    const filename =
      [
        'budget-report',
        selectedFY || 'all-years',
        selectedMonth || 'all-months',
      ].join('_') +
      '.xlsx'

    XLSX.writeFile(
      workbook,
      filename
    )
  }

  function exportMonthlyReport() {
    const worksheetData =
      monthlyRows.map(
        (row: any) => ({
          Month: row.month,
          Budget: row.budget,
          Expense: row.expense,
          Balance: row.balance,
        })
      )

    const workbook =
      XLSX.utils.book_new()

    const worksheet =
      XLSX.utils.json_to_sheet(
        worksheetData
      )

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Monthly Report'
    )

    XLSX.writeFile(
      workbook,
      `monthly-budget-report-${
        selectedFY || 'all-years'
      }.xlsx`
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-[1500px] mx-auto">
          <h1 className="text-3xl font-bold text-slate-800">
            Loading Reports...
          </h1>
        </div>
      </main>
    )
  }

  const filteredSubHeads =
    selectedHead
      ? subHeads.filter(
          (subHead: any) =>
            subHead.budget_head_id ===
              selectedHead ||
            subHead.head_id ===
              selectedHead
        )
      : subHeads

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Budget & Expense Reports
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Detailed budget, expense, balance and utilization reporting.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportSummary}
                disabled={
                  summaryRows.length === 0
                }
                className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                Export Summary
              </button>

              <button
                type="button"
                onClick={exportMonthlyReport}
                className="border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
              >
                Export Monthly
              </button>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white border rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Financial Year
              </label>

              <select
                className="border border-slate-300 p-3 rounded-lg w-full bg-white"
                value={selectedFY}
                onChange={(e) => {
                  setSelectedFY(
                    e.target.value
                  )

                  if (!e.target.value) {
                    setSelectedMonth('')
                  }
                }}
              >
                <option value="">
                  All Financial Years
                </option>

                {FINANCIAL_YEARS.map(
                  (year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Month
              </label>

              <select
                className="border border-slate-300 p-3 rounded-lg w-full bg-white"
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
              >
                <option value="">
                  All Months
                </option>

                {MONTHS.map(
                  (month) => (
                    <option
                      key={month}
                      value={month}
                    >
                      {month}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Taluk
              </label>

              <select
                className="border border-slate-300 p-3 rounded-lg w-full bg-white"
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
                      value={taluk.id}
                    >
                      {taluk.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Budget Head
              </label>

              <select
                className="border border-slate-300 p-3 rounded-lg w-full bg-white"
                value={selectedHead}
                onChange={(e) => {
                  setSelectedHead(
                    e.target.value
                  )
                  setSelectedSubHead('')
                }}
              >
                <option value="">
                  All Heads
                </option>

                {heads.map(
                  (head: any) => (
                    <option
                      key={head.id}
                      value={head.id}
                    >
                      {getHeadLabel(head)}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Sub-head
              </label>

              <select
                className="border border-slate-300 p-3 rounded-lg w-full bg-white"
                value={selectedSubHead}
                onChange={(e) =>
                  setSelectedSubHead(
                    e.target.value
                  )
                }
                disabled={
                  !selectedHead
                }
              >
                <option value="">
                  {selectedHead
                    ? 'All Sub-heads'
                    : 'Select Head First'}
                </option>

                {filteredSubHeads.map(
                  (subHead: any) => (
                    <option
                      key={subHead.id}
                      value={subHead.id}
                    >
                      {getSubHeadLabel(
                        subHead
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Search
              </label>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder="Taluk / Head / Bill / UTR..."
                className="border border-slate-300 p-3 rounded-lg w-full"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={clearFilters}
              className="border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Budget Released
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-1">
              ₹ {formatCurrency(totals.budget)}
            </p>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Total Expense
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-1">
              ₹ {formatCurrency(totals.expense)}
            </p>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Balance
            </p>
            <p
              className={`text-3xl font-bold mt-1 ${
                totals.balance < 0
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              ₹ {formatCurrency(totals.balance)}
            </p>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Bills
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-1">
              {totals.bills}
            </p>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-5">
            <p className="text-sm text-slate-500">
              Utilization
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-1">
              {totals.utilization.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* MONTHLY REPORT */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Monthly Budget vs Expense
              </h2>
              <p className="text-sm text-slate-500">
                Monthly view for the selected financial year and other filters.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#163f63] text-white">
                  <th className="border p-3 text-left">
                    Month
                  </th>
                  <th className="border p-3 text-right">
                    Budget
                  </th>
                  <th className="border p-3 text-right">
                    Expense
                  </th>
                  <th className="border p-3 text-right">
                    Balance
                  </th>
                </tr>
              </thead>

              <tbody>
                {monthlyRows.map(
                  (row: any) => (
                    <tr key={row.month}>
                      <td className="border p-3 font-medium">
                        {row.month}
                      </td>

                      <td className="border p-3 text-right">
                        ₹ {formatCurrency(row.budget)}
                      </td>

                      <td className="border p-3 text-right">
                        ₹ {formatCurrency(row.expense)}
                      </td>

                      <td
                        className={`border p-3 text-right font-semibold ${
                          row.balance < 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        ₹ {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAILED REPORT */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold text-slate-800">
              Detailed Budget & Expense Report
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Grouped by Taluk, Budget Head and Sub-head.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr className="bg-[#163f63] text-white">
                  <th className="border p-3 text-left">
                    Taluk
                  </th>

                  <th className="border p-3 text-left">
                    Budget Head
                  </th>

                  <th className="border p-3 text-left">
                    Sub-head
                  </th>

                  <th className="border p-3 text-right">
                    Budget
                  </th>

                  <th className="border p-3 text-right">
                    Expense
                  </th>

                  <th className="border p-3 text-right">
                    Balance
                  </th>

                  <th className="border p-3 text-right">
                    Utilization
                  </th>
                </tr>
              </thead>

              <tbody>
                {summaryRows.map(
                  (row: any, index: number) => (
                    <tr
                      key={`${row.talukId}-${row.headId}-${row.subHeadId}-${index}`}
                    >
                      <td className="border p-3">
                        {row.taluk}
                      </td>

                      <td className="border p-3">
                        {row.head}
                      </td>

                      <td className="border p-3">
                        {row.subHead}
                      </td>

                      <td className="border p-3 text-right">
                        ₹ {formatCurrency(row.budget)}
                      </td>

                      <td className="border p-3 text-right">
                        ₹ {formatCurrency(row.expense)}
                      </td>

                      <td
                        className={`border p-3 text-right font-semibold ${
                          row.balance < 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        ₹ {formatCurrency(row.balance)}
                      </td>

                      <td className="border p-3 text-right">
                        {row.utilization.toFixed(1)}%
                      </td>
                    </tr>
                  )
                )}

                {summaryRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="border p-8 text-center text-slate-500"
                    >
                      No report data matches the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>

              {summaryRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td
                      colSpan={3}
                      className="border p-3"
                    >
                      Total
                    </td>

                    <td className="border p-3 text-right">
                      ₹ {formatCurrency(totals.budget)}
                    </td>

                    <td className="border p-3 text-right">
                      ₹ {formatCurrency(totals.expense)}
                    </td>

                    <td
                      className={`border p-3 text-right ${
                        totals.balance < 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      ₹ {formatCurrency(totals.balance)}
                    </td>

                    <td className="border p-3 text-right">
                      {totals.utilization.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

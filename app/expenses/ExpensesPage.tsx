'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getFinancialYear(dateString: string) {
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

function getMonthName(dateString: string) {
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

function getBudgetPeriodDates(
  financialYear: string,
  month: string
) {
  const financialYearStart =
    Number(financialYear.slice(0, 4))

  const monthNumber = MONTH_NUMBERS[month]

  if (
    !financialYearStart ||
    !monthNumber
  ) {
    return null
  }

  const calendarYear =
    monthNumber >= 4
      ? financialYearStart
      : financialYearStart + 1

  const startDate =
    `${calendarYear}-${String(monthNumber).padStart(2, '0')}-01`

  const nextMonth =
    monthNumber === 12
      ? 1
      : monthNumber + 1

  const nextYear =
    monthNumber === 12
      ? calendarYear + 1
      : calendarYear

  const endDate =
    `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  return {
    startDate,
    endDate,
  }
}

type BudgetStatus = {
  financialYear: string
  month: string
  released: number
  spent: number
  available: number
}

export default function ExpensesPage() {
  const supabase = createClient()

  const [expenses, setExpenses] = useState<any[]>([])

  const [taluks, setTaluks] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [heads, setHeads] = useState<any[]>([])
  const [subHeads, setSubHeads] = useState<any[]>([])

  const [expenseDate, setExpenseDate] = useState('')
  const [talukId, setTalukId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [headId, setHeadId] = useState('')
  const [subHeadId, setSubHeadId] = useState('')

  const [details, setDetails] = useState('')

  const [billAmount, setBillAmount] = useState('')
  const [gstAmount, setGstAmount] = useState('')
  const [gstDeduction, setGstDeduction] = useState('')
  const [tdsDeduction, setTdsDeduction] = useState('')
  const [netPayable, setNetPayable] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingBudget, setLoadingBudget] =
    useState(false)

  const [budgetStatus, setBudgetStatus] =
    useState<BudgetStatus | null>(null)

  async function loadMasters() {
    const [
      { data: talukData, error: talukError },
      { data: branchData, error: branchError },
      { data: categoryData, error: categoryError },
      { data: headData, error: headError },
      { data: subHeadData, error: subHeadError },
    ] = await Promise.all([
      supabase
        .from('taluks')
        .select('*')
        .order('name'),

      supabase
        .from('branches')
        .select('*')
        .order('name'),

      supabase
        .from('expense_categories')
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

    if (branchError) {
      throw new Error(
        `Unable to load branches: ${branchError.message}`
      )
    }

    if (categoryError) {
      throw new Error(
        `Unable to load categories: ${categoryError.message}`
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
    setBranches(branchData || [])
    setCategories(categoryData || [])
    setHeads(headData || [])
    setSubHeads(subHeadData || [])
  }

  async function loadExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        taluks(name),
        branches(name),
        expense_categories(name),
        budget_heads(head_name),
        budget_sub_heads(sub_head_name)
      `)
      .order('expense_date', {
        ascending: false,
      })

    if (error) {
      throw new Error(
        `Unable to load expenses: ${error.message}`
      )
    }

    setExpenses(data || [])
  }

  async function loadPageData() {
    setLoading(true)

    try {
      await Promise.all([
        loadMasters(),
        loadExpenses(),
      ])
    } catch (error: any) {
      console.error(
        'Expense page load error:',
        error
      )

      alert(
        error?.message ||
          'Unable to load expense page data.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function getBudgetStatus() {
    if (
      !expenseDate ||
      !talukId ||
      !headId ||
      !subHeadId
    ) {
      setBudgetStatus(null)
      return
    }

    const financialYear =
      getFinancialYear(expenseDate)

    const month =
      getMonthName(expenseDate)

    const period =
      getBudgetPeriodDates(
        financialYear,
        month
      )

    if (!financialYear || !month || !period) {
      setBudgetStatus(null)
      return
    }

    setLoadingBudget(true)

    try {
      /*
       * Budget releases are imported without a branch_id,
       * so branch is not used in the budget lookup.
       * Branch remains an attribute of the expense itself.
       */
      const { data: releases, error: releaseError } =
        await supabase
          .from('budget_releases')
          .select(`
            installment_1,
            installment_2,
            installment_3,
            installment_4,
            amount
          `)
          .eq(
            'financial_year',
            financialYear
          )
          .eq('month', month)
          .eq('taluk_id', talukId)
          .eq('budget_head_id', headId)
          .eq(
            'budget_sub_head_id',
            subHeadId
          )

      if (releaseError) {
        throw releaseError
      }

      const released = (releases || []).reduce(
        (sum: number, release: any) =>
          sum +
          Number(
            release.installment_1 || 0
          ) +
          Number(
            release.installment_2 || 0
          ) +
          Number(
            release.installment_3 || 0
          ) +
          Number(
            release.installment_4 || 0
          ),
        0
      )

      const {
        data: existingExpenses,
        error: expenseError,
      } = await supabase
        .from('expenses')
        .select('net_payable')
        .eq('taluk_id', talukId)
        .eq('head_id', headId)
        .eq('sub_head_id', subHeadId)
        .gte(
          'expense_date',
          period.startDate
        )
        .lt(
          'expense_date',
          period.endDate
        )

      if (expenseError) {
        throw expenseError
      }

      const spent = (
        existingExpenses || []
      ).reduce(
        (sum: number, expense: any) =>
          sum +
          Number(
            expense.net_payable || 0
          ),
        0
      )

      setBudgetStatus({
        financialYear,
        month,
        released,
        spent,
        available: released - spent,
      })
    } catch (error) {
      console.error(
        'Budget status error:',
        error
      )

      setBudgetStatus(null)
    } finally {
      setLoadingBudget(false)
    }
  }

  async function saveExpense() {
    if (!expenseDate) {
      alert('Select an expense date.')
      return
    }

    if (!talukId) {
      alert('Select a Taluk.')
      return
    }

    if (!headId) {
      alert('Select a Budget Head.')
      return
    }

    if (!subHeadId) {
      alert('Select a Budget Sub-head.')
      return
    }

    const expenseAmount =
      toNumber(netPayable)

    if (expenseAmount <= 0) {
      alert(
        'Net Payable must be greater than zero.'
      )
      return
    }

    const financialYear =
      getFinancialYear(expenseDate)

    const month =
      getMonthName(expenseDate)

    const period =
      getBudgetPeriodDates(
        financialYear,
        month
      )

    if (!financialYear || !month || !period) {
      alert(
        'Unable to determine the financial year or month from the expense date.'
      )
      return
    }

    setSaving(true)

    try {
      /*
       * Re-check the budget immediately before insert.
       * This prevents the amount from being validated
       * against a stale value shown on the page.
       */
      const { data: releases, error: releaseError } =
        await supabase
          .from('budget_releases')
          .select(`
            installment_1,
            installment_2,
            installment_3,
            installment_4
          `)
          .eq(
            'financial_year',
            financialYear
          )
          .eq('month', month)
          .eq('taluk_id', talukId)
          .eq('budget_head_id', headId)
          .eq(
            'budget_sub_head_id',
            subHeadId
          )

      if (releaseError) {
        throw releaseError
      }

      if (!releases || releases.length === 0) {
        throw new Error(
          `Budget Release not found for ${month} ${financialYear} for the selected Taluk, Head and Sub-head.`
        )
      }

      const releasedBudget =
        releases.reduce(
          (sum: number, release: any) =>
            sum +
            Number(
              release.installment_1 || 0
            ) +
            Number(
              release.installment_2 || 0
            ) +
            Number(
              release.installment_3 || 0
            ) +
            Number(
              release.installment_4 || 0
            ),
          0
        )

      const {
        data: existingExpenses,
        error: expenseError,
      } = await supabase
        .from('expenses')
        .select('net_payable')
        .eq('taluk_id', talukId)
        .eq('head_id', headId)
        .eq('sub_head_id', subHeadId)
        .gte(
          'expense_date',
          period.startDate
        )
        .lt(
          'expense_date',
          period.endDate
        )

      if (expenseError) {
        throw expenseError
      }

      const spentAmount =
        (existingExpenses || []).reduce(
          (sum: number, expense: any) =>
            sum +
            Number(
              expense.net_payable || 0
            ),
          0
        )

      const availableBudget =
        releasedBudget - spentAmount

      if (expenseAmount > availableBudget) {
        throw new Error(
          `Insufficient Budget\n\nAvailable: ₹${formatCurrency(
            availableBudget
          )}\n\nRequested: ₹${formatCurrency(
            expenseAmount
          )}`
        )
      }

      const { error: insertError } =
        await supabase.from('expenses').insert({
          expense_date: expenseDate,
          taluk_id: talukId,
          branch_id: branchId || null,
          category_id: categoryId || null,
          head_id: headId,
          sub_head_id: subHeadId,
          details: details.trim() || null,
          bill_amount: toNumber(billAmount),
          gst_amount: toNumber(gstAmount),
          gst_deduction: toNumber(
            gstDeduction
          ),
          tds_deduction: toNumber(
            tdsDeduction
          ),
          net_payable: expenseAmount,
        })

      if (insertError) {
        throw insertError
      }

      alert('Expense Saved')

      resetForm()
      await loadExpenses()
    } catch (error: any) {
      console.error(
        'Save expense error:',
        error
      )

      alert(
        error?.message ||
          'Unable to save expense.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteExpense(id: string) {
    const confirmed = confirm(
      'Delete this expense?'
    )

    if (!confirmed) {
      return
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    await loadExpenses()

    /*
     * Refresh the displayed budget status because
     * deleting an expense increases available budget.
     */
    await getBudgetStatus()
  }

  function resetForm() {
    setExpenseDate('')
    setTalukId('')
    setBranchId('')
    setCategoryId('')
    setHeadId('')
    setSubHeadId('')
    setDetails('')
    setBillAmount('')
    setGstAmount('')
    setGstDeduction('')
    setTdsDeduction('')
    setNetPayable('')
    setBudgetStatus(null)
  }

  useEffect(() => {
    loadPageData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      getBudgetStatus()
    }, 250)

    return () => clearTimeout(timer)
  }, [
    expenseDate,
    talukId,
    headId,
    subHeadId,
  ])

  if (loading) {
    return (
      <main className="p-8">
        <h2 className="text-2xl font-semibold">
          Loading Expense Page...
        </h2>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Expense Entry
      </h1>

      {/* EXPENSE FORM */}
      <div className="border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">
          Enter Expense
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block font-medium mb-2">
              Expense Date *
            </label>

            <input
              type="date"
              className="border p-3 rounded w-full"
              value={expenseDate}
              onChange={(e) =>
                setExpenseDate(
                  e.target.value
                )
              }
              disabled={saving}
            />

            {expenseDate && (
              <p className="text-sm text-gray-600 mt-1">
                {getFinancialYear(
                  expenseDate
                )}{' '}
                •{' '}
                {getMonthName(
                  expenseDate
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium mb-2">
              Taluk *
            </label>

            <select
              className="border p-3 rounded w-full"
              value={talukId}
              onChange={(e) =>
                setTalukId(
                  e.target.value
                )
              }
              disabled={saving}
            >
              <option value="">
                Select Taluk
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
            <label className="block font-medium mb-2">
              Branch
            </label>

            <select
              className="border p-3 rounded w-full"
              value={branchId}
              onChange={(e) =>
                setBranchId(
                  e.target.value
                )
              }
              disabled={saving}
            >
              <option value="">
                Select Branch
              </option>

              {branches.map(
                (branch: any) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                )
              )}
            </select>

            <p className="text-xs text-gray-500 mt-1">
              Optional. Branch is stored with the expense
              but is not used to identify the imported budget
              release because budget releases currently use
              branch_id = null.
            </p>
          </div>

          <div>
            <label className="block font-medium mb-2">
              Category
            </label>

            <select
              className="border p-3 rounded w-full"
              value={categoryId}
              onChange={(e) =>
                setCategoryId(
                  e.target.value
                )
              }
              disabled={saving}
            >
              <option value="">
                Select Category
              </option>

              {categories.map(
                (category: any) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">
              Budget Head *
            </label>

            <select
              className="border p-3 rounded w-full"
              value={headId}
              onChange={(e) => {
                setHeadId(
                  e.target.value
                )
                setSubHeadId('')
              }}
              disabled={saving}
            >
              <option value="">
                Select Head
              </option>

              {heads.map(
                (head: any) => (
                  <option
                    key={head.id}
                    value={head.id}
                  >
                    {head.head_code} -{' '}
                    {head.head_name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">
              Budget Sub-head *
            </label>

            <select
              className="border p-3 rounded w-full"
              value={subHeadId}
              onChange={(e) =>
                setSubHeadId(
                  e.target.value
                )
              }
              disabled={
                saving || !headId
              }
            >
              <option value="">
                {headId
                  ? 'Select Sub Head'
                  : 'Select Head First'}
              </option>

              {subHeads.map(
                (subHead: any) => (
                  <option
                    key={subHead.id}
                    value={subHead.id}
                  >
                    {subHead.sub_head_code} -{' '}
                    {subHead.sub_head_name}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium mb-2">
              Details
            </label>

            <textarea
              placeholder="Expense details"
              className="border p-3 rounded w-full min-h-24"
              value={details}
              onChange={(e) =>
                setDetails(
                  e.target.value
                )
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Bill Amount
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Bill Amount"
              className="border p-3 rounded w-full"
              value={billAmount}
              onChange={(e) =>
                setBillAmount(
                  e.target.value
                )
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              GST Amount
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="GST Amount"
              className="border p-3 rounded w-full"
              value={gstAmount}
              onChange={(e) =>
                setGstAmount(
                  e.target.value
                )
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              GST Deduction
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="GST Deduction"
              className="border p-3 rounded w-full"
              value={gstDeduction}
              onChange={(e) =>
                setGstDeduction(
                  e.target.value
                )
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              TDS Deduction
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="TDS Deduction"
              className="border p-3 rounded w-full"
              value={tdsDeduction}
              onChange={(e) =>
                setTdsDeduction(
                  e.target.value
                )
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Net Payable *
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Net Payable"
              className="border p-3 rounded w-full"
              value={netPayable}
              onChange={(e) =>
                setNetPayable(
                  e.target.value
                )
              }
              disabled={saving}
            />
          </div>
        </div>

        {/* BUDGET STATUS */}
        {(expenseDate &&
          talukId &&
          headId &&
          subHeadId) && (
          <div className="border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="font-bold">
                Budget Availability
              </h3>

              {loadingBudget && (
                <span className="text-sm text-gray-600">
                  Checking...
                </span>
              )}
            </div>

            {!loadingBudget &&
              budgetStatus && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Period
                    </p>

                    <p className="font-semibold">
                      {budgetStatus.month}{' '}
                      {budgetStatus.financialYear}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      Released
                    </p>

                    <p className="font-semibold">
                      ₹{' '}
                      {formatCurrency(
                        budgetStatus.released
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      Spent
                    </p>

                    <p className="font-semibold">
                      ₹{' '}
                      {formatCurrency(
                        budgetStatus.spent
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      Available
                    </p>

                    <p
                      className={`font-semibold ${
                        budgetStatus.available <
                        0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      ₹{' '}
                      {formatCurrency(
                        budgetStatus.available
                      )}
                    </p>
                  </div>
                </div>
              )}

            {!loadingBudget &&
              !budgetStatus && (
                <p className="text-sm text-red-600">
                  No matching budget release was found
                  for the selected expense period,
                  Taluk, Head and Sub-head.
                </p>
              )}
          </div>
        )}

        <button
          onClick={saveExpense}
          disabled={saving}
          className="bg-black text-white px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? 'Saving...'
            : 'Save Expense'}
        </button>
      </div>

      {/* EXPENSE LIST */}
      <div className="border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">
          Expenses
        </h2>

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
                  Branch
                </th>

                <th className="border p-2 text-left">
                  Category
                </th>

                <th className="border p-2 text-left">
                  Head
                </th>

                <th className="border p-2 text-left">
                  Sub Head
                </th>

                <th className="border p-2 text-left">
                  Details
                </th>

                <th className="border p-2 text-right">
                  Amount
                </th>

                <th className="border p-2 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {expenses.map(
                (expense: any) => (
                  <tr key={expense.id}>
                    <td className="border p-2">
                      {expense.expense_date}
                    </td>

                    <td className="border p-2">
                      {expense.taluks?.name ||
                        'Unknown'}
                    </td>

                    <td className="border p-2">
                      {expense.branches?.name ||
                        '—'}
                    </td>

                    <td className="border p-2">
                      {expense
                        .expense_categories
                        ?.name || '—'}
                    </td>

                    <td className="border p-2">
                      {expense.budget_heads
                        ?.head_name || '—'}
                    </td>

                    <td className="border p-2">
                      {expense
                        .budget_sub_heads
                        ?.sub_head_name ||
                        '—'}
                    </td>

                    <td className="border p-2">
                      {expense.details ||
                        '—'}
                    </td>

                    <td className="border p-2 text-right">
                      ₹{' '}
                      {formatCurrency(
                        Number(
                          expense.net_payable ||
                            0
                        )
                      )}
                    </td>

                    <td className="border p-2">
                      <button
                        onClick={() =>
                          deleteExpense(
                            expense.id
                          )
                        }
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}

              {expenses.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="border p-4 text-center text-gray-600"
                  >
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

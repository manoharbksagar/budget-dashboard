'use client'

import { useEffect, useState } from 'react'
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
  const [billNumber, setBillNumber] = useState('')
  const [tokenNumber, setTokenNumber] = useState('')
  const [utrNumber, setUtrNumber] = useState('')
  const [billPreparedDate, setBillPreparedDate] = useState('')
  const [headOfficeSubmittedDate, setHeadOfficeSubmittedDate] = useState('')
  const [treasurySubmittedDate, setTreasurySubmittedDate] = useState('')
  const [gstApplicable, setGstApplicable] = useState(false)

  const [billAmount, setBillAmount] = useState('')
  const [gstAmount, setGstAmount] = useState('')
  const [gstDeduction, setGstDeduction] = useState('')
  const [tdsDeduction, setTdsDeduction] = useState('')
  const [netPayable, setNetPayable] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingExpenseId, setEditingExpenseId] =
    useState<string | null>(null)
  const [loadingBudget, setLoadingBudget] =
    useState(false)

  const [userRole, setUserRole] =
    useState<'admin' | 'user' | null>(null)

  const [budgetStatus, setBudgetStatus] =
    useState<BudgetStatus | null>(null)

  const [filterFY, setFilterFY] = useState('')
  const [filterMonth, setFilterMonth] =
    useState('')
  const [filterTaluk, setFilterTaluk] =
    useState('')
  const [filterHead, setFilterHead] =
    useState('')
  const [filterSubHead, setFilterSubHead] =
    useState('')
  const [searchTerm, setSearchTerm] =
    useState('')
  const [currentPage, setCurrentPage] =
    useState(1)

  const pageSize = 10

  async function loadUserRole() {
    const { data: claimsData } =
      await supabase.auth.getClaims()

    const claims = claimsData?.claims

    if (!claims?.sub) {
      setUserRole(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', claims.sub)
      .maybeSingle()

    if (error) {
      console.error(
        'Unable to load user role:',
        error
      )
      setUserRole(null)
      return
    }

    setUserRole(
      data?.role === 'admin'
        ? 'admin'
        : 'user'
    )
  }

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
        loadUserRole(),
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
    if (
      editingExpenseId &&
      userRole !== 'admin'
    ) {
      alert(
        'Only administrators can update expenses.'
      )
      return
    }

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

    if (
      !financialYear ||
      !month ||
      !period
    ) {
      alert(
        'Unable to determine the financial year or month from the expense date.'
      )
      return
    }

    setSaving(true)

    try {
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

      let expenseQuery = supabase
        .from('expenses')
        .select('id, net_payable')
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

      if (editingExpenseId) {
        expenseQuery = expenseQuery.neq(
          'id',
          editingExpenseId
        )
      }

      const {
        data: existingExpenses,
        error: expenseError,
      } = await expenseQuery

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

      const expensePayload = {
        expense_date: expenseDate,
        taluk_id: talukId,
        branch_id: branchId || null,
        category_id: categoryId || null,
        head_id: headId,
        sub_head_id: subHeadId,
        details: details.trim() || null,
        bill_number:
          billNumber.trim() || null,
        token_number:
          tokenNumber.trim() || null,
        utr_number:
          utrNumber.trim() || null,
        bill_prepared_date:
          billPreparedDate || null,
        head_office_submitted_date:
          headOfficeSubmittedDate || null,
        treasury_submitted_date:
          treasurySubmittedDate || null,
        gst_applicable:
          gstApplicable,
        bill_amount:
          toNumber(billAmount),
        gst_amount:
          toNumber(gstAmount),
        gst_deduction:
          toNumber(gstDeduction),
        tds_deduction:
          toNumber(tdsDeduction),
        net_payable:
          expenseAmount,
      }

      if (editingExpenseId) {
        const { error: updateError } =
          await supabase
            .from('expenses')
            .update(expensePayload)
            .eq('id', editingExpenseId)

        if (updateError) {
          throw updateError
        }

        alert('Expense updated successfully.')
      } else {
        const { error: insertError } =
          await supabase
            .from('expenses')
            .insert(expensePayload)

        if (insertError) {
          throw insertError
        }

        alert('Expense saved successfully.')
      }

      resetForm()
      await loadExpenses()
    } catch (error: any) {
      console.error(
        'Save/update expense error:',
        error
      )

      alert(
        error?.message ||
          'Unable to save the expense.'
      )
    } finally {
      setSaving(false)
    }
  }

  function editExpense(expense: any) {
    if (userRole !== 'admin') {
      alert(
        'You have view-only access to expenses.'
      )
      return
    }

    setEditingExpenseId(expense.id)

    setExpenseDate(
      expense.expense_date || ''
    )
    setTalukId(
      expense.taluk_id || ''
    )
    setBranchId(
      expense.branch_id || ''
    )
    setCategoryId(
      expense.category_id || ''
    )
    setHeadId(
      expense.head_id || ''
    )
    setSubHeadId(
      expense.sub_head_id || ''
    )

    setDetails(
      expense.details || ''
    )
    setBillNumber(
      expense.bill_number || ''
    )
    setTokenNumber(
      expense.token_number || ''
    )
    setUtrNumber(
      expense.utr_number || ''
    )
    setBillPreparedDate(
      expense.bill_prepared_date || ''
    )
    setHeadOfficeSubmittedDate(
      expense.head_office_submitted_date || ''
    )
    setTreasurySubmittedDate(
      expense.treasury_submitted_date || ''
    )
    setGstApplicable(
      Boolean(expense.gst_applicable)
    )

    setBillAmount(
      String(expense.bill_amount ?? '')
    )
    setGstAmount(
      String(expense.gst_amount ?? '')
    )
    setGstDeduction(
      String(expense.gst_deduction ?? '')
    )
    setTdsDeduction(
      String(expense.tds_deduction ?? '')
    )
    setNetPayable(
      String(expense.net_payable ?? '')
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function deleteExpense(id: string) {
    if (userRole !== 'admin') {
      alert(
        'Only administrators can delete expenses.'
      )
      return
    }

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
    setBillNumber('')
    setTokenNumber('')
    setUtrNumber('')
    setBillPreparedDate('')
    setHeadOfficeSubmittedDate('')
    setTreasurySubmittedDate('')
    setGstApplicable(false)
    setBillAmount('')
    setGstAmount('')
    setGstDeduction('')
    setTdsDeduction('')
    setNetPayable('')
    setBudgetStatus(null)
    setEditingExpenseId(null)
  }

  function cancelEdit() {
    resetForm()
  }

  useEffect(() => {
    loadPageData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [
    filterFY,
    filterMonth,
    filterTaluk,
    filterHead,
    filterSubHead,
    searchTerm,
  ])

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold">
          {editingExpenseId
            ? 'Edit Expense'
            : 'Expense Entry'}
        </h1>

        {editingExpenseId && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
            Editing existing expense
          </span>
        )}
      </div>

      {/* EXPENSE FORM */}
      <div className="border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">
          {editingExpenseId
            ? 'Update Expense Details'
            : 'Enter Expense'}
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
              Bill Number
            </label>

            <input
              type="text"
              placeholder="Bill / Voucher Number"
              className="border p-3 rounded w-full"
              value={billNumber}
              onChange={(e) =>
                setBillNumber(e.target.value)
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Token Number
            </label>

            <input
              type="text"
              placeholder="Token Number"
              className="border p-3 rounded w-full"
              value={tokenNumber}
              onChange={(e) =>
                setTokenNumber(e.target.value)
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              UTR Number
            </label>

            <input
              type="text"
              placeholder="UTR Number"
              className="border p-3 rounded w-full"
              value={utrNumber}
              onChange={(e) =>
                setUtrNumber(e.target.value)
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Bill Prepared Date
            </label>

            <input
              type="date"
              className="border p-3 rounded w-full"
              value={billPreparedDate}
              onChange={(e) =>
                setBillPreparedDate(e.target.value)
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Head Office Submitted Date
            </label>

            <input
              type="date"
              className="border p-3 rounded w-full"
              value={headOfficeSubmittedDate}
              onChange={(e) =>
                setHeadOfficeSubmittedDate(e.target.value)
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Treasury Submitted Date
            </label>

            <input
              type="date"
              className="border p-3 rounded w-full"
              value={treasurySubmittedDate}
              onChange={(e) =>
                setTreasurySubmittedDate(e.target.value)
              }
              disabled={saving}
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              GST Applicable
            </label>

            <select
              className="border p-3 rounded w-full"
              value={gstApplicable ? 'YES' : 'NO'}
              onChange={(e) =>
                setGstApplicable(e.target.value === 'YES')
              }
              disabled={saving}
            >
              <option value="NO">No</option>
              <option value="YES">Yes</option>
            </select>
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

        <div className="flex flex-wrap gap-3">
          <button
            onClick={saveExpense}
            disabled={saving}
            className="bg-black text-white px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? editingExpenseId
                ? 'Updating...'
                : 'Saving...'
              : editingExpenseId
                ? 'Update Expense'
                : 'Save Expense'}
          </button>

          {editingExpenseId && (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="border px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* EXPENSE LIST */}
      <div className="border rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-bold">
              Expenses
            </h2>

            <p className="text-sm text-gray-600 mt-1">
              Filter, search and review saved expenses.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFilterFY('')
              setFilterMonth('')
              setFilterTaluk('')
              setFilterHead('')
              setFilterSubHead('')
              setSearchTerm('')
            }}
            className="border px-4 py-2 rounded"
          >
            Clear Filters
          </button>
        </div>

        {/* EXPENSE FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
          <select
            className="border p-3 rounded"
            value={filterFY}
            onChange={(e) =>
              setFilterFY(e.target.value)
            }
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

          <select
            className="border p-3 rounded"
            value={filterMonth}
            onChange={(e) =>
              setFilterMonth(
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

          <select
            className="border p-3 rounded"
            value={filterTaluk}
            onChange={(e) =>
              setFilterTaluk(
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

          <select
            className="border p-3 rounded"
            value={filterHead}
            onChange={(e) => {
              setFilterHead(
                e.target.value
              )
              setFilterSubHead('')
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
                  {head.head_code} -{' '}
                  {head.head_name}
                </option>
              )
            )}
          </select>

          <select
            className="border p-3 rounded"
            value={filterSubHead}
            onChange={(e) =>
              setFilterSubHead(
                e.target.value
              )
            }
            disabled={!filterHead}
          >
            <option value="">
              {filterHead
                ? 'All Sub-heads'
                : 'Select Head First'}
            </option>

            {subHeads
              .filter(
                (subHead: any) =>
                  !filterHead ||
                  subHead.budget_head_id ===
                    filterHead ||
                  subHead.head_id ===
                    filterHead
              )
              .map(
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

        <div className="mb-5">
          <input
            type="text"
            placeholder="Search Taluk, branch, category, head, sub-head or details..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
            className="border p-3 rounded w-full"
          />
        </div>

        {(() => {
          const filteredExpenses =
            expenses.filter(
              (expense: any) => {
                const expenseDate =
                  expense.expense_date ||
                  ''

                const expenseFY =
                  getFinancialYear(
                    expenseDate
                  )

                const expenseMonth =
                  getMonthName(
                    expenseDate
                  )

                const matchesFY =
                  !filterFY ||
                  expenseFY === filterFY

                const matchesMonth =
                  !filterMonth ||
                  expenseMonth ===
                    filterMonth

                const matchesTaluk =
                  !filterTaluk ||
                  expense.taluk_id ===
                    filterTaluk

                const matchesHead =
                  !filterHead ||
                  expense.head_id ===
                    filterHead

                const matchesSubHead =
                  !filterSubHead ||
                  expense.sub_head_id ===
                    filterSubHead

                const search =
                  searchTerm
                    .trim()
                    .toLowerCase()

                const searchableText = [
                  expenseDate,
                  expense.taluks
                    ?.name,
                  expense.branches
                    ?.name,
                  expense
                    .expense_categories
                    ?.name,
                  expense
                    .budget_heads
                    ?.head_name,
                  expense
                    .budget_sub_heads
                    ?.sub_head_name,
                  expense.bill_number,
                  expense.token_number,
                  expense.utr_number,
                  expense.details,
                ]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase()

                const matchesSearch =
                  !search ||
                  searchableText.includes(
                    search
                  )

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

          const totalFilteredAmount =
            filteredExpenses.reduce(
              (
                sum: number,
                expense: any
              ) =>
                sum +
                Number(
                  expense.net_payable ||
                    0
                ),
              0
            )

          const totalPages = Math.max(
            1,
            Math.ceil(
              filteredExpenses.length /
                pageSize
            )
          )

          const safeCurrentPage =
            Math.min(
              currentPage,
              totalPages
            )

          const paginatedExpenses =
            filteredExpenses.slice(
              (safeCurrentPage - 1) *
                pageSize,
              safeCurrentPage *
                pageSize
            )

          return (
            <>
              {/* FILTER SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Matching Expenses
                  </p>

                  <p className="text-2xl font-bold">
                    {filteredExpenses.length}
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Matching Net Payable
                  </p>

                  <p className="text-2xl font-bold">
                    ₹{' '}
                    {formatCurrency(
                      totalFilteredAmount
                    )}
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Showing
                  </p>

                  <p className="text-2xl font-bold">
                    {filteredExpenses.length ===
                    0
                      ? 0
                      : (safeCurrentPage -
                          1) *
                          pageSize +
                        1}{' '}
                    -
                    {' '}
                    {Math.min(
                      safeCurrentPage *
                        pageSize,
                      filteredExpenses.length
                    )}
                  </p>
                </div>
              </div>

              {/* EXPENSE TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full border">
                  <thead>
                    <tr>
                      <th className="border p-2 text-left whitespace-nowrap">
                        Date
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Taluk
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Branch
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Category
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Head
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Sub Head
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Bill No
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Token No
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        UTR No
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Bill Prepared
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Details
                      </th>

                      <th className="border p-2 text-right whitespace-nowrap">
                        Bill Amount
                      </th>

                      <th className="border p-2 text-right whitespace-nowrap">
                        GST
                      </th>

                      <th className="border p-2 text-right whitespace-nowrap">
                        GST Deduction
                      </th>

                      <th className="border p-2 text-right whitespace-nowrap">
                        TDS
                      </th>

                      <th className="border p-2 text-right whitespace-nowrap">
                        Net Payable
                      </th>

                      <th className="border p-2 text-left whitespace-nowrap">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedExpenses.map(
                      (expense: any) => (
                        <tr
                          key={
                            expense.id
                          }
                        >
                          <td className="border p-2 whitespace-nowrap">
                            {
                              expense.expense_date
                            }
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense
                              .taluks
                              ?.name ||
                              'Unknown'}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense
                              .branches
                              ?.name ||
                              '—'}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense
                              .expense_categories
                              ?.name ||
                              '—'}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense
                              .budget_heads
                              ?.head_name ||
                              '—'}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense
                              .budget_sub_heads
                              ?.sub_head_name ||
                              '—'}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense.bill_number ||
                              '—'}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense.token_number ||
                              '—'}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense.utr_number ||
                              '—'}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {expense.bill_prepared_date ||
                              '—'}
                          </td>

                          <td className="border p-2 min-w-48">
                            {expense.details ||
                              '—'}
                          </td>

                          <td className="border p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              Number(
                                expense.bill_amount ||
                                  0
                              )
                            )}
                          </td>

                          <td className="border p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              Number(
                                expense.gst_amount ||
                                  0
                              )
                            )}
                          </td>

                          <td className="border p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              Number(
                                expense.gst_deduction ||
                                  0
                              )
                            )}
                          </td>

                          <td className="border p-2 text-right whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              Number(
                                expense.tds_deduction ||
                                  0
                              )
                            )}
                          </td>

                          <td className="border p-2 text-right font-medium whitespace-nowrap">
                            ₹{' '}
                            {formatCurrency(
                              Number(
                                expense.net_payable ||
                                  0
                              )
                            )}
                          </td>

                          <td className="border p-2 whitespace-nowrap">
                            {userRole === 'admin' ? (
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    editExpense(
                                      expense
                                    )
                                  }
                                  className="text-blue-600 hover:underline"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteExpense(
                                      expense.id
                                    )
                                  }
                                  className="text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">
                                View only
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}

                    {paginatedExpenses.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={17}
                          className="border p-6 text-center text-gray-600"
                        >
                          No expenses match the
                          selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.max(
                          1,
                          page - 1
                        )
                    )
                  }
                  disabled={
                    safeCurrentPage === 1
                  }
                  className="border px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-sm text-gray-600">
                  Page {safeCurrentPage} of{' '}
                  {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.min(
                          totalPages,
                          page + 1
                        )
                    )
                  }
                  disabled={
                    safeCurrentPage >=
                    totalPages
                  }
                  className="border px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )
        })()}
      </div>
    </main>
  )
}

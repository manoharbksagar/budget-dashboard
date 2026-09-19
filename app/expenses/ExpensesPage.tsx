'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

  async function loadMasters() {
    const { data: taluks } =
      await supabase.from('taluks').select('*')

    const { data: branches } =
      await supabase.from('branches').select('*')

    const { data: categories } =
      await supabase
        .from('expense_categories')
        .select('*')

    const { data: heads } =
      await supabase
        .from('budget_heads')
        .select('*')

    const { data: subHeads } =
      await supabase
        .from('budget_sub_heads')
        .select('*')

    setTaluks(taluks || [])
    setBranches(branches || [])
    setCategories(categories || [])
    setHeads(heads || [])
    setSubHeads(subHeads || [])
  }

  async function loadExpenses() {
    const { data } = await supabase
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
      console.log(data)
    setExpenses(data || [])
  }

  async function saveExpense() {
    const { error } = await supabase
      .from('expenses')
      .insert({
        expense_date: expenseDate,
        taluk_id: talukId,
        branch_id: branchId,
        category_id: categoryId || null,
        head_id: headId,
        sub_head_id: subHeadId,
        details,
        bill_amount: Number(billAmount) || 0,
        gst_amount: Number(gstAmount) || 0,
        gst_deduction: Number(gstDeduction) || 0,
        tds_deduction: Number(tdsDeduction) || 0,
        net_payable: Number(netPayable) || 0,
      })

    if (error) {
      alert(error.message)
      return
    }

    alert('Expense Saved')

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

    loadExpenses()
  }
  async function deleteExpense(id: string) {
  if (!confirm('Delete expense?')) return

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) {
    alert(error.message)
    return
  }

  loadExpenses()
}

  useEffect(() => {
    loadMasters()
    loadExpenses()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Expense Entry
      </h1>

      <div className="grid grid-cols-2 gap-4 mb-6">

        <input
          type="date"
          className="border p-3 rounded"
          value={expenseDate}
          onChange={(e) =>
            setExpenseDate(e.target.value)
          }
        />

        <select
          className="border p-3 rounded"
          value={talukId}
          onChange={(e) =>
            setTalukId(e.target.value)
          }
        >
          <option value="">
            Select Taluk
          </option>

          {taluks.map((taluk: any) => (
            <option
              key={taluk.id}
              value={taluk.id}
            >
              {taluk.name}
            </option>
          ))}
        </select>

        <select
          className="border p-3 rounded"
          value={branchId}
          onChange={(e) =>
            setBranchId(e.target.value)
          }
        >
          <option value="">
            Select Branch
          </option>

          {branches.map((branch: any) => (
            <option
              key={branch.id}
              value={branch.id}
            >
              {branch.name}
            </option>
          ))}
        </select>

        <select
          className="border p-3 rounded"
          value={categoryId}
          onChange={(e) =>
            setCategoryId(e.target.value)
          }
        >
          <option value="">
            Select Category
          </option>

          {categories.map((cat: any) => (
            <option
              key={cat.id}
              value={cat.id}
            >
              {cat.name}
            </option>
          ))}
        </select>

        <select
          className="border p-3 rounded"
          value={headId}
          onChange={(e) =>
            setHeadId(e.target.value)
          }
        >
          <option value="">
            Select Head
          </option>

          {heads.map((head: any) => (
            <option
              key={head.id}
              value={head.id}
            >
              {head.head_code} - {head.head_name}
            </option>
          ))}
        </select>

        <select
          className="border p-3 rounded"
          value={subHeadId}
          onChange={(e) =>
            setSubHeadId(e.target.value)
          }
        >
          <option value="">
            Select Sub Head
          </option>

          {subHeads.map((sub: any) => (
            <option
              key={sub.id}
              value={sub.id}
            >
              {sub.sub_head_code} - {sub.sub_head_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Details"
          className="border p-3 rounded"
          value={details}
          onChange={(e) =>
            setDetails(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="Bill Amount"
          className="border p-3 rounded"
          value={billAmount}
          onChange={(e) =>
            setBillAmount(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="GST Amount"
          className="border p-3 rounded"
          value={gstAmount}
          onChange={(e) =>
            setGstAmount(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="GST Deduction"
          className="border p-3 rounded"
          value={gstDeduction}
          onChange={(e) =>
            setGstDeduction(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="TDS Deduction"
          className="border p-3 rounded"
          value={tdsDeduction}
          onChange={(e) =>
            setTdsDeduction(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="Net Payable"
          className="border p-3 rounded"
          value={netPayable}
          onChange={(e) =>
            setNetPayable(e.target.value)
          }
        />
      </div>

      <button
        onClick={saveExpense}
        className="bg-black text-white px-4 py-2 rounded mb-6"
      >
        Save Expense
      </button>

      <table className="w-full border">
        <thead>
  <tr>
    <th className="border p-2">Date</th>
    <th className="border p-2">Taluk</th>
    <th className="border p-2">Branch</th>
    <th className="border p-2">Category</th>
    <th className="border p-2">Head</th>
    <th className="border p-2">Sub Head</th>
    <th className="border p-2">Amount</th>
    <th className="border p-2">Action</th>
  </tr>
</thead>

        <tbody>
  {expenses.map((expense: any) => (
    <tr key={expense.id}>
      <td className="border p-2">
        {expense.expense_date}
      </td>

      <td className="border p-2">
        {expense.taluks?.name}
      </td>

      <td className="border p-2">
        {expense.branches?.name}
      </td>

      <td className="border p-2">
        {expense.expense_categories?.name}
      </td>

      <td className="border p-2">
        {expense.budget_heads?.head_name}
      </td>

      <td className="border p-2">
        {expense.budget_sub_heads?.sub_head_name}
      </td>

      <td className="border p-2">
        ₹ {expense.net_payable}
      </td>

      <td className="border p-2">
        <button
          onClick={() => deleteExpense(expense.id)}
          className="text-red-600"
        >
          Delete
        </button>
      </td>
    </tr>
  ))}
</tbody>
      </table>
    </main>
  )
}
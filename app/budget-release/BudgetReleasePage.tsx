'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Taluk = {
  id: string
  name: string
}

type BudgetHead = {
  id: string
  head_code: string
  head_name: string
}

type BudgetSubHead = {
  id: string
  head_id: string
  sub_head_code: string
  sub_head_name: string
}

export default function BudgetReleasePage() {
  const supabase = createClient()

  const [taluks, setTaluks] = useState<Taluk[]>([])
  const [heads, setHeads] = useState<BudgetHead[]>([])
  const [subHeads, setSubHeads] = useState<BudgetSubHead[]>([])
  const [releases, setReleases] = useState<any[]>([])

  const [financialYear, setFinancialYear] =
    useState('2025-26')

  const [month, setMonth] = useState('')

  const [talukId, setTalukId] = useState('')
  const [headId, setHeadId] = useState('')
  const [subHeadId, setSubHeadId] = useState('')

  const [inst1, setInst1] = useState('')
  const [inst2, setInst2] = useState('')
  const [inst3, setInst3] = useState('')
  const [inst4, setInst4] = useState('')

  const [remarks, setRemarks] = useState('')

  async function loadTaluks() {
    const { data } = await supabase
      .from('taluks')
      .select('*')
      .order('name')

    setTaluks(data || [])
  }

  async function loadHeads() {
  const { data, error } = await supabase
    .from('budget_heads')
    .select('*')
    .order('head_code')

  if (error) {
    console.error(error)
    return
  }

  setHeads(data || [])
}

  async function loadSubHeads() {
  const { data, error } = await supabase
    .from('budget_sub_heads')
    .select('*')
    .order('sub_head_code')

  if (error) {
    console.error(error)
    return
  }

  setSubHeads(data || [])
}

async function loadReleases() {
  const { data, error } = await supabase
    .from('budget_releases')
    .select(`
      *,
      taluks!budget_releases_taluk_id_fkey(name),
      budget_heads!budget_releases_budget_head_id_fkey(head_name),
      budget_sub_heads!budget_releases_budget_sub_head_id_fkey(sub_head_name)
    `)
    .order('created_at', {
      ascending: false,
    })

  console.log(data)
  console.log(error)

  setReleases(data || [])
}

  async function saveRelease() {
    if (
      !month ||
      !talukId ||
      !headId ||
      !subHeadId
    ) {
      alert('Please fill all required fields')
      return
    }
    const totalAmount =
  Number(inst1 || 0) +
  Number(inst2 || 0) +
  Number(inst3 || 0) +
  Number(inst4 || 0)

    const { error } = await supabase
  .from('budget_releases')
  .insert({
    financial_year: financialYear,
    month,
    taluk_id: talukId,

    budget_head_id: headId,
    budget_sub_head_id: subHeadId,

    installment_1: Number(inst1 || 0),
    installment_2: Number(inst2 || 0),
    installment_3: Number(inst3 || 0),
    installment_4: Number(inst4 || 0),

    amount: totalAmount,

    remarks,
  })

    if (error) {
      alert(error.message)
      return
    }

    setMonth('')
    setTalukId('')
    setHeadId('')
    setSubHeadId('')

    setInst1('')
    setInst2('')
    setInst3('')
    setInst4('')

    setRemarks('')

    loadReleases()
  }

  async function deleteRelease(id: string) {
    if (!confirm('Delete release?')) return

    await supabase
      .from('budget_releases')
      .delete()
      .eq('id', id)

    loadReleases()
  }

  useEffect(() => {
    loadTaluks()
    loadHeads()
    loadSubHeads()
    loadReleases()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Budget Release
      </h1>

      <div className="grid grid-cols-2 gap-4 mb-8">

        <select
          className="border p-2 rounded"
          value={financialYear}
          onChange={(e) =>
            setFinancialYear(e.target.value)
          }
        >
          <option>2025-26</option>
          <option>2026-27</option>
        </select>

        <select
          className="border p-2 rounded"
          value={month}
          onChange={(e) =>
            setMonth(e.target.value)
          }
        >
          <option value="">
            Select Month
          </option>

          {[
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
            'January',
            'February',
            'March',
          ].map((m) => (
            <option key={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={talukId}
          onChange={(e) =>
            setTalukId(e.target.value)
          }
        >
          <option value="">
            Select Taluk
          </option>

          {taluks.map((taluk) => (
            <option
              key={taluk.id}
              value={taluk.id}
            >
              {taluk.name}
            </option>
          ))}
        </select>

        <select
  value={headId}
  onChange={(e) => setHeadId(e.target.value)}
  className="border p-3 rounded"
>
  <option value="">Select Head</option>

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
  value={subHeadId}
  onChange={(e) => setSubHeadId(e.target.value)}
  className="border p-3 rounded"
>
  <option value="">Select Sub Head</option>

  {subHeads.map((subHead: any) => (
    <option
      key={subHead.id}
      value={subHead.id}
    >
      {subHead.sub_head_code} - {subHead.sub_head_name}
    </option>
  ))}
</select>

        <input
          type="text"
          placeholder="Remarks"
          className="border p-2 rounded"
          value={remarks}
          onChange={(e) =>
            setRemarks(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="Installment 1"
          className="border p-2 rounded"
          value={inst1}
          onChange={(e) =>
            setInst1(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="Installment 2"
          className="border p-2 rounded"
          value={inst2}
          onChange={(e) =>
            setInst2(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="Installment 3"
          className="border p-2 rounded"
          value={inst3}
          onChange={(e) =>
            setInst3(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="Installment 4"
          className="border p-2 rounded"
          value={inst4}
          onChange={(e) =>
            setInst4(e.target.value)
          }
        />
      </div>

      <button
        onClick={saveRelease}
        className="bg-black text-white px-4 py-2 rounded mb-8"
      >
        Save Release
      </button>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">FY</th>
            <th className="border p-2">Month</th>
            <th className="border p-2">Taluk</th>
            <th className="border p-2">Head</th>
            <th className="border p-2">Sub Head</th>
            <th className="border p-2">Total</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {releases.map((release) => {
            const total =
              Number(release.installment_1 || 0) +
              Number(release.installment_2 || 0) +
              Number(release.installment_3 || 0) +
              Number(release.installment_4 || 0)

            return (
              <tr key={release.id}>
                <td className="border p-2">
                  {release.financial_year}
                </td>

                <td className="border p-2">
                  {release.month}
                </td>

                <td className="border p-2">
                  {release.taluks?.name}
                </td>

                <td className="border p-2">
                  {release.budget_heads?.head_name}
                </td>

                <td className="border p-2">
                  {release.budget_sub_heads?.sub_head_name}
                </td>

                <td className="border p-2">
                  {release.amount}
                </td>

                <td className="border p-2">
                  <button
                    onClick={() =>
                      deleteRelease(release.id)
                    }
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
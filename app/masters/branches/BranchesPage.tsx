'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Taluk = {
  id: string
  name: string
}

type Branch = {
  id: string
  name: string
  taluks: {
    name: string
  }[]
}

export default function BranchesPage() {
  const supabase = createClient()

  const [taluks, setTaluks] = useState<Taluk[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const [selectedTaluk, setSelectedTaluk] = useState('')
  const [branchName, setBranchName] = useState('')

  async function loadTaluks() {
    const { data } = await supabase
      .from('taluks')
      .select('*')
      .order('name')

    setTaluks(data || [])
  }

  async function loadBranches() {
    const { data } = await supabase
      .from('branches')
      .select(`
        id,
        name,
        taluks (
          name
        )
      `)
      .order('name')

    setBranches((data as Branch[]) || [])
  }

  async function addBranch() {
    if (!selectedTaluk || !branchName.trim()) {
      alert('Select taluk and enter branch name')
      return
    }

    const { error } = await supabase
      .from('branches')
      .insert({
        taluk_id: selectedTaluk,
        name: branchName.trim(),
      })

    if (error) {
      alert(error.message)
      return
    }

    setBranchName('')
    loadBranches()
  }

  async function deleteBranch(id: string) {
    if (!confirm('Delete branch?')) return

    await supabase
      .from('branches')
      .delete()
      .eq('id', id)

    loadBranches()
  }

  useEffect(() => {
    loadTaluks()
    loadBranches()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Branch Master
      </h1>

      <div className="flex gap-3 mb-6">
        <select
          className="border p-2 rounded"
          value={selectedTaluk}
          onChange={(e) => setSelectedTaluk(e.target.value)}
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

        <input
          className="border p-2 rounded"
          placeholder="Branch Name"
          value={branchName}
          onChange={(e) =>
            setBranchName(e.target.value)
          }
        />

        <button
          onClick={addBranch}
          className="bg-black text-white px-4 rounded"
        >
          Save
        </button>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">Taluk</th>
            <th className="border p-2">Branch</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id}>
              <td className="border p-2">
                {branch.taluks?.[0]?.name}
              </td>

              <td className="border p-2">
                {branch.name}
              </td>

              <td className="border p-2">
                <button
                  onClick={() =>
                    deleteBranch(branch.id)
                  }
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

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Taluk = {
  id: string
  name: string
}

export default function TaluksPage() {
  const supabase = createClient()

  const [name, setName] = useState('')
  const [taluks, setTaluks] = useState<Taluk[]>([])
  const [loading, setLoading] = useState(false)

  async function loadTaluks() {
    const { data } = await supabase
      .from('taluks')
      .select('*')
      .order('name')

    setTaluks(data || [])
  }

  async function addTaluk() {
    if (!name.trim()) return

    setLoading(true)

    const { error } = await supabase
      .from('taluks')
      .insert({
        name: name.trim(),
      })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    loadTaluks()
  }

  async function deleteTaluk(id: string) {
    const confirmed = confirm('Delete this taluk?')

    if (!confirmed) return

    await supabase
      .from('taluks')
      .delete()
      .eq('id', id)

    loadTaluks()
  }

  useEffect(() => {
    loadTaluks()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Taluk Master
      </h1>

      <div className="flex gap-3 mb-6">
        <input
          className="border p-2 rounded"
          placeholder="Taluk Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={addTaluk}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add Taluk
        </button>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">Taluk</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {taluks.map((taluk) => (
            <tr key={taluk.id}>
              <td className="border p-2">
                {taluk.name}
              </td>

              <td className="border p-2">
                <button
                  onClick={() =>
                    deleteTaluk(taluk.id)
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
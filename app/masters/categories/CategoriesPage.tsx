'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Category = {
  id: string
  name: string
}

export default function CategoriesPage() {
  const supabase = createClient()

  const [name, setName] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  async function loadCategories() {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  setCategories(data || [])
}

  async function addCategories() {
    if (!name.trim()) return

    setLoading(true)

    const { error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
      })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    loadCategories()
  }

  async function deleteCategory(id: string) {
    const confirmed = confirm('Delete this taluk?')

    if (!confirmed) return

    await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    loadCategories()
  }

  useEffect(() => {
    loadCategories()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Category Master
      </h1>

      <div className="flex gap-3 mb-6">
        <input
          className="border p-2 rounded"
          placeholder="Taluk Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={addCategories}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add Category
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
          {categories.map((category) => (
            <tr key={category.id}>
              <td className="border p-2">
                {category.name}
              </td>

              <td className="border p-2">
                <button
                  onClick={() =>
                    deleteCategory(category.id)
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
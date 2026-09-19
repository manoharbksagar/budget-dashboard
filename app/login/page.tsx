'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-center mb-6">
          Budget Dashboard
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">
              Email
            </label>

            <input
              type="email"
              className="w-full border rounded-md p-3"
              placeholder="admin@budgetdashboard.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Password
            </label>

            <input
              type="password"
              className="w-full border rounded-md p-3"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
}
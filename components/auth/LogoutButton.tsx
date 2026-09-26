'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const supabase = createClient()
  const [loading, setLoading] =
    useState(false)

  async function handleLogout() {
    setLoading(true)

    try {
      const {
        error,
      } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      window.location.replace(
        '/login'
      )
    } catch (error: any) {
      alert(
        error?.message ||
          'Unable to sign out.'
      )
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50"
    >
      {loading
        ? 'Signing out...'
        : 'Sign Out'}
    </button>
  )
}

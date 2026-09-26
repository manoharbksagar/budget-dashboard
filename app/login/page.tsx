'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    let mounted = true

    async function checkExistingSession() {
      const { data: claimsData } =
        await supabase.auth.getClaims()

      const claims = claimsData?.claims

      if (
        mounted &&
        claims
      ) {
        window.location.replace(
          '/dashboard'
        )
      }
    }

    checkExistingSession()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setErrorMessage('')

    if (!email.trim()) {
      setErrorMessage(
        'Enter your email address.'
      )
      return
    }

    if (!password) {
      setErrorMessage(
        'Enter your password.'
      )
      return
    }

    setLoading(true)

    try {
      const {
        error,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        throw error
      }

      /*
       * Full navigation lets Next.js Proxy receive
       * the newly established Supabase auth cookies.
       */
      window.location.replace(
        '/dashboard'
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Unable to sign in.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white border rounded-2xl shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800">
              Budget & Expense
            </h1>

            <p className="text-slate-500 mt-1">
              Sign in to continue
            </p>
          </div>

          {errorMessage && (
            <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 mb-5 text-sm">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>

              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="name@example.com"
                disabled={loading}
                className="border border-slate-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter password"
                  disabled={loading}
                  className="border border-slate-300 p-3 pr-20 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) =>
                        !value
                    )
                  }
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-blue-700 px-2 py-1"
                >
                  {showPassword
                    ? 'Hide'
                    : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Signing in...'
                : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-6">
            Access is managed through your Supabase
            authentication users.
          </p>
        </div>
      </div>
    </main>
  )
}

'use client'

import {
  FormEvent,
  useEffect,
  useState,
} from 'react'
import {
  KeyRound,
  Landmark,
  LockKeyhole,
  LogIn,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] =
    useState(false)
  const [loading, setLoading] =
    useState(false)
  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    let mounted = true

    async function checkExistingSession() {
      const { data: claimsData } =
        await supabase.auth.getClaims()

      const claims = claimsData?.claims

      if (mounted && claims) {
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
        'ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ.'
      )
      return
    }

    if (!password) {
      setErrorMessage(
        'ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.'
      )
      return
    }

    setLoading(true)

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (error) {
        throw error
      }

      window.location.replace(
        '/dashboard'
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'ಲಾಗಿನ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-[#1F4E79] text-white p-6 sm:p-7 text-center border-b-4 border-amber-500">
            <div className="inline-flex bg-white/10 p-3 rounded-full mb-3 border border-white/20">
              <Landmark className="w-8 h-8 text-amber-400" />
            </div>

            <h2 className="text-lg font-bold">
              ಕರ್ನಾಟಕ ಸರ್ಕಾರ
            </h2>

            <h1 className="text-sm sm:text-base font-bold text-amber-300 mt-1">
              ಉಪ ನಿರ್ದೇಶಕರ ಕಛೇರಿ,
              ಮಹಿಳಾ ಮತ್ತು ಮಕ್ಕಳ ಅಭಿವೃದ್ಧಿ ಇಲಾಖೆ
            </h1>

            <p className="text-xs text-slate-200 mt-1">
              ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ ಜಿಲ್ಲೆ
            </p>
          </div>

          <div className="p-6 sm:p-7">
            <div className="text-center mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <LockKeyhole className="w-3.5 h-3.5 text-amber-600" />
                ಸುರಕ್ಷಿತ ಪ್ರವೇಶ · Authorized Login
              </span>
            </div>

            {errorMessage && (
              <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 mb-5 text-xs font-semibold text-center">
                {errorMessage}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ಬಳಕೆದಾರ ಇಮೇಲ್ (Email)
                </label>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="name@example.com"
                    disabled={loading}
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-200 outline-none font-semibold disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ಪಾಸ್‌ವರ್ಡ್ (Password)
                </label>

                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Password ನಮೂದಿಸಿ"
                    disabled={loading}
                    className="w-full text-sm pl-9 pr-16 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-200 outline-none font-semibold disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#1F4E79] px-2 py-1"
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
                className="w-full py-2.5 bg-[#1F4E79] hover:bg-[#163858] text-white font-bold text-sm rounded-lg shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4 text-amber-300" />
                {loading
                  ? 'ಲಾಗಿನ್ ಆಗುತ್ತಿದೆ...'
                  : 'ಲಾಗಿನ್ ಮಾಡಿ (Login)'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <LockKeyhole className="w-3.5 h-3.5 text-emerald-600" />
                Access is managed through Supabase authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

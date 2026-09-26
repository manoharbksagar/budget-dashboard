'use client'

import Link from 'next/link'
import {
  CalendarDays,
  FileBarChart2,
  FileSpreadsheet,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Receipt,
  ShieldCheck,
  UserCircle,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Role = 'admin' | 'user'

type Profile = {
  role: Role
  full_name: string | null
  email: string | null
}

const adminLinks = [
  {
    href: '/dashboard',
    label: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    icon: LayoutDashboard,
  },
  {
    href: '/expenses',
    label: 'ವೆಚ್ಚ ನಮೂದು',
    icon: Receipt,
  },
  {
    href: '/expenses/import',
    label: 'ವೆಚ್ಚ ಆಮದು',
    icon: FileSpreadsheet,
  },
  {
    href: '/budget-release/import',
    label: 'ಅನುದಾನ ಆಮದು',
    icon: HandCoins,
  },
  {
    href: '/reports',
    label: 'ವರದಿಗಳು',
    icon: FileBarChart2,
  },
]

const userLinks = [
  {
    href: '/dashboard',
    label: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    icon: LayoutDashboard,
  },
  {
    href: '/expenses',
    label: 'ವೆಚ್ಚ ನಮೂದು',
    icon: Receipt,
  },
  {
    href: '/reports',
    label: 'ವರದಿಗಳು',
    icon: FileBarChart2,
  },
]

export default function AppNavigation() {
  const pathname = usePathname()
  const supabase = createClient()

  const [profile, setProfile] =
    useState<Profile | null>(null)
  const [loading, setLoading] =
    useState(true)
  const [signingOut, setSigningOut] =
    useState(false)

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      try {
        const { data: claimsData } =
          await supabase.auth.getClaims()

        const claims = claimsData?.claims

        if (!mounted || !claims) {
          setProfile(null)
          return
        }

        const userId = claims.sub

        if (!userId) {
          setProfile(null)
          return
        }

        const {
          data,
          error,
        } = await supabase
          .from('profiles')
          .select('role,full_name,email')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          console.error(
            'Unable to load profile:',
            error
          )
          setProfile(null)
          return
        }

        setProfile(
          data as Profile | null
        )
      } catch (error) {
        console.error(
          'Authentication/navigation error:',
          error
        )
        setProfile(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      () => {
        loadProfile()
      }
    )

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (pathname === '/login') {
    return null
  }

  if (loading && !profile) {
    return null
  }

  if (!profile) {
    return null
  }

  const links =
    profile.role === 'admin'
      ? adminLinks
      : userLinks

  const displayName =
    profile.full_name?.trim() ||
    profile.email ||
    'User'

  const today = new Intl.DateTimeFormat(
    'kn-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(new Date())

  async function handleSignOut() {
    setSigningOut(true)

    try {
      const {
        error,
      } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      window.location.replace('/login')
    } catch (error: any) {
      console.error(
        'Sign out error:',
        error
      )

      alert(
        error?.message ||
          'Unable to sign out.'
      )

      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[#1F4E79] text-white border-b-4 border-amber-500 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 bg-white/10 p-2.5 rounded-xl border border-white/20 shadow-inner">
              <Landmark
                className="w-7 h-7 text-amber-400"
                strokeWidth={2}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold leading-snug flex flex-wrap items-center gap-2">
                ಉಪ ನಿರ್ದೇಶಕರ ಕಛೇರಿ,
                ಮಹಿಳಾ ಮತ್ತು ಮಕ್ಕಳ ಅಭಿವೃದ್ಧಿ ಇಲಾಖೆ
                <span className="text-[11px] font-semibold bg-amber-500 text-slate-900 px-2 py-0.5 rounded-md whitespace-nowrap">
                  ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ ಜಿಲ್ಲೆ
                </span>
              </h1>

              <p className="text-[11px] sm:text-xs text-slate-200 font-medium mt-0.5">
                ಅನುದಾನ ಬಿಡುಗಡೆ ಹಾಗೂ ವೆಚ್ಚ ನಿರ್ವಹಣಾ ತಂತ್ರಾಂಶ
                <span className="hidden sm:inline">
                  {' '}· Budget & Expense Management System
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row xl:items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-[#163858] px-3 py-1.5 rounded-lg border border-[#1d4ed8] flex items-center gap-2 text-amber-300 text-xs font-medium whitespace-nowrap">
                <CalendarDays className="w-3.5 h-3.5" />
                {today}
              </span>

              <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/20 text-xs font-semibold">
                {profile.role === 'admin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <UserCircle className="w-3.5 h-3.5 text-slate-200" />
                )}
                {profile.role === 'admin' ? 'ADMIN' : 'USER'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <nav className="flex items-center gap-1">
                {links.map((link) => {
                  const active =
                    pathname === link.href ||
                    pathname.startsWith(
                      `${link.href}/`
                    )

                  const Icon = link.icon

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition border ${
                        active
                          ? 'bg-white text-[#1F4E79] border-white shadow-sm'
                          : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {link.label}
                    </Link>
                  )
                })}
              </nav>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-3.5 h-3.5" />
                {signingOut
                  ? 'ನಿರ್ಗಮಿಸುತ್ತಿದೆ...'
                  : 'ನಿರ್ಗಮನ'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 hidden lg:flex items-center justify-between gap-4">
          <p className="text-[11px] text-slate-300">
            {displayName}
            {profile.email && profile.full_name
              ? ` · ${profile.email}`
              : ''}
          </p>

          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300/80">
            Authorized Access
          </p>
        </div>
      </div>
    </header>
  )
}

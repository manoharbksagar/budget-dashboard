'use client'

import Link from 'next/link'
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
    label: 'Dashboard',
  },
  {
    href: '/expenses',
    label: 'Expense Entry',
  },
  {
    href: '/expenses/import',
    label: 'Expense Import',
  },
  {
    href: '/budget-release/import',
    label: 'Budget Import',
  },
  {
    href: '/reports',
    label: 'Reports',
  },
]

const userLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
  },
  {
    href: '/expenses',
    label: 'Expense Entry',
  },
  {
    href: '/reports',
    label: 'Reports',
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
        const {
          data: { claims },
        } = await supabase.auth.getClaims()

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
          .select(
            'role,full_name,email'
          )
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

  /*
   * Do not show application navigation on login.
   */
  if (pathname === '/login') {
    return null
  }

  /*
   * Don't render an empty authenticated navigation
   * while the session/profile is being resolved.
   */
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

  async function handleSignOut() {
    setSigningOut(true)

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
    <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
      <div className="max-w-[1500px] mx-auto px-4 md:px-6">
        <div className="min-h-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="font-bold text-lg text-slate-800 whitespace-nowrap"
            >
              Budget & Expense
            </Link>

            <span
              className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                profile.role === 'admin'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {profile.role.toUpperCase()}
            </span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(
                  `${link.href}/`
                )

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-blue-800 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-slate-800">
                {displayName}
              </p>

              {profile.email &&
                profile.full_name && (
                  <p className="text-xs text-slate-500">
                    {profile.email}
                  </p>
                )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="border border-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {signingOut
                ? 'Signing out...'
                : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

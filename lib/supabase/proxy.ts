import {
  createServerClient,
} from '@supabase/ssr'
import {
  NextResponse,
  type NextRequest,
} from 'next/server'

function getSupabaseKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error(
      'Missing Supabase public key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  return key
}

const ADMIN_ONLY_PATHS = [
  '/expenses/import',
  '/budget-release/import',
]

function isAdminOnlyPath(pathname: string) {
  return ADMIN_ONLY_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  )
}

function redirectToDashboard(
  request: NextRequest
) {
  const url = request.nextUrl.clone()

  url.pathname = '/dashboard'
  url.search = ''

  return NextResponse.redirect(url)
}

function redirectToLogin(
  request: NextRequest
) {
  const url = request.nextUrl.clone()

  url.pathname = '/login'
  url.search = ''

  return NextResponse.redirect(url)
}

export async function updateSession(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  })

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getSupabaseKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                )
              }
            )

            response =
              NextResponse.next({
                request,
              })

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                )
              }
            )
          },
        },
      }
    )

  /*
   * getUser() is intentionally used here for the
   * server-side route guard. It validates the current
   * authenticated user and refreshes the session when
   * necessary.
   */
  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser()

  const pathname =
    request.nextUrl.pathname

  const isPublicRoute =
    pathname === '/login' ||
    pathname.startsWith('/auth/')

  /*
   * Not authenticated -> login.
   */
  if (
    !user &&
    !isPublicRoute
  ) {
    return redirectToLogin(request)
  }

  /*
   * Already authenticated -> don't show login.
   */
  if (
    user &&
    pathname === '/login'
  ) {
    return redirectToDashboard(
      request
    )
  }

  /*
   * Only admin users can reach import routes.
   */
  if (
    user &&
    isAdminOnlyPath(pathname)
  ) {
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    /*
     * Fail closed:
     * if the role cannot be verified, do not allow
     * access to an admin-only route.
     */
    if (
      userError ||
      profileError ||
      profile?.role !== 'admin'
    ) {
      console.error(
        'Admin route blocked:',
        {
          userError,
          profileError,
          userId: user.id,
          role: profile?.role,
          pathname,
        }
      )

      return redirectToDashboard(
        request
      )
    }
  }

  return response
}

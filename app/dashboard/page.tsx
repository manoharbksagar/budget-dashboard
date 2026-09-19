import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">
          Budget Dashboard
        </h1>

        <p className="mt-2">
          Welcome {user.email}
        </p>

        <div className="grid grid-cols-5 gap-4 mt-8">
          <div className="border p-4 rounded">
            Total Budget
          </div>

          <div className="border p-4 rounded">
            Expenses
          </div>

          <div className="border p-4 rounded">
            GST
          </div>

          <div className="border p-4 rounded">
            TDS
          </div>

          <div className="border p-4 rounded">
            Remaining
          </div>
        </div>
      </main>
    </div>
  )
}
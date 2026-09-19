export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen border-r p-4">
      <h2 className="text-xl font-bold mb-6">
        Budget Dashboard
      </h2>

      <nav className="space-y-2">
        <div className="font-semibold">Masters</div>

        <a href="/masters/taluks">Taluks</a><br />
        <a href="/masters/branches">Branches</a><br />
        <a href="/masters/heads">Budget Heads</a><br />
        <a href="/masters/sub-heads">Sub Heads</a><br />
        <a href="/masters/categories">Categories</a>

        <div className="font-semibold mt-6">
          Transactions
        </div>

        <a href="/budget-release">Budget Release</a><br />
        <a href="/expenses">Expenses</a>
      </nav>
    </aside>
  )
}

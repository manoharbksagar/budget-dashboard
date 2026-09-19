import AppShell from '@/components/layout/AppShell'

export default function MastersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
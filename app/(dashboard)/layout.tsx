import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { DailyGreetingToast } from '@/components/ai/DailyGreetingToast'
import { ProfessionalTypeProvider } from '@/components/providers/ProfessionalTypeProvider'
import { RoleGuard } from '@/components/dashboard/RoleGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProfessionalTypeProvider>
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-white p-6">
            <RoleGuard>
              {children}
            </RoleGuard>
          </main>
        </div>
        <DailyGreetingToast />
      </div>
    </ProfessionalTypeProvider>
  )
}

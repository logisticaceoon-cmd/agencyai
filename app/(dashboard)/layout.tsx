'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { DailyGreetingToast } from '@/components/ai/DailyGreetingToast'
import { ProfessionalTypeProvider } from '@/components/providers/ProfessionalTypeProvider'
import { RoleGuard } from '@/components/dashboard/RoleGuard'
import { AccountGuard } from '@/components/dashboard/AccountGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProfessionalTypeProvider>
      <AccountGuard>
        <div className="flex h-screen overflow-hidden bg-white">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile header with hamburger */}
            <div className="lg:hidden flex items-center gap-3 p-4 border-b">
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Abrir menú">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <span className="font-semibold text-lg">AgencyAI</span>
            </div>
            <Header />
            <main className="flex-1 overflow-y-auto bg-white p-6">
              <RoleGuard>
                {children}
              </RoleGuard>
            </main>
          </div>
          <DailyGreetingToast />
        </div>
      </AccountGuard>
    </ProfessionalTypeProvider>
  )
}

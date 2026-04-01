'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function DailyGreetingToast() {
  const [visible, setVisible] = useState(false)
  const [agentName, setAgentName] = useState('Asistente AgencyAI')
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Don't show on dashboard itself
    if (pathname === '/dashboard') return

    const today = new Date().toDateString()
    const lastGreeting = localStorage.getItem('last_greeting_date')

    if (lastGreeting === today) return

    // Load agent name
    fetch('/api/ai/config')
      .then(r => r.json())
      .then(d => {
        if (d.data?.agent_name) setAgentName(d.data.agent_name)
      })
      .catch(() => {})

    // Show toast after 2 seconds
    const timer = setTimeout(() => {
      setVisible(true)
      localStorage.setItem('last_greeting_date', today)
    }, 2000)

    return () => clearTimeout(timer)
  }, [pathname])

  if (!visible) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-slide-in">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white shadow-lg p-4 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">👋</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {agentName} te saludo en el Dashboard
          </p>
          <button
            onClick={() => { setVisible(false); router.push('/dashboard') }}
            className="mt-1.5 text-xs font-medium text-[var(--blue)] hover:text-[#1d4ed8] transition-colors"
          >
            Ver saludo
          </button>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex-shrink-0"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

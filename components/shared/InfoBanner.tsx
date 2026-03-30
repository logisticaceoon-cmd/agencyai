'use client'

import { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'

interface InfoBannerProps {
  id: string
  title: string
  description: string
}

export function InfoBanner({ id, title, description }: InfoBannerProps) {
  const [visible, setVisible] = useState(false)
  const storageKey = `infobanner_dismissed_${id}`

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey)
    setVisible(!dismissed)
  }, [storageKey])

  function dismiss() {
    localStorage.setItem(storageKey, 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3 mb-6">
      <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">{title}</p>
        <p className="text-xs text-blue-700 mt-0.5">{description}</p>
      </div>
      <button onClick={dismiss} className="text-blue-400 hover:text-blue-600 flex-shrink-0 p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

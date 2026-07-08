'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import es from '@/messages/es.json'
import en from '@/messages/en.json'

export type Locale = 'es' | 'en'

const messages: Record<Locale, Record<string, unknown>> = { es, en }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'es',
  setLocale: () => {},
  t: (key: string) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es')

  useEffect(() => {
    const saved = localStorage.getItem('agencyai_locale') as Locale
    if (saved && messages[saved]) setLocaleState(saved)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('agencyai_locale', newLocale)
    fetch('/api/workspace/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {})
  }, [])

  const t = useCallback((key: string): string => {
    const parts = key.split('.')
    let current: unknown = messages[locale]
    for (const part of parts) {
      if (current && typeof current === 'object' && current !== null && part in current) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return key
      }
    }
    return typeof current === 'string' ? current : key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}

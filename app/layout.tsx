import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AgencyAI — Gestión Operacional',
  description: 'Sistema integral de gestión para agencias de marketing digital',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-white text-slate-900 antialiased`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

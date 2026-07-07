import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AgencyAI — Plataforma de gestión para agencias de marketing',
  description: 'Gestiona clientes, proyectos, tareas, KPIs, finanzas y reportes de tu agencia de marketing digital con IA integrada.',
  openGraph: {
    title: 'AgencyAI — Gestión inteligente para agencias',
    description: 'Plataforma SaaS para agencias de marketing digital. Clientes, proyectos, KPIs, finanzas y reportes con IA.',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgencyAI — Gestión inteligente para agencias',
    description: 'Plataforma SaaS para agencias de marketing digital.',
  },
  robots: {
    index: true,
    follow: true,
  },
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

'use client'

import { Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ProGateProps {
  children: React.ReactNode
  locked: boolean
  feature?: string       // nombre de la función bloqueada
  className?: string
  inline?: boolean       // true = badge inline (para tabs), false = overlay completo
}

/**
 * ProGate — wrapper que bloquea un feature y muestra upgrade prompt.
 *
 * Modo overlay (default): cubre el contenido con un overlay y muestra el CTA.
 * Modo inline: muestra el badge "PRO" junto al label sin cubrir nada.
 */
export function ProGate({ children, locked, feature, className, inline = false }: ProGateProps) {
  if (!locked) return <>{children}</>

  if (inline) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {children}
        <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 text-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide flex-shrink-0">
          <Lock size={8} />
          Pro
        </span>
      </span>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Contenido difuminado */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm z-10 p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6 text-indigo-500" />
        </div>
        <p className="text-sm font-bold text-slate-900 mb-1">
          {feature ? `${feature} — Plan Pro` : 'Función Pro'}
        </p>
        <p className="text-xs text-slate-500 mb-4 max-w-xs">
          Esta función está disponible en el plan Pro por $30/mes.
          Accedé a todo AgencyAI sin límites.
        </p>
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Activar Pro — $30/mes
        </Link>
      </div>
    </div>
  )
}

/**
 * ProBadge — badge standalone para mostrar en cualquier lugar.
 */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full bg-indigo-100 text-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
      className
    )}>
      <Lock size={8} />
      Pro
    </span>
  )
}

/**
 * UpgradeBanner — banner horizontal para mostrar al tope de una sección bloqueada.
 */
export function UpgradeBanner({ feature, className }: { feature?: string; className?: string }) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-900">
            {feature ? `${feature} requiere Plan Pro` : 'Función del Plan Pro'}
          </p>
          <p className="text-xs text-indigo-600">
            Activá el plan Pro por $30/mes y desbloqueá todas las funciones.
          </p>
        </div>
      </div>
      <Link
        href="/settings/billing"
        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        Activar Pro
      </Link>
    </div>
  )
}

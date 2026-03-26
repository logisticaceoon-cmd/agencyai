'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Avatar } from '@/components/shared/Avatar'
import { createClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Search,
  Users,
  BookOpen,
  Settings,
  Zap,
  LogOut,
  DollarSign,
  BarChart2,
  Target,
  MessageSquare,
  Video,
  Calendar,
  FolderKanban,
  Building2,
  Lock,
} from 'lucide-react'
import type { OrgPlan } from '@prisma/client'

// Plan hierarchy
const PLAN_RANK: Record<OrgPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  agency: 3,
  scale: 4,
}

const PLAN_LABEL: Record<OrgPlan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
  scale: 'Scale',
}

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  minPlan?: OrgPlan
}

const navGroups: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/clients', label: 'Clientes', icon: Users },
      { href: '/projects', label: 'Proyectos', icon: FolderKanban, minPlan: 'starter' },
      { href: '/tasks', label: 'Tareas', icon: CheckSquare },
      { href: '/meetings', label: 'Minutas', icon: MessageSquare, minPlan: 'starter' },
      { href: '/calendar', label: 'Calendario', icon: Calendar, minPlan: 'starter' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { href: '/reports', label: 'Reportes', icon: FileText },
      { href: '/kpis', label: 'KPIs y Métricas', icon: BarChart2, minPlan: 'pro' },
      { href: '/objectives', label: 'Objetivos', icon: Target, minPlan: 'pro' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/audits', label: 'Auditorías', icon: Search, minPlan: 'pro' },
      { href: '/docs', label: 'Documentos', icon: BookOpen, minPlan: 'starter' },
      { href: '/finances', label: 'Finanzas', icon: DollarSign, minPlan: 'pro' },
      { href: '/recordings', label: 'Grabaciones', icon: Video, minPlan: 'agency' },
      { href: '/alerts', label: 'IA & Alertas', icon: Zap, minPlan: 'agency' },
    ],
  },
]

const adminItems: NavItem[] = [
  { href: '/settings', label: 'Workspace', icon: Building2 },
  { href: '/admin', label: 'Equipo', icon: Settings },
]

function isUnlocked(itemMinPlan: OrgPlan | undefined, orgPlan: OrgPlan): boolean {
  if (!itemMinPlan) return true
  return PLAN_RANK[orgPlan] >= PLAN_RANK[itemMinPlan]
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, org } = useCurrentUser()

  const orgPlan: OrgPlan = org?.plan ?? 'free'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast({ title: 'Sesión cerrada' })
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const isAdmin = user && (user.role === 'CEO' || user.role === 'Manager')

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-800 bg-[#111111] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800">
        <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-white">AgencyAI</span>
        {org && (
          <span className={cn(
            'ml-auto text-[10px] font-semibold rounded-full px-1.5 py-0.5 flex-shrink-0',
            orgPlan === 'free' ? 'bg-zinc-800 text-zinc-500' :
            orgPlan === 'starter' ? 'bg-blue-500/10 text-blue-400' :
            orgPlan === 'pro' ? 'bg-indigo-500/10 text-indigo-400' :
            orgPlan === 'agency' ? 'bg-purple-500/10 text-purple-400' :
            'bg-amber-500/10 text-amber-400'
          )}>
            {PLAN_LABEL[orgPlan]}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navGroups.map((group) => (
          <div key={group.label ?? 'main'} className="mb-1">
            {group.label && (
              <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const unlocked = isUnlocked(item.minPlan, orgPlan)
              const active = isActive(item.href)

              if (!unlocked) {
                return (
                  <Link
                    key={item.href}
                    href="/settings"
                    title={`Requiere plan ${PLAN_LABEL[item.minPlan!]} — Actualizar plan`}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-500 transition-colors group"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0 opacity-40" />
                    <span className="flex-1 opacity-40">{item.label}</span>
                    <Lock className="h-3 w-3 flex-shrink-0 opacity-50" />
                  </Link>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-indigo-600/10 text-indigo-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}

        {isAdmin && (
          <div>
            <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
              Admin
            </p>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-indigo-600/10 text-indigo-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-800 p-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <Avatar name={user.fullName} avatarUrl={user.avatarUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.fullName}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 bg-zinc-800 rounded animate-pulse" />
              <div className="h-2 bg-zinc-800 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

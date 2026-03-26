'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Avatar } from '@/components/shared/Avatar'
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
  User,
  CreditCard,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

type OrgPlan = 'free' | 'starter' | 'pro' | 'agency' | 'scale'

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
      { href: '/projects', label: 'Proyectos', icon: FolderKanban },
      { href: '/tasks', label: 'Tareas', icon: CheckSquare },
      { href: '/minutes', label: 'Minutas', icon: MessageSquare },
      { href: '/calendar', label: 'Calendario', icon: Calendar },
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

  const orgPlan: OrgPlan = (org?.plan as OrgPlan) ?? 'free'

  async function handleLogout() {
    try {
      // Try Clerk signOut if available
      const { useClerk } = await import('@clerk/nextjs')
      void useClerk
    } catch {
      // Fallback
    }
    window.location.href = '/sign-in'
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const isAdmin = user && (user.role === 'CEO' || user.role === 'Manager')
  const displayName = user?.fullName || 'Usuario'
  const displayEmail = user?.email || ''

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-[#f8fafc] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200 bg-white">
        <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-slate-900">AgencyAI</span>
        {org && (
          <span className={cn(
            'ml-auto text-[10px] font-semibold rounded-full px-1.5 py-0.5 flex-shrink-0',
            orgPlan === 'free' ? 'bg-slate-100 text-slate-500' :
            orgPlan === 'starter' ? 'bg-blue-50 text-blue-600' :
            orgPlan === 'pro' ? 'bg-indigo-50 text-indigo-600' :
            orgPlan === 'agency' ? 'bg-purple-50 text-purple-600' :
            'bg-amber-50 text-amber-600'
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
              <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-slate-400 transition-colors group"
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
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative',
                    active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-blue-600 rounded-r" />
                  )}
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}

        {isAdmin && (
          <div>
            <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Admin
            </p>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative',
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                )}
              >
                {isActive(item.href) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-blue-600 rounded-r" />
                )}
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User profile section */}
      <div className="border-t border-slate-200 p-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <Avatar name={displayName} avatarUrl={user.avatarUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">{displayEmail}</p>
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 p-1 rounded hover:bg-slate-100">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  side="top"
                  sideOffset={8}
                  className="z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg animate-scale-in"
                >
                  <DropdownMenu.Item asChild>
                    <Link href="/settings/account" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer outline-none">
                      <User className="h-4 w-4" /> Mi cuenta
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link href="/settings/workspace" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer outline-none">
                      <Building2 className="h-4 w-4" /> Workspace
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link href="/settings/billing" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer outline-none">
                      <CreditCard className="h-4 w-4" /> Plan y facturación
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <a href="mailto:soporte@agencyai.com" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer outline-none">
                      <HelpCircle className="h-4 w-4" /> Ayuda
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 bg-slate-200 rounded animate-pulse" />
              <div className="h-2 bg-slate-200 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

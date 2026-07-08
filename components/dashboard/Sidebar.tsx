'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProfessionalType } from '@/hooks/useProfessionalType'
import { Avatar } from '@/components/shared/Avatar'
import { toast } from '@/hooks/use-toast'
import { normalizeRole, canAccessSection, ROLE_LABELS, type AppRole } from '@/lib/roles'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useTranslation } from '@/lib/i18n'
import {
  LayoutDashboard,
  CheckSquare,
  CheckCircle,
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
  Clock,
  Building2,
  User,
  CreditCard,
  HelpCircle,
  ChevronDown,
  TrendingUp,
  Lock,
  Shield,
  X,
  Megaphone,
  Receipt,
  MessageCircle,
  ImageIcon,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

type OrgPlan = 'free' | 'starter' | 'pro' | 'agency' | 'scale'

const PLAN_RANK: Record<OrgPlan, number> = {
  free: 0, starter: 1, pro: 2, agency: 3, scale: 4,
}

const PLAN_LABEL: Record<OrgPlan, string> = {
  free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency', scale: 'Scale',
}

const PLAN_STYLE: Record<OrgPlan, string> = {
  free: 'bg-slate-100 text-slate-500',
  starter: 'bg-blue-50 text-blue-600',
  pro: 'bg-indigo-50 text-indigo-600',
  agency: 'bg-purple-50 text-purple-600',
  scale: 'bg-amber-50 text-amber-600',
}

const ROLE_BADGE_STYLE: Record<AppRole, string> = {
  owner:      'bg-amber-50 text-amber-700',
  admin:      'bg-purple-50 text-purple-700',
  trafficker: 'bg-blue-50 text-blue-700',
  viewer:     'bg-slate-100 text-slate-500',
}

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  minPlan?: OrgPlan
  proRequired?: boolean   // nuevo: se bloquea en free, visible con badge PRO
  tourId?: string         // data-tour attribute para el tour guiado
}

const adminItems: NavItem[] = [
  { href: '/settings', label: 'Workspace', icon: Building2, tourId: 'settings' },
  { href: '/settings/team', label: 'Equipo', icon: Users },
  { href: '/settings/roles', label: 'Roles', icon: Shield },
  { href: '/settings/ai', label: 'Agente de IA', icon: Zap },
  { href: '/settings/billing', label: 'Facturacion', icon: CreditCard },
]

function isUnlocked(itemMinPlan: OrgPlan | undefined, orgPlan: OrgPlan): boolean {
  if (!itemMinPlan) return true
  return PLAN_RANK[orgPlan] >= PLAN_RANK[itemMinPlan]
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, org } = useCurrentUser()
  const { config } = useProfessionalType()

  const orgPlan: OrgPlan = (org?.plan as OrgPlan) ?? 'free'
  const role: AppRole = normalizeRole(user?.role)
  const isOwner = role === 'owner'
  const canAdmin = role === 'owner' || role === 'admin'
  const { isPro } = usePlanLimits()
  const { t } = useTranslation()

  const navGroups: { label: string | null; items: NavItem[] }[] = [
    {
      label: null,
      items: [
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, tourId: 'dashboard-nav' },
      ],
    },
    {
      label: t('nav.operations'),
      items: [
        { href: '/clients',          label: t('nav.clients'),        icon: Users, tourId: 'clients' },
        { href: '/projects',         label: t('nav.projects'),       icon: FolderKanban, tourId: 'projects' },
        { href: '/tasks',            label: t('nav.tasks'),          icon: CheckSquare, tourId: 'tasks' },
        { href: '/minutes',          label: t('nav.minutes'),        icon: MessageSquare, proRequired: !isPro },
        { href: '/calendar',         label: t('nav.calendar'),       icon: Calendar },
        { href: '/time',             label: t('nav.time'),           icon: Clock, tourId: 'time' },
        { href: '/approvals',        label: t('nav.approvals'),      icon: CheckCircle },
        { href: '/communications',   label: t('nav.communications'), icon: MessageCircle },
        { href: '/assets',           label: t('nav.assets'),         icon: ImageIcon },
      ],
    },
    {
      label: t('nav.reporting'),
      items: [
        { href: '/reports',    label: t('nav.reports'),     icon: FileText, tourId: 'reports' },
        { href: '/kpis',       label: t('nav.kpis'),        icon: BarChart2,  proRequired: !isPro },
        { href: '/objectives', label: t('nav.objectives'),  icon: Target,     proRequired: !isPro },
      ],
    },
    {
      label: t('nav.management'),
      items: [
        { href: '/audits',         label: t('nav.audits'),        icon: Search,    proRequired: !isPro },
        { href: '/performance',    label: t('nav.performance'),   icon: TrendingUp, proRequired: !isPro },
        { href: '/docs',           label: t('nav.docs'),          icon: BookOpen,  proRequired: !isPro },
        { href: '/finances',       label: t('nav.finances'),      icon: DollarSign },
        { href: '/profitability',  label: t('nav.profitability'), icon: TrendingUp },
        { href: '/invoices',       label: t('nav.invoices'),      icon: Receipt, tourId: 'invoices' },
        { href: '/ad-spend',       label: t('nav.adSpend'),       icon: Megaphone },
        { href: '/recordings',     label: t('nav.recordings'),    icon: Video,     proRequired: !isPro },
        { href: '/alerts',         label: t('nav.alerts'),        icon: Zap,       proRequired: !isPro },
      ],
    },
  ]

  async function handleLogout() {
    const supabase = (await import('@/lib/supabase')).createClient()
    await supabase.auth.signOut()
    toast({ title: 'Sesion cerrada' })
    router.push('/sign-in')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const displayName = user?.fullName || 'Usuario'
  const displayEmail = user?.email || ''

  return (
    <aside className="flex h-full w-64 flex-col bg-[var(--bg-subtle)] border-r border-[var(--border-base)] flex-shrink-0 relative">
      {/* Mobile close button */}
      <button onClick={onClose} className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg z-10" aria-label="Cerrar menú">
        <X className="w-5 h-5" />
      </button>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[var(--border-base)]">
        <div className="h-[36px] w-[36px] rounded-[var(--radius-md)] bg-[var(--blue)] flex items-center justify-center flex-shrink-0">
          <Zap className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
        <span className="text-[15px] font-bold text-[var(--text-primary)]">AgencyAI</span>
        {org && (
          <span className={cn(
            'ml-auto text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0',
            PLAN_STYLE[orgPlan]
          )}>
            {PLAN_LABEL[orgPlan]}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navGroups.map((group) => {
          // Filtrar items accesibles para este rol
          const visibleItems = group.items.filter((item) =>
            canAccessSection(role, item.href)
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label ?? 'main'} className="mb-1">
              {group.label && (
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase" style={{ letterSpacing: '0.08em' }}>
                  {group.label}
                </p>
              )}
              {visibleItems.map((item) => {
                const unlocked = isUnlocked(item.minPlan, orgPlan)
                const active = isActive(item.href)
                // Item bloqueado por plan Pro
                const isProLocked = item.proRequired === true

                if (isProLocked) {
                  return (
                    <Link
                      key={item.href}
                      href="/settings/billing"
                      title="Función Pro — Activar por $30/mes"
                      data-tour={item.tourId}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-secondary)] transition-all group"
                    >
                      <item.icon size={16} strokeWidth={1.5} className="flex-shrink-0 opacity-50" />
                      <span className="flex-1 opacity-50">{item.label}</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 text-indigo-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide flex-shrink-0">
                        <Lock size={7} />
                        Pro
                      </span>
                    </Link>
                  )
                }

                if (!unlocked) {
                  return (
                    <Link
                      key={item.href}
                      href="/settings/billing"
                      title={`Requiere plan ${PLAN_LABEL[item.minPlan!]} — Actualizar plan`}
                      data-tour={item.tourId}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] opacity-50 hover:opacity-70 transition-all"
                    >
                      <item.icon size={16} strokeWidth={1.5} className="flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <Lock size={12} strokeWidth={1.5} className="flex-shrink-0" />
                    </Link>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={item.tourId}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 relative',
                      active
                        ? 'bg-[var(--blue-light)] text-[var(--blue)] font-semibold'
                        : 'text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-[var(--blue)] rounded-r" />
                    )}
                    <item.icon size={16} strokeWidth={1.5} className="flex-shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}

        {/* Sección Admin — solo owner */}
        {isOwner && (
          <div>
            <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase" style={{ letterSpacing: '0.08em' }}>
              Admin
            </p>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tourId}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 relative',
                  isActive(item.href)
                    ? 'bg-[var(--blue-light)] text-[var(--blue)] font-semibold'
                    : 'text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                {isActive(item.href) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-[var(--blue)] rounded-r" />
                )}
                <item.icon size={16} strokeWidth={1.5} className="flex-shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* Configuración rápida para admins (sin billing) */}
        {canAdmin && !isOwner && (
          <div>
            <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase" style={{ letterSpacing: '0.08em' }}>
              Admin
            </p>
            <Link
              href="/settings/team"
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 relative',
                isActive('/settings/team')
                  ? 'bg-[var(--blue-light)] text-[var(--blue)] font-semibold'
                  : 'text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {isActive('/settings/team') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-[var(--blue)] rounded-r" />
              )}
              <Users size={16} strokeWidth={1.5} className="flex-shrink-0" />
              Equipo
            </Link>
          </div>
        )}
      </nav>

      {/* User profile */}
      <div className="border-t border-[var(--border-base)] p-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <Avatar name={displayName} avatarUrl={user.avatarUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{displayName}</p>
                <span className={cn(
                  'text-[9px] font-semibold rounded-full px-1.5 py-0.5 flex-shrink-0',
                  ROLE_BADGE_STYLE[role]
                )}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{displayEmail}</p>
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex-shrink-0 p-1 rounded hover:bg-[var(--bg-muted)]">
                  <ChevronDown size={16} strokeWidth={1.5} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  side="top"
                  sideOffset={8}
                  className="z-50 min-w-[200px] rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-1.5 shadow-lg animate-scale-in"
                >
                  <DropdownMenu.Item asChild>
                    <Link href="/settings/account" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer outline-none">
                      <User size={16} strokeWidth={1.5} /> Mi cuenta
                    </Link>
                  </DropdownMenu.Item>
                  {isOwner && (
                    <>
                      <DropdownMenu.Item asChild>
                        <Link href="/settings/workspace" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer outline-none">
                          <Building2 size={16} strokeWidth={1.5} /> Workspace
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link href="/settings/billing" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer outline-none">
                          <CreditCard size={16} strokeWidth={1.5} /> Plan y facturacion
                        </Link>
                      </DropdownMenu.Item>
                    </>
                  )}
                  <DropdownMenu.Item asChild>
                    <a href="mailto:soporte@agencyai.com" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer outline-none">
                      <HelpCircle size={16} strokeWidth={1.5} /> Ayuda
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--bg-muted)]" />
                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--red)] hover:bg-[var(--red-light)] cursor-pointer outline-none"
                  >
                    <LogOut size={16} strokeWidth={1.5} /> Cerrar sesion
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

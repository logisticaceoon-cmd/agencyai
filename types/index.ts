import {
  User,
  Task,
  Report,
  Audit,
  Documentation,
  Client,
  Notification,
  Comment,
  ActivityLog,
  Organization,
  OrganizationMember,
  Invitation,
  Project,
  Finance,
  KPI,
  Objective,
  UserRole,
  UserStatus,
  TaskStatus,
  Priority,
  ReportType,
  ValidationStatus,
  AuditStatus,
  AuditResult,
  DocCategory,
  DocStatus,
  ClientStatus,
  NotificationType,
  OrgPlan,
  OrgMemberRole,
  OrgMemberStatus,
  ProjectStatus,
  ServiceType,
  ObjectiveType,
  ObjectiveStatus,
} from '@prisma/client'

export type {
  User,
  Task,
  Report,
  Audit,
  Documentation,
  Client,
  Notification,
  Comment,
  ActivityLog,
  Organization,
  OrganizationMember,
  Invitation,
  Project,
  Finance,
  KPI,
  Objective,
  UserRole,
  UserStatus,
  TaskStatus,
  Priority,
  ReportType,
  ValidationStatus,
  AuditStatus,
  AuditResult,
  DocCategory,
  DocStatus,
  ClientStatus,
  NotificationType,
  OrgPlan,
  OrgMemberRole,
  OrgMemberStatus,
  ProjectStatus,
  ServiceType,
  ObjectiveType,
  ObjectiveStatus,
}

// ─── WITH RELATIONS ───────────────────────────────────────────────────────────

export type UserWithRelations = User & {
  tasksCreated?: Task[]
  reportsSubmitted?: Report[]
  organizationMembers?: OrganizationMemberWithOrg[]
}

export type OrganizationMemberWithOrg = OrganizationMember & {
  organization: Organization
  user?: User
}

export type OrganizationWithMembers = Organization & {
  members: OrganizationMemberWithOrg[]
}

export type TaskWithRelations = Task & {
  createdBy: User
  client?: Client | null
  project?: Project | null
  validatedBy?: User | null
  subtasks?: Task[]
  comments?: Comment[]
  reports?: Report[]
}

export type ReportWithRelations = Report & {
  submittedBy: User
  client?: Client | null
  task?: Task | null
  validatedBy?: User | null
  comments?: Comment[]
}

export type AuditWithRelations = Audit & {
  createdBy: User
  client?: Client | null
}

export type ClientWithRelations = Client & {
  accountManager?: User | null
  tasks?: Task[]
  reports?: Report[]
  audits?: Audit[]
  projects?: Project[]
  finances?: Finance[]
  kpis?: KPI[]
}

export type ProjectWithRelations = Project & {
  client?: Client | null
  manager?: User | null
  tasks?: Task[]
}

export type NotificationWithRelations = Notification & {
  user?: User
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalClients: number
  clientsOnTrack: number
  tasksTotal: number
  tasksCompleted: number
  tasksOverdue: number
  reportsTotal: number
  reportsProcessed: number
  reportsPending: number
  complianceScore: number
  monthlyRevenue: number
  pendingPayments: number
}

export interface TeamMemberStatus {
  user: User
  tasksAssigned: number
  tasksCompleted: number
  tasksOverdue: number
  workloadPercent: number
  status: 'on_track' | 'monitor' | 'overloaded'
  recentActivity?: string
}

// ─── AI ALERTS ────────────────────────────────────────────────────────────────

export interface AIAlert {
  id: string
  type: 'warning' | 'danger' | 'info' | 'success'
  title: string
  description: string
  entityType?: string
  entityId?: string
  entityName?: string
  actionLabel?: string
  actionUrl?: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

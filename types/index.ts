// ─── Tipos base (definidos localmente, antes importados de @prisma/client) ───

export type UserRole = 'admin' | 'user' | 'auditor' | 'viewer'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom'
export type ValidationStatus = 'pending' | 'approved' | 'rejected'
export type AuditStatus = 'pending' | 'in_progress' | 'completed'
export type AuditResult = 'compliant' | 'non_compliant' | 'partial'
export type DocCategory = 'process' | 'policy' | 'template' | 'guide'
export type DocStatus = 'draft' | 'published' | 'archived'
export type ClientStatus = 'active' | 'inactive' | 'prospect' | 'churned'
export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'task' | 'report' | 'system'
export type OrgPlan = 'free' | 'starter' | 'pro' | 'agency' | 'scale'
export type OrgMemberRole = 'owner' | 'admin' | 'member' | 'viewer'
export type OrgMemberStatus = 'active' | 'inactive' | 'invited'
export type ProjectStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type ServiceType = 'social_media' | 'paid_ads' | 'seo' | 'web_dev' | 'design' | 'consulting' | 'other'
export type ObjectiveType = 'quarterly' | 'annual' | 'custom'
export type ObjectiveStatus = 'active' | 'completed' | 'cancelled'

// ─── Interfaces base (representan filas de Supabase) ─────────────────────────

export interface User {
  id: string
  email: string
  name?: string | null
  role?: UserRole
  status?: UserStatus
  avatarUrl?: string | null
  workspace_id?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Organization {
  id: string
  name: string
  slug?: string | null
  plan: OrgPlan
  owner_id: string
  logo_url?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface OrganizationMember {
  id: string
  organization_id?: string
  workspace_id?: string
  user_id: string
  role: OrgMemberRole
  status: OrgMemberStatus
  createdAt?: string
}

export interface Invitation {
  id: string
  workspace_id: string
  email: string
  role: OrgMemberRole
  token: string
  status: string
  createdAt?: string
}

export interface Client {
  id: string
  workspace_id: string
  name: string
  brand?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  status: ClientStatus
  industry?: string | null
  notes?: string | null
  monthlyFee?: number | null
  currency?: string | null
  createdAt?: string
  updatedAt?: string
  deleted_at?: string | null
}

export interface Project {
  id: string
  workspace_id: string
  clientId?: string | null
  name: string
  description?: string | null
  status: ProjectStatus
  color?: string | null
  startDate?: string | null
  endDate?: string | null
  budget?: number | null
  owner_id?: string | null
  createdAt?: string
  updatedAt?: string
  deleted_at?: string | null
}

export interface Task {
  id: string
  workspace_id: string
  projectId?: string | null
  parentTaskId?: string | null
  clientId?: string | null
  title: string
  description?: string | null
  status: TaskStatus
  priority: Priority
  deadline?: string | null
  assignedTo?: string[]
  createdById?: string | null
  createdAt?: string
  updatedAt?: string
  deleted_at?: string | null
}

export interface Report {
  id: string
  workspace_id: string
  title?: string | null
  type?: ReportType
  status?: ValidationStatus
  submittedById?: string | null
  validatedById?: string | null
  clientId?: string | null
  taskId?: string | null
  content?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Audit {
  id: string
  workspace_id: string
  title?: string | null
  status?: AuditStatus
  result?: AuditResult
  createdById?: string | null
  clientId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Documentation {
  id: string
  workspace_id: string
  title: string
  category?: DocCategory
  status?: DocStatus
  content?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message?: string | null
  type?: NotificationType
  isRead?: boolean
  read?: boolean
  link?: string | null
  relatedEntityType?: string | null
  relatedEntityId?: string | null
  createdAt?: string
  created_at?: string
}

export interface Comment {
  id: string
  content: string
  userId?: string | null
  taskId?: string | null
  reportId?: string | null
  createdAt?: string
}

export interface ActivityLog {
  id: string
  workspace_id: string
  userId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  createdAt?: string
}

export interface Finance {
  id: string
  workspace_id: string
  type: string
  amount: number
  description?: string | null
  clientId?: string | null
  category?: string | null
  createdAt?: string
}

export interface KPI {
  id: string
  workspace_id: string
  name: string
  value?: number | null
  target?: number | null
  clientId?: string | null
  category?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Objective {
  id: string
  workspace_id: string
  title: string
  type?: ObjectiveType
  status?: ObjectiveStatus
  progress?: number | null
  createdAt?: string
  updatedAt?: string
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

export interface Workspace {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  currency: string
  timezone: string
  agency_type: string
  plan: string
  owner_id: string
  stripe_customer_id: string | null
  plan_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: string
  email: string | null
  name: string | null
  avatar_url: string | null
  status: string
  created_at: string
}

export interface Client {
  id: string
  workspace_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  website: string | null
  logo_url: string | null
  status: string
  industry: string | null
  notes: string | null
  monthly_value: number
  currency: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  workspace_id: string
  client_id: string | null
  name: string
  description: string | null
  status: string
  priority: string
  color: string
  start_date: string | null
  due_date: string | null
  budget: number | null
  budget_spent: number
  owner_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  workspace_id: string
  project_id: string | null
  parent_task_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  assignee_id: string | null
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number | null
  tags: string[]
  position: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  workspace_id: string
  client_id: string | null
  title: string
  type: string
  content: Record<string, unknown>
  status: string
  period_start: string | null
  period_end: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Minute {
  id: string
  workspace_id: string
  client_id: string | null
  project_id: string | null
  title: string
  meeting_date: string | null
  participants: string[]
  meeting_type: string
  agenda: Array<{ text: string }>
  discussion_points: string | null
  decisions: Array<{ text: string }>
  action_items: Array<{
    description: string
    responsible: string
    due_date: string | null
    created_as_task: boolean
  }>
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  workspace_id: string
  client_id: string | null
  project_id: string | null
  type: string
  amount: number
  currency: string
  category: string | null
  description: string | null
  date: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      workspaces: { Row: Workspace; Insert: Partial<Workspace>; Update: Partial<Workspace> }
      workspace_members: { Row: WorkspaceMember; Insert: Partial<WorkspaceMember>; Update: Partial<WorkspaceMember> }
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> }
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> }
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> }
      reports: { Row: Report; Insert: Partial<Report>; Update: Partial<Report> }
      minutes: { Row: Minute; Insert: Partial<Minute>; Update: Partial<Minute> }
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> }
    }
  }
}

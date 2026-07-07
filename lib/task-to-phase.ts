export interface Phase {
  id: string
  title: string
  description: string | null
  deadline: string | null
  responsible_id: string | null
  status: 'pending' | 'in_progress' | 'completed'
  order: number
  created_at: string
  updated_at: string
}

export function taskToPhase(task: {
  id: string
  title: string
  description?: string | null
  deadline?: string | null
  assignedTo?: string | null
  assignee_id?: string | null
  status?: string
  position?: number
  createdAt?: string
  updatedAt?: string
}): Phase {
  return {
    id: task.id,
    title: task.title,
    description: task.description || null,
    deadline: task.deadline || null,
    responsible_id: task.assignedTo || task.assignee_id || null,
    status: task.status === 'completed' ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'pending',
    order: task.position || 0,
    created_at: task.createdAt || '',
    updated_at: task.updatedAt || '',
  }
}

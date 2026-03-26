'use client'

import { AgentWidget } from './AgentWidget'

/**
 * Pre-configured AgentWidget instances for each module.
 * Add the appropriate component to each page:
 *
 *   Dashboard page  → <DashboardAgent />
 *   Clients page    → <ClientsAgent />
 *   Tasks page      → <TasksAgent />
 *   Projects page   → <ProjectsAgent />
 *   Reports page    → <ReportsAgent />
 *
 * Example usage in a page:
 *
 *   import { DashboardAgent } from '@/components/ai/AgentWidgetPresets'
 *
 *   export default function DashboardPage() {
 *     return (
 *       <div>
 *         { ... existing page content ... }
 *         <DashboardAgent />
 *       </div>
 *     )
 *   }
 */

export function DashboardAgent() {
  return (
    <AgentWidget
      moduleName="dashboard"
      suggestions={[
        'Resumen del dia',
        'Que tareas son urgentes?',
        'Estado del equipo',
      ]}
    />
  )
}

export function ClientsAgent() {
  return (
    <AgentWidget
      moduleName="clients"
      suggestions={[
        'Analizar cartera de clientes',
        'Sugerir estrategia de retencion',
        'Resumen de clientes activos',
      ]}
    />
  )
}

export function TasksAgent() {
  return (
    <AgentWidget
      moduleName="tasks"
      suggestions={[
        'Priorizar mis tareas',
        'Que esta bloqueado?',
        'Sugerir distribucion de trabajo',
      ]}
    />
  )
}

export function ProjectsAgent() {
  return (
    <AgentWidget
      moduleName="projects"
      suggestions={[
        'Estado general de proyectos',
        'Algun proyecto en riesgo?',
        'Sugerir timeline',
      ]}
    />
  )
}

export function ReportsAgent() {
  return (
    <AgentWidget
      moduleName="reports"
      suggestions={[
        'Generar resumen ejecutivo',
        'Analizar tendencias',
        'Sugerir mejoras',
      ]}
    />
  )
}

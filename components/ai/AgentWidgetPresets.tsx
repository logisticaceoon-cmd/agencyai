'use client'

import { AgentWidget } from './AgentWidget'

export function DashboardAgent() {
  return (
    <AgentWidget config={{
      name: 'Ceonyx',
      description: 'Te ayudo a priorizar tu dia y detectar problemas urgentes',
      module: 'dashboard',
      suggestions: ['Que es lo mas urgente hoy?', 'Que clientes necesitan atencion?', 'Resumime el estado general de la agencia'],
    }} />
  )
}

export function ClientsAgent() {
  return (
    <AgentWidget config={{
      name: 'Ceonyx',
      description: 'Te ayudo a gestionar relaciones y mejorar retencion',
      module: 'clients',
      suggestions: ['Como mejoro la retencion de clientes?', 'Que informacion debo registrar de cada cliente?', 'Como calculo bien el valor de un cliente?'],
    }} />
  )
}

export function TasksAgent() {
  return (
    <AgentWidget config={{
      name: 'Ceonyx',
      description: 'Te ayudo a priorizar y organizar el trabajo del equipo',
      module: 'tasks',
      suggestions: ['Como priorizo las tareas de hoy?', 'Como delego mejor en mi equipo?', 'Que tareas deberia eliminar o posponer?'],
    }} />
  )
}

export function ProjectsAgent() {
  return (
    <AgentWidget config={{
      name: 'Ceonyx',
      description: 'Te ayudo a detectar riesgos y sugerir acciones',
      module: 'projects',
      suggestions: ['Como estructuro bien los microobjetivos?', 'Que hago si un proyecto se atrasa?', 'Como mejoro la comunicacion con el cliente sobre el proyecto?'],
    }} />
  )
}

export function ReportsAgent() {
  return (
    <AgentWidget config={{
      name: 'Ceonyx',
      description: 'Te ayudo a crear reportes profesionales que impresionen',
      module: 'reports',
      suggestions: ['Que deberia incluir en un reporte mensual?', 'Como muestro resultados cuando no fueron los esperados?', 'Ayudame a escribir un resumen ejecutivo'],
    }} />
  )
}

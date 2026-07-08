'use client'

import { useEffect, useState, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { HelpCircle } from 'lucide-react'

interface ProductTourProps {
  tourCompleted?: boolean
}

export function ProductTour({ tourCompleted }: ProductTourProps) {
  const [hasRun, setHasRun] = useState(false)

  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'agencyai-tour-popover',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      progressText: '{{current}} de {{total}}',
      steps: [
        {
          element: '[data-tour="dashboard"]',
          popover: {
            title: 'Panel Principal',
            description: 'Este es tu panel principal. Aqui ves metricas clave de tu agencia: clientes activos, proyectos, tareas y actividad reciente.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="clients"]',
          popover: {
            title: 'Clientes',
            description: 'Gestiona todos tus clientes desde aqui. Agrega nuevos clientes, ve su historial y gestiona sus proyectos.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="projects"]',
          popover: {
            title: 'Proyectos',
            description: 'Organiza proyectos con fases, milestones y seguimiento de progreso. Cada proyecto se asocia a un cliente.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="tasks"]',
          popover: {
            title: 'Tareas',
            description: 'Tablero Kanban con drag-and-drop para tus tareas. Asigna prioridades, fechas limite y miembros del equipo.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="time"]',
          popover: {
            title: 'Registro de Tiempo',
            description: 'Registra el tiempo de tu equipo en cada proyecto. Genera reportes de horas y calcula la rentabilidad.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="invoices"]',
          popover: {
            title: 'Facturas',
            description: 'Crea facturas profesionales con items, impuestos y exporta a PDF. Lleva el control de pagos pendientes.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="reports"]',
          popover: {
            title: 'Reportes',
            description: 'Genera reportes automaticos para tus clientes. Comparte avances y metricas de forma profesional.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="settings"]',
          popover: {
            title: 'Configuracion',
            description: 'Configura tu equipo, roles, facturacion e integraciones. Personaliza AgencyAI para tu agencia.',
            side: 'right',
            align: 'start',
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy()
        // Marcar tour como completado
        fetch('/api/workspace/tour-completed', { method: 'POST' }).catch(() => {})
      },
    })

    driverObj.drive()
  }, [])

  // Auto-trigger on first login
  useEffect(() => {
    if (tourCompleted === false && !hasRun) {
      // Delay to let the page render fully
      const timer = setTimeout(() => {
        setHasRun(true)
        startTour()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [tourCompleted, hasRun, startTour])

  return (
    <button
      onClick={startTour}
      className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--blue)] text-white shadow-lg hover:bg-[#1d4ed8] transition-colors"
      title="Iniciar tour guiado"
      aria-label="Ayuda - Tour guiado"
    >
      <HelpCircle size={20} strokeWidth={1.5} />
    </button>
  )
}

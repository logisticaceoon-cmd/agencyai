'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  MessageSquare, FileSpreadsheet, LayoutGrid, Clock,
  AlertTriangle, XCircle
} from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations'

const painPoints = [
  {
    icon: LayoutGrid,
    tool: 'Clientes en 10 apps',
    headline: 'Tus clientes están esparcidos en 10 herramientas diferentes',
    description: 'WhatsApp para comunicación, Drive para archivos, Trello para tareas, Excel para pagos... Cada cliente es un caos de tabs abiertos.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    icon: FileSpreadsheet,
    tool: 'Finanzas invisibles',
    headline: 'No sabes cuánto dinero REALMENTE ganas por cliente',
    description: 'Fees, comisiones, gastos operativos... Sin un sistema real, estás volando a ciegas. ¿Ese cliente es rentable o te está costando dinero?',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: MessageSquare,
    tool: 'Equipo en caos',
    headline: 'Tu equipo no sabe qué hacer primero',
    description: 'Las tareas se pierden en chats de WhatsApp. No hay prioridades claras. Nadie sabe quién hace qué. El resultado: deadlines rotos y clientes molestos.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  {
    icon: Clock,
    tool: '5 horas perdidas',
    headline: 'Pierdes 5 horas al día en tareas manuales',
    description: 'Reportes manuales, copiar datos entre apps, buscar archivos, actualizar estados... Tiempo que podrías usar para crecer tu agencia.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
]

export default function PainPointsSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="problemas" className="py-24 px-4 relative">
      {/* Background accent */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl" ref={ref}>
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-sm text-red-400 mb-6">
            <AlertTriangle className="h-4 w-4" />
            El problema que nadie quiere admitir
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            Tu agencia está{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              sangrando dinero
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Y no es por falta de clientes. Es por cómo los gestionas.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {painPoints.map((pain) => (
            <motion.div
              key={pain.tool}
              variants={staggerItem}
              whileHover={{ scale: 1.02, y: -4 }}
              className={`relative rounded-2xl border ${pain.border} bg-zinc-900/50 p-6 sm:p-8 backdrop-blur-sm group cursor-default`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 h-12 w-12 rounded-xl ${pain.bg} flex items-center justify-center`}>
                  <pain.icon className={`h-6 w-6 ${pain.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-500/60" />
                    <span className="text-xs font-semibold text-red-400/80 uppercase tracking-wider">{pain.tool}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 leading-tight">{pain.headline}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{pain.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Transition */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4">
            <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-zinc-700" />
            <p className="text-lg font-semibold text-zinc-400">
              ¿La buena noticia? <span className="text-white">Tiene solución.</span>
            </p>
            <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-zinc-700" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

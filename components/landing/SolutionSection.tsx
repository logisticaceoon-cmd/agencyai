'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  BarChart2, Users, CheckSquare, FileText,
  ArrowRight, Sparkles
} from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem, fadeInLeft, fadeInRight } from '@/lib/animations'

const modules = [
  {
    icon: BarChart2,
    title: 'Dashboard Ejecutivo',
    description: 'Ve exactamente cuánto dinero entra, cuánto sale y cuánto ganas. En tiempo real. Sin abrir Excel nunca más.',
    color: 'from-indigo-500 to-blue-500',
    features: ['Ingresos vs gastos', 'Rentabilidad por cliente', 'Proyecciones mensuales'],
  },
  {
    icon: Users,
    title: 'CRM de Clientes',
    description: 'Toda la info de cada cliente en un solo lugar: contacto, fee, comisiones, accesos, estado de pago y portal privado.',
    color: 'from-purple-500 to-pink-500',
    features: ['Ficha completa', 'Historial de pagos', 'Portal cliente'],
  },
  {
    icon: CheckSquare,
    title: 'Tareas & Proyectos',
    description: 'Asigna, prioriza y da seguimiento. Tu equipo sabe exactamente qué hacer, para quién y para cuándo.',
    color: 'from-green-500 to-emerald-500',
    features: ['Kanban y lista', 'Asignación por miembro', 'Deadlines automáticos'],
  },
  {
    icon: FileText,
    title: 'Reportes Automáticos',
    description: 'Genera reportes mensuales con métricas reales. Inversión, ROAS, CPA, ventas. Impresiona a tus clientes sin esfuerzo.',
    color: 'from-orange-500 to-red-500',
    features: ['Templates profesionales', 'Métricas integradas', 'Exporta PDF'],
  },
]

export default function SolutionSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="solucion" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl" ref={ref}>
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-1.5 text-sm text-green-400 mb-6">
            <Sparkles className="h-4 w-4" />
            La solución
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            Un panel único para{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              TODA tu agencia
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            4 módulos diseñados específicamente para agencias de marketing digital. No adaptaciones — herramientas hechas para ti.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {modules.map((mod, i) => (
            <motion.div
              key={mod.title}
              variants={i % 2 === 0 ? fadeInLeft : fadeInRight}
              whileHover={{ scale: 1.03, y: -6 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 backdrop-blur-sm group overflow-hidden"
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mod.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="flex items-start gap-4 mb-4">
                <div className={`flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-lg`}>
                  <mod.icon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{mod.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{mod.description}</p>
                </div>
              </div>

              <div className="ml-[72px] flex flex-wrap gap-2">
                {mod.features.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/80 px-3 py-1.5 rounded-full"
                  >
                    <ArrowRight className="h-3 w-3 text-indigo-400" />
                    {f}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

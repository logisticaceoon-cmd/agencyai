'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useRef } from 'react'
import {
  BarChart2, Users, CheckSquare, FileText,
  ArrowRight, Sparkles
} from 'lucide-react'
import { fadeInUp, staggerContainer, fadeInLeft, fadeInRight } from '@/lib/animations'

const modules = [
  {
    icon: BarChart2,
    title: 'Dashboard Ejecutivo',
    description: 'Ve exactamente cuánto dinero entra, cuánto sale y cuánto ganas. En tiempo real. Sin abrir Excel nunca más.',
    color: 'from-indigo-500 to-blue-500',
    glowColor: 'rgba(99, 102, 241, 0.2)',
    features: ['Ingresos vs gastos', 'Rentabilidad por cliente', 'Proyecciones mensuales'],
  },
  {
    icon: Users,
    title: 'CRM de Clientes',
    description: 'Toda la info de cada cliente en un solo lugar: contacto, fee, comisiones, accesos, estado de pago y portal privado.',
    color: 'from-purple-500 to-pink-500',
    glowColor: 'rgba(168, 85, 247, 0.2)',
    features: ['Ficha completa', 'Historial de pagos', 'Portal cliente'],
  },
  {
    icon: CheckSquare,
    title: 'Tareas & Proyectos',
    description: 'Asigna, prioriza y da seguimiento. Tu equipo sabe exactamente qué hacer, para quién y para cuándo.',
    color: 'from-green-500 to-emerald-500',
    glowColor: 'rgba(34, 197, 94, 0.2)',
    features: ['Kanban y lista', 'Asignación por miembro', 'Deadlines automáticos'],
  },
  {
    icon: FileText,
    title: 'Reportes Automáticos',
    description: 'Genera reportes mensuales con métricas reales. Inversión, ROAS, CPA, ventas. Impresiona a tus clientes sin esfuerzo.',
    color: 'from-orange-500 to-red-500',
    glowColor: 'rgba(249, 115, 22, 0.2)',
    features: ['Templates profesionales', 'Métricas integradas', 'Exporta PDF'],
  },
]

export default function SolutionSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const titleScale = useTransform(scrollYProgress, [0, 0.3], [0.9, 1])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 1])

  return (
    <section ref={sectionRef} id="solucion" className="py-24 px-4 relative overflow-hidden">
      {/* Nebula background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 50%, transparent 70%)' }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' as const }}
        />
      </div>

      <div className="mx-auto max-w-6xl" ref={ref}>
        <motion.div
          style={{ scale: titleScale, opacity: titleOpacity }}
          className="text-center mb-16 will-change-transform"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-1.5 text-sm text-green-400 mb-6 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <Sparkles className="h-4 w-4" />
            La solución
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            Un panel único para{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]">
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
              className="landing-card-glow relative rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 backdrop-blur-sm group overflow-hidden"
              style={{ '--glow-color': mod.glowColor } as React.CSSProperties}
            >
              {/* Animated gradient accent on hover */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mod.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_15px_var(--glow-color)]`} />

              <div className="flex items-start gap-4 mb-4">
                <motion.div
                  className={`flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-lg`}
                  whileHover={{ rotate: -5, scale: 1.1 }}
                  style={{ boxShadow: `0 8px 25px ${mod.glowColor}` }}
                >
                  <mod.icon className="h-7 w-7 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{mod.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{mod.description}</p>
                </div>
              </div>

              <div className="ml-[72px] flex flex-wrap gap-2">
                {mod.features.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/80 px-3 py-1.5 rounded-full border border-zinc-700/50 hover:border-zinc-600 transition-colors"
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

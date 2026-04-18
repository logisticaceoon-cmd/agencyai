'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Check, X, Swords } from 'lucide-react'
import { fadeInUp, fadeInLeft, fadeInRight } from '@/lib/animations'

const comparison = [
  { feature: 'CRM con fees y comisiones', us: true, them: false },
  { feature: 'Reportes de ROAS / CPA', us: true, them: false },
  { feature: 'Finanzas de agencia', us: true, them: false },
  { feature: 'Portal para clientes', us: true, them: false },
  { feature: 'KPIs y OKRs integrados', us: true, them: false },
  { feature: 'Minutas de reunión', us: true, them: false },
  { feature: 'Alertas IA', us: true, them: false },
  { feature: 'Setup en 2 minutos', us: true, them: false },
  { feature: 'Gestión de tareas', us: true, them: true },
  { feature: 'Proyectos y kanban', us: true, them: true },
]

export default function ComparisonSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section className="py-24 px-4 relative">
      <div className="absolute inset-0 -z-10 bg-zinc-900/30" />

      <div className="mx-auto max-w-4xl" ref={ref}>
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 text-sm text-orange-400 mb-6">
            <Swords className="h-4 w-4" />
            La comparativa honesta
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            ¿Por qué no ClickUp,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
              Monday o Notion?
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            Porque fueron diseñados para cualquier industria. AgencyAI fue diseñado solo para la tuya.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Them */}
          <motion.div
            variants={fadeInLeft}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm"
          >
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6">
              ClickUp / Monday / Notion
            </h3>
            <ul className="space-y-3">
              {comparison.map((item) => (
                <li key={item.feature} className="flex items-center gap-3">
                  {item.them ? (
                    <Check className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-red-500/60 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${item.them ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {item.feature}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Us */}
          <motion.div
            variants={fadeInRight}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-600/10 to-purple-600/5 p-6 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-6">
              AgencyAI
            </h3>
            <ul className="space-y-3">
              {comparison.map((item) => (
                <li key={item.feature} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">{item.feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

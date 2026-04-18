'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useRef } from 'react'
import {
  Shield, Globe, BarChart2, FileText, Users, Zap,
  Brain, Calendar, DollarSign, Target, Lock, Plug
} from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations'

const features = [
  { icon: Shield, title: 'Multi-tenant', description: 'Cada agencia tiene su workspace aislado. Tus datos son solo tuyos.', color: 'text-blue-400', bg: 'bg-blue-500/10', glow: 'rgba(59,130,246,0.15)' },
  { icon: Plug, title: 'API Cowork', description: 'Conecta herramientas externas via REST API con autenticación por API key.', color: 'text-green-400', bg: 'bg-green-500/10', glow: 'rgba(34,197,94,0.15)' },
  { icon: FileText, title: 'Reportes automáticos', description: 'Genera reportes mensuales profesionales con métricas reales en minutos.', color: 'text-indigo-400', bg: 'bg-indigo-500/10', glow: 'rgba(99,102,241,0.15)' },
  { icon: Globe, title: 'Portal cliente', description: 'Cada cliente accede a su portal privado con métricas y documentos.', color: 'text-teal-400', bg: 'bg-teal-500/10', glow: 'rgba(20,184,166,0.15)' },
  { icon: DollarSign, title: 'Stripe integrado', description: 'Cobros automáticos, facturas y gestión de suscripciones incluido.', color: 'text-yellow-400', bg: 'bg-yellow-500/10', glow: 'rgba(234,179,8,0.15)' },
  { icon: Lock, title: 'Seguridad total', description: 'Auth Supabase, auditorías, aislamiento de datos y roles por miembro.', color: 'text-red-400', bg: 'bg-red-500/10', glow: 'rgba(239,68,68,0.15)' },
  { icon: Brain, title: 'Alertas IA', description: 'Detección automática de clientes con ROAS bajo y tareas atrasadas.', color: 'text-purple-400', bg: 'bg-purple-500/10', glow: 'rgba(168,85,247,0.15)' },
  { icon: Calendar, title: 'Minutas de reunión', description: 'Registra decisiones y acuerdos. Las tareas se crean automáticamente.', color: 'text-pink-400', bg: 'bg-pink-500/10', glow: 'rgba(236,72,153,0.15)' },
  { icon: BarChart2, title: 'KPIs y OKRs', description: 'Define objetivos, mide progreso y toma decisiones basadas en datos.', color: 'text-orange-400', bg: 'bg-orange-500/10', glow: 'rgba(249,115,22,0.15)' },
  { icon: Users, title: 'Gestión de equipo', description: 'Invita miembros, asigna roles y controla permisos por workspace.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', glow: 'rgba(6,182,212,0.15)' },
  { icon: Target, title: 'Objetivos trimestrales', description: 'Define OKRs con key results y mide el avance automáticamente.', color: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'rgba(52,211,153,0.15)' },
  { icon: Zap, title: 'Setup en 2 minutos', description: 'Crea tu cuenta, configura tu agencia y empieza a trabajar al instante.', color: 'text-amber-400', bg: 'bg-amber-500/10', glow: 'rgba(245,158,11,0.15)' },
]

export default function FeaturesSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const titleScale = useTransform(scrollYProgress, [0, 0.25], [0.92, 1])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 1])

  return (
    <section ref={sectionRef} id="features" className="py-24 px-4 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl" ref={ref}>
        <motion.div
          style={{ scale: titleScale, opacity: titleOpacity }}
          className="text-center mb-16 will-change-transform"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 text-sm text-indigo-400 mb-6 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <Zap className="h-4 w-4" />
            Todo incluido
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            12 funcionalidades{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              de nivel enterprise
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Todo lo que necesitas para escalar tu agencia sin complicaciones.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={staggerItem}
              whileHover={{ y: -6, scale: 1.03 }}
              className="landing-card-glow rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 group hover:border-zinc-600 transition-all backdrop-blur-sm cursor-default"
              style={{ '--glow-color': f.glow } as React.CSSProperties}
            >
              <motion.div
                className={`inline-flex items-center justify-center h-10 w-10 rounded-lg ${f.bg} mb-4`}
                whileHover={{ rotate: 15, scale: 1.15 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <f.icon className={`h-5 w-5 ${f.color} drop-shadow-[0_0_6px_var(--glow-color)]`} style={{ '--glow-color': f.glow } as React.CSSProperties} />
              </motion.div>
              <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
